const LEN_PREFIX = 4;
const DIGEST_BYTES = 32;
const MAX_JSON_BYTES = 64 * 1024 * 1024;

export class BackupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BackupError';
    this.code = code;
  }
}

export function buffersEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

export async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function packBackup(jsonText) {
  const json = new TextEncoder().encode(jsonText);
  const deflated = await deflateRaw(json);
  const head = new Uint8Array(LEN_PREFIX + deflated.length);
  new DataView(head.buffer).setUint32(0, json.length, true);
  head.set(deflated, LEN_PREFIX);
  const digest = await sha256(head);
  const out = new Uint8Array(head.length + DIGEST_BYTES);
  out.set(head, 0);
  out.set(digest, head.length);
  return out;
}

export async function decodeBackup(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new BackupError('NOT_BYTES', '输入不是字节数组');
  }
  if (bytes.length <= LEN_PREFIX) {
    throw new BackupError('TOO_SHORT', '文件太短,不是有效的米家场景备份');
  }
  const declared = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  if (!Number.isSafeInteger(declared) || declared <= 0 || declared > MAX_JSON_BYTES) {
    throw new BackupError('BAD_LENGTH', `长度头非法:${declared}`);
  }
  let body = bytes.subarray(LEN_PREFIX);
  let verified = false;
  if (body.length >= DIGEST_BYTES) {
    const tail = body.subarray(body.length - DIGEST_BYTES);
    const expected = await sha256(bytes.subarray(0, bytes.length - DIGEST_BYTES));
    if (buffersEqual(tail, expected)) {
      body = body.subarray(0, body.length - DIGEST_BYTES);
      verified = true;
    }
  }
  let inflated;
  try {
    inflated = await inflateRaw(body);
  } catch {
    if (verified) {
      throw new BackupError('DEFLATE_FAIL', '解压失败:数据不是 raw DEFLATE 流');
    }
    // 摘要未通过:可能是尾部 32 字节为损坏/缺失摘要,剥离后重试以兼容无摘要文件
    const fallback = body.subarray(0, body.length - DIGEST_BYTES);
    if (fallback.length === 0) {
      throw new BackupError('DEFLATE_FAIL', '解压失败:数据不是 raw DEFLATE 流');
    }
    try {
      inflated = await inflateRaw(fallback);
    } catch {
      throw new BackupError('DEFLATE_FAIL', '解压失败:数据不是 raw DEFLATE 流');
    }
  }
  if (inflated.length !== declared) {
    throw new BackupError('LENGTH_MISMATCH', `解压长度 ${inflated.length} 与长度头声明的 ${declared} 不符`);
  }
  let jsonText;
  try {
    jsonText = new TextDecoder('utf-8', { fatal: true }).decode(inflated);
  } catch {
    throw new BackupError('JSON_FAIL', '内容不是 UTF-8 文本');
  }
  let value;
  try {
    value = JSON.parse(jsonText);
  } catch {
    throw new BackupError('JSON_FAIL', 'JSON 解析失败');
  }
  return { declaredLen: declared, verified, jsonText, value };
}
