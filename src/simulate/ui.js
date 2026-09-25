import { Engine } from './engine.js';
import { diagnoseRule } from './diagnose.js';
import { ASSUMPTIONS, getChoice, setChoice } from './assumptions.js';
import { layoutGraph } from '../layout.js';
import { renderRuleSvg } from '../render.js';

const SOURCE_TYPES = new Set(['deviceInput', 'deviceInputSetVar', 'alarmClock', 'timeRange', 'onLoad', 'varChange']);

export function setupSimUI(payload) {
  const sim = document.getElementById('sim');
  if (!sim) return;
  const rule = payload.rules[0];

  const eng = new Engine(rule, {
    listener: (entry) => {
      const el = document.getElementById('sim-log');
      if (!el) return;
      const line = document.createElement('div');
      line.className = `log-${entry.kind}`;
      line.textContent = `[${(entry.t / 1000).toFixed(1)}s] ${entry.nodeId ? `${entry.nodeId} ` : ''}${entry.text}`;
      el.appendChild(line);
      el.scrollTop = el.scrollHeight;
    },
  });

  // 设备状态表:收集场景内所有 did:siid:piid
  const props = [];
  const seen = new Set();
  for (const n of rule.nodes ?? []) {
    const p = n.props ?? {};
    if (p.did && p.siid && p.piid !== undefined) {
      const key = `${p.did}:${p.siid}:${p.piid}`;
      if (!seen.has(key)) {
        seen.add(key);
        props.push({ key, did: p.did, siid: p.siid, piid: p.piid, value: p.value });
      }
    }
  }
  const deviceRows = props
    .map((p) => {
      const cur = eng.getDevice(p.did, p.siid, p.piid) ?? p.value ?? false;
      if (typeof cur === 'boolean') {
        return `<tr><td>${p.did}</td><td>${p.siid}:${p.piid}</td>
          <td><input type="checkbox" data-key="${p.key}" ${cur ? 'checked' : ''}></td></tr>`;
      }
      return `<tr><td>${p.did}</td><td>${p.siid}:${p.piid}</td>
        <td><input type="number" step="1" data-key="${p.key}" value="${cur}"></td></tr>`;
    })
    .join('');

  // 变量表
  const varRows = Object.entries(payload.variables ?? {})
    .flatMap(([scope, vars]) => Object.entries(vars ?? {}).map(([id, v]) => {
      const cur = eng.getVar(scope, id) ?? v.value ?? 0;
      return `<tr><td>${scope}.${id}</td><td><input type="number" data-var="${scope}|${id}" value="${cur}"></td></tr>`;
    }))
    .join('');

  const triggerButtons = (rule.nodes ?? [])
    .filter((n) => SOURCE_TYPES.has(n.type))
    .map((n) => `<button data-trigger="${n.id}">触发 ${n.type} ${n.id.slice(0, 8)}</button>`)
    .join(' ');

  const assumptionRows = ASSUMPTIONS.map((a) => `
    <div>
      <strong>${a.label}</strong><br>
      <small>${a.detail}(${a.evidence})</small><br>
      <select data-assume="${a.id}">${a.choices.map((c) => `<option value="${c}" ${getChoice(a.id) === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    </div>`).join('<hr>');

  const diag = diagnoseRule(rule);
  const diagHtml = diag.length === 0 ? '<p>未发现结构问题</p>' : diag.map((d) => `<p class="warn">${d.level === 'error' ? '⛔' : '⚠'} ${d.text}</p>`).join('');

  sim.innerHTML = `
    <div class="sim-grid">
      <div>
        <div class="sim-panel"><h4>设备状态(改动即生效)</h4><table><tr><th>DID</th><th>属性</th><th>值</th></tr>${deviceRows}</table></div>
        <div class="sim-panel"><h4>场景变量</h4><table><tr><th>变量</th><th>值</th></tr>${varRows || '<tr><td colspan="2">无</td></tr>'}</table></div>
        <div class="sim-panel"><h4>虚拟时钟: <span id="sim-time">0.0s</span></h4>
          <button data-adv="1000">+1s</button> <button data-adv="60000">+1m</button> <button data-adv="3600000">+1h</button></div>
        <div class="sim-panel"><h4>触发事件</h4>${triggerButtons}</div>
        <div class="sim-panel"><h4>静态诊断</h4>${diagHtml}</div>
        <div class="sim-panel"><h4>语义假设(可切换)</h4>${assumptionRows}</div>
      </div>
      <div>
        <div class="sim-panel"><h4>流程图(蓝色描边=本次触发)</h4><div id="sim-svg"></div></div>
        <div class="sim-panel"><h4>事件日志</h4><div id="sim-log"></div></div>
      </div>
    </div>`;

  const refreshTime = () => {
    document.getElementById('sim-time').textContent = `${(eng.time / 1000).toFixed(1)}s`;
  };
  const refreshSvg = (firedIds) => {
    const base = renderRuleSvg(rule, layoutGraph(rule));
    let svg = base;
    if (firedIds && firedIds.length) {
      svg = base.replace(new RegExp(`data-id="(${firedIds.join('|')})"`, 'g'), 'data-id="$1" class="node fired"');
    }
    document.getElementById('sim-svg').innerHTML = svg;
  };

  sim.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.key) {
      const [did, siid, piid] = t.dataset.key.split(':');
      const n = rule.nodes.find((x) => x.props?.did === did && x.props?.siid === Number(siid) && x.props?.piid === Number(piid));
      const fallback = n?.props?.value ?? false;
      const prev = eng.getDevice(did, Number(siid), Number(piid)) ?? fallback;
      if (typeof prev === 'boolean') {
        eng.setDevice(did, Number(siid), Number(piid), t.checked);
      } else {
        const val = Number(t.value);
        eng.setDevice(did, Number(siid), Number(piid), Number.isNaN(val) ? prev : val);
      }
      refreshTime();
    } else if (t.dataset.var) {
      const [scope, id] = t.dataset.var.split('|');
      eng.setVar(scope, id, Number(t.value));
      refreshTime();
    } else if (t.dataset.assume) {
      setChoice(t.dataset.assume, t.value);
    }
  });

  sim.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.trigger) {
      const before = eng.trace.length;
      eng.inject('external', t.dataset.trigger, 'input');
      const firedIds = new Set();
      for (const step of eng.trace.slice(before)) {
        step.fired.forEach((f) => firedIds.add(f.nodeId));
      }
      refreshSvg([...firedIds]);
      refreshTime();
    } else if (t.dataset.adv) {
      const ms = Number(t.dataset.adv);
      const before = eng.trace.length;
      eng.advanceTime(ms);
      const firedIds = new Set();
      for (const step of eng.trace.slice(before)) {
        step.fired.forEach((f) => firedIds.add(f.nodeId));
      }
      if (firedIds.size) refreshSvg([...firedIds]);
      refreshTime();
    }
  });

  refreshSvg([]);
  refreshTime();
}
