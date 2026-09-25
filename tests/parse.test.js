import {
  BackupError, decodeBackup, packBackup, buffersEqual, inflateRaw, deflateRaw,
} from '../src/parse.js';

const enc = new TextEncoder();

export const tests = [
  {
    name: '往返:packBackup 后 decodeBackup 还原且 verified=true',
    async fn() {
      const text = '{"version":2,"rules":[],"variables":{}}';
      const packed = await packBackup(text);
      const out = await decodeBackup(packed);
      if (out.jsonText !== text) throw new Error(`jsonText 不符: ${out.jsonText}`);
      if (!out.verified) throw new Error('verified 应为 true');
      if (out.value.version !== 2) throw new Error('value 解析错误');
    },
  },
  {
    name: '长度头小端写入:首 4 字节等于声明长度',
    async fn() {
      const text = '{"version":2,"rules":[],"variables":{}}';
      const packed = await packBackup(text);
      const declared = new DataView(packed.buffer, packed.byteOffset, packed.byteLength).getUint32(0, true);
      if (declared !== enc.encode(text).length) throw new Error(`声明长度 ${declared} 与文本长度不符`);
    },
  },
  {
    name: '尾部 32 字节为 SHA-256 摘要',
    async fn() {
      const packed = await packBackup('{}');
      const head = packed.subarray(0, packed.length - 32);
      const tail = packed.subarray(packed.length - 32);
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', head));
      if (!buffersEqual(tail, digest)) throw new Error('摘要不匹配');
    },
  },
  {
    name: '摘要被篡改时 verified=false 但仍可解出(兼容无摘要文件)',
    async fn() {
      const packed = await packBackup('{"version":2,"rules":[],"variables":{}}');
      packed[packed.length - 1] ^= 0xff;
      const out = await decodeBackup(packed);
      if (out.verified) throw new Error('verified 应为 false');
      if (out.value.version !== 2) throw new Error('内容应仍可解析');
    },
  },
  {
    name: '超短输入抛 TOO_SHORT',
    async fn() {
      try {
        await decodeBackup(new Uint8Array([0x05, 0x25, 0x00, 0x00]));
        throw new Error('应抛出');
      } catch (e) {
        if (!(e instanceof BackupError) || e.code !== 'TOO_SHORT') throw e;
      }
    },
  },
  {
    name: '长度头非法抛 BAD_LENGTH',
    async fn() {
      const buf = new Uint8Array(64);
      new DataView(buf.buffer).setUint32(0, 0x7fffffff, true);
      try {
        await decodeBackup(buf);
        throw new Error('应抛出');
      } catch (e) {
        if (!(e instanceof BackupError) || e.code !== 'BAD_LENGTH') throw e;
      }
    },
  },
  {
    name: '声明长度与实际不符抛 LENGTH_MISMATCH',
    async fn() {
      const packed = await packBackup('{"version":2}');
      new DataView(packed.buffer, packed.byteOffset, packed.byteLength).setUint32(0, 999999, true);
      try {
        await decodeBackup(packed);
        throw new Error('应抛出');
      } catch (e) {
        if (!(e instanceof BackupError) || e.code !== 'LENGTH_MISMATCH') throw e;
      }
    },
  },
  {
    name: '非 deflate 数据抛 DEFLATE_FAIL',
    async fn() {
      const buf = new Uint8Array(64);
      new DataView(buf.buffer).setUint32(0, 10, true);
      buf.fill(0x41, 4);
      try {
        await decodeBackup(buf);
        throw new Error('应抛出');
      } catch (e) {
        if (!(e instanceof BackupError) || e.code !== 'DEFLATE_FAIL') throw e;
      }
    },
  },
  {
    name: 'deflateRaw/inflateRaw 基础往返',
    async fn() {
      const src = enc.encode('米家场景测试 payload');
      const round = await inflateRaw(await deflateRaw(src));
      if (!buffersEqual(src, round)) throw new Error('字节不一致');
    },
  },
];
