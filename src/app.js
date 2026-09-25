import { decodeBackup, packBackup } from './parse.js';
import { normalizePayload } from './model.js';
import { deviceLabel, modelOf } from './devices.js';
import { layoutGraph } from './layout.js';
import { renderRuleSvg } from './render.js';
import { describeRule } from './summary.js';
import { sanitizeFile, sanitizePayload } from './sanitize.js';
import { newSceneTemplate, payloadToText, textToPayload } from './editor.js';
import { diagnoseRule } from './simulate/diagnose.js';
import { buildNodeSkeleton, NODE_TYPE_LIST, NODE_LABELS } from './catalog.js';
import { generateScene } from './ai.js';

const $ = (id) => document.getElementById(id);

const errorBox = $('error');
const showError = (text) => { errorBox.style.display = 'block'; errorBox.textContent = text; };
const hideError = () => { errorBox.style.display = 'none'; };

const ERROR_TEXT = {
  NOT_BYTES: '内部错误:输入不是字节数组',
  TOO_SHORT: '文件太短,不是有效的米家场景备份(.bak)',
  BAD_LENGTH: '长度头非法:可能不是米家场景备份,或文件已损坏',
  DEFLATE_FAIL: '解压失败:数据不是 raw DEFLATE 流,可能不是 .bak 文件',
  LENGTH_MISMATCH: '解压长度与文件头声明不符,文件可能已损坏',
  JSON_FAIL: '内容不是合法 JSON(或不是 UTF-8 编码)',
};

let currentBytes = null;
let currentRaw = null;
let currentPayload = null;

const escapeHtml = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function download(bytes, name) {
  const url = URL.createObjectURL(new Blob([bytes]));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleFile(file) {
  hideError();
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const decoded = await decodeBackup(bytes);
    currentBytes = bytes;
    applyValue(decoded.value, { verified: decoded.verified });
    $('file-name').textContent = `已加载:${file.name}`;
    $('drop').classList.add('loaded');
    if (!decoded.verified) {
      showError('提示:文件尾部 SHA-256 校验不匹配,已按无校验模式解析(内容仍可读)');
    }
  } catch (e) {
    currentBytes = null;
    currentRaw = null;
    currentPayload = null;
    $('tabs').hidden = true;
    $('file-name').textContent = '';
    $('drop').classList.remove('loaded');
    showError(ERROR_TEXT[e.code] ?? `解析失败:${e.message}`);
  }
}

function applyValue(value, opts = {}) {
  const payload = normalizePayload(value);
  currentRaw = value;
  currentPayload = payload;
  renderAll(payload, opts);
  bindEditor();
  $('edit-json').value = payloadToText(value);
  renderDiag(payload);
}

function renderAll(payload, opts = {}) {
  $('tabs').hidden = false;

  const overview = $('overview');
  const warnings = payload.warnings.map((w) => `<p class="warn">⚠ ${w}</p>`).join('');
  overview.innerHTML = `
    <p>场景数:<strong>${payload.rules.length}</strong> · 校验:${opts.verified === false ? '未通过(按无校验模式解析)' : '通过'}</p>
    ${warnings}
    <ul>${payload.rules.map((r) => `<li>${escapeHtml(r.cfg?.userData?.name ?? r.id ?? '未命名')}(${r.cfg?.enable ? '启用' : '停用'},${r.nodes?.length ?? 0} 个节点)</li>`).join('')}</ul>`;

  const deviceSet = new Map();
  for (const r of payload.rules) {
    for (const n of r.nodes ?? []) {
      const urn = n.cfg?.urn;
      const did = n.props?.did;
      if (urn && did) deviceSet.set(did, { urn, label: deviceLabel(urn), model: modelOf(urn) });
    }
  }
  $('devices').innerHTML = `
    <table><tr><th>设备</th><th>型号</th><th>DID</th></tr>
    ${[...deviceSet.entries()].map(([did, d]) => `<tr><td>${escapeHtml(d.label)}</td><td>${escapeHtml(d.model ?? '-')}</td><td>${escapeHtml(did)}</td></tr>`).join('')}
    </table>`;

  const graphs = payload.rules.map((r) => `<h3>${escapeHtml(r.cfg?.userData?.name ?? r.id ?? '未命名')}</h3>` + renderRuleSvg(r, layoutGraph(r)));
  $('graph').innerHTML = graphs.join('');

  $('summary').innerHTML = `<pre>${escapeHtml(payload.rules.map(describeRule).join('\n\n'))}</pre>`;

  $('sanitize').innerHTML = `<p>确定性替换 DID、经纬度、时间戳后重新打包为 .bak(基于当前内容,无需原始文件)。</p>
    <button id="do-sanitize">生成脱敏 .bak</button><p id="sanitize-report" style="font-size:12px;color:#666"></p>`;
  $('do-sanitize').addEventListener('click', async () => {
    try {
      let bytes;
      let map;
      if (currentBytes) {
        ({ bytes, map } = await sanitizeFile(currentBytes));
      } else {
        const raw = textToPayload($('edit-json').value);
        const { value: clean, map: m } = sanitizePayload(raw);
        bytes = await packBackup(JSON.stringify(clean));
        map = m;
      }
      download(bytes, 'scene-sanitized.bak');
      $('sanitize-report').textContent = `已替换 ${Object.keys(map).length} 个设备标识:\n${Object.entries(map).map(([k, v]) => `${k} → ${v}`).join('\n')}`;
    } catch (e) {
      showError(`脱敏失败: ${e.message}`);
    }
  });

  import('./simulate/ui.js').then(({ setupSimUI }) => setupSimUI(payload));
}

function renderDiag(payload) {
  const all = payload.rules.flatMap((r) => diagnoseRule(r));
  const box = $('edit-diag');
  if (!box) return;
  box.innerHTML = all.length === 0
    ? '<p>未发现结构问题</p>'
    : all.map((d) => `<p class="warn">${d.level === 'error' ? '⛔' : '⚠'} ${d.text}</p>`).join('');
}

function bindEditor() {
  $('edit').innerHTML = `<div class="edit-grid">
    <textarea id="edit-json" spellcheck="false" placeholder='粘贴或新建场景 JSON(version 2 或 legacy 数组)'></textarea>
    <div class="edit-side">
      <button id="btn-apply">应用更改</button>
      <button id="btn-format">格式化</button>
      <button id="btn-export">导出 .bak</button>
      <button id="btn-new">新建模板</button>
      <p style="font-size:12px;color:#666">编辑 JSON 后点「应用更改」刷新预览与模拟;「导出 .bak」可直接通过极客版备份恢复导入网关。</p>
      <h4>插入节点骨架(六段结构)</h4>
      <select id="ins-type">${NODE_TYPE_LIST.map((t) => `<option value="${t}">${NODE_LABELS[t]}</option>`).join('')}</select>
      <button id="btn-insert">插入到第一个场景</button>
      <h4>静态诊断</h4>
      <div id="edit-diag"></div>
    </div>
  </div>`;
  $('btn-apply').addEventListener('click', () => {
    try {
      const raw = textToPayload($('edit-json').value);
      applyValue(raw);
      hideError();
    } catch (e) {
      showError(`编辑内容解析失败: ${e.message}`);
    }
  });
  $('btn-format').addEventListener('click', () => {
    try {
      $('edit-json').value = payloadToText(textToPayload($('edit-json').value));
      hideError();
    } catch (e) {
      showError(`格式化失败: ${e.message}`);
    }
  });
  $('btn-export').addEventListener('click', async () => {
    try {
      const raw = textToPayload($('edit-json').value);
      const bytes = await packBackup(JSON.stringify(raw));
      download(bytes, 'scene.bak');
      hideError();
    } catch (e) {
      showError(`导出失败: ${e.message}`);
    }
  });
  $('btn-new').addEventListener('click', () => {
    applyValue(newSceneTemplate());
    hideError();
  });
  $('btn-insert').addEventListener('click', () => {
    try {
      const raw = textToPayload($('edit-json').value);
      const type = $('ins-type').value;
      const id = `n${Math.random().toString(16).slice(2, 10)}`;
      const sk = buildNodeSkeleton(type, id);
      let obj;
      if (Array.isArray(raw)) {
        if (raw.length === 0) obj = newSceneTemplate();
        else obj = { version: 2, rules: raw, variables: {} };
      } else {
        obj = raw;
      }
      if (!obj.rules || obj.rules.length === 0) obj = newSceneTemplate();
      const rule = obj.rules[0];
      rule.nodes = [...(rule.nodes ?? []), sk];
      applyValue(obj);
      hideError();
    } catch (e) {
      showError(`插入节点失败: ${e.message}`);
    }
  });
}

const drop = $('drop');
const fileInput = $('file');
drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const f = e.dataTransfer.files?.[0];
  if (f) handleFile(f);
});
fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  if (f) handleFile(f);
});

for (const btn of document.querySelectorAll('#tabs button')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('main section').forEach((s) => s.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  });
}

// AI 生成:设置存 localStorage,仅发送到用户填写的端点
const aiBase = $('ai-base');
const aiModel = $('ai-model');
const aiKey = $('ai-key');
const aiReq = $('ai-req');
const aiGo = $('ai-go');
const aiStatus = $('ai-status');
try {
  const saved = JSON.parse(localStorage.getItem('msl-ai-settings') ?? '{}');
  if (saved.baseUrl) aiBase.value = saved.baseUrl;
  if (saved.model) aiModel.value = saved.model;
  if (saved.apiKey) aiKey.value = saved.apiKey;
} catch {
  // 忽略损坏的本地设置
}
aiGo.addEventListener('click', async () => {
  const baseUrl = aiBase.value.trim();
  const model = aiModel.value.trim();
  const apiKey = aiKey.value.trim();
  const requirement = aiReq.value.trim();
  if (!baseUrl || !model || !apiKey) {
    aiStatus.textContent = '请先填写 Base URL、模型与 API Key';
    return;
  }
  if (!requirement) {
    aiStatus.textContent = '请填写场景需求';
    return;
  }
  localStorage.setItem('msl-ai-settings', JSON.stringify({ baseUrl, model, apiKey }));
  aiGo.disabled = true;
  aiStatus.textContent = '生成中…';
  try {
    const value = await generateScene({ baseUrl, model, apiKey, requirement });
    applyValue(value);
    hideError();
    aiStatus.textContent = '已生成并载入编辑页,请预览/模拟确认后再导出 .bak';
    document.querySelector('[data-tab="edit"]').click();
  } catch (e) {
    aiStatus.textContent = `生成失败: ${e.message}`;
  } finally {
    aiGo.disabled = false;
  }
});
