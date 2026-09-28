import { Engine } from './engine.js';
import { diagnoseRule } from './diagnose.js';
import { ASSUMPTIONS, getChoice, setChoice } from './assumptions.js';
import { layoutGraph } from '../layout.js';
import { renderRuleSvg } from '../render.js';
import { escapeHtml } from '../escape.js';

const SOURCE_TYPES = new Set(['deviceInput', 'deviceInputSetVar', 'alarmClock', 'timeRange', 'onLoad', 'varChange']);

// 纯函数:收集场景内全部 did:siid:piid 属性(去重)
export function collectDeviceProps(rule) {
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
  return props;
}

// 纯函数:单行设备状态控件 HTML(已转义)
export function deviceRowHtml(p, cur) {
  const did = escapeHtml(p.did);
  const sp = `${p.siid}:${p.piid}`;
  const key = escapeHtml(p.key);
  if (typeof cur === 'boolean') {
    return `<tr><td>${did}</td><td>${sp}</td><td><input type="checkbox" data-key="${key}" ${cur ? 'checked' : ''}></td></tr>`;
  }
  const v = escapeHtml(String(cur));
  return `<tr><td>${did}</td><td>${sp}</td><td><input type="number" step="1" data-key="${key}" value="${v}"></td></tr>`;
}

export function setupSimUI(payload) {
  const sim = document.getElementById('sim');
  if (!sim) return;
  let currentRule = payload.rules[0];

  const rulesSel = payload.rules.length > 1
    ? `<div class="sim-panel"><h4>场景</h4><select id="sim-rule">${payload.rules
        .map((r, i) => `<option value="${i}">${escapeHtml(r.cfg?.userData?.name ?? r.id ?? `场景 ${i + 1}`)}</option>`)
        .join('')}</select></div>`
    : '';
  sim.innerHTML = rulesSel + '<div id="sim-holder"></div>';
  if (rulesSel) {
    document.getElementById('sim-rule').addEventListener('change', (e) => {
      currentRule = payload.rules[Number(e.target.value)];
      renderPanel(currentRule);
    });
  }
  renderPanel(currentRule);

  function renderPanel(rule) {
    const holder = document.getElementById('sim-holder');
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

    const deviceRows = collectDeviceProps(rule)
      .map((p) => {
        const cur = eng.getDevice(p.did, p.siid, p.piid) ?? p.value ?? false;
        return deviceRowHtml(p, cur);
      })
      .join('');

    const varRows = Object.entries(payload.variables ?? {})
      .flatMap(([scope, vars]) => Object.entries(vars ?? {}).map(([id, v]) => {
        const cur = eng.getVar(scope, id) ?? v.value ?? 0;
        return `<tr><td>${escapeHtml(scope)}.${escapeHtml(id)}</td><td><input type="number" data-var="${escapeHtml(`${scope}|${id}`)}" value="${escapeHtml(String(cur))}"></td></tr>`;
      }))
      .join('');

    const triggerButtons = (rule.nodes ?? [])
      .flatMap((n) => {
        if (n.type === 'timeRange') {
          return [
            `<button data-timerange="${escapeHtml(n.id)}" data-in="1">进入时间窗 ${escapeHtml(n.id.slice(0, 8))}</button>`,
            `<button data-timerange="${escapeHtml(n.id)}" data-in="0">离开时间窗 ${escapeHtml(n.id.slice(0, 8))}</button>`,
          ];
        }
        if (SOURCE_TYPES.has(n.type)) {
          return [`<button data-trigger="${escapeHtml(n.id)}">触发 ${escapeHtml(n.type)} ${escapeHtml(n.id.slice(0, 8))}</button>`];
        }
        return [];
      })
      .join(' ');

    const assumptionRows = ASSUMPTIONS.map((a) => `
      <div>
        <strong>${escapeHtml(a.label)}</strong><br>
        <small>${escapeHtml(a.detail)}(${escapeHtml(a.evidence)})</small><br>
        <select data-assume="${escapeHtml(a.id)}">${a.choices.map((c) => `<option value="${escapeHtml(c)}" ${getChoice(a.id) === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select>
      </div>`).join('<hr>');

    const diag = diagnoseRule(rule);
    const diagHtml = diag.length === 0 ? '<p>未发现结构问题</p>' : diag.map((d) => `<p class="warn">${d.level === 'error' ? '⛔' : '⚠'} ${escapeHtml(d.text)}</p>`).join('');

    holder.innerHTML = `
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

    holder.addEventListener('change', (e) => {
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

    holder.addEventListener('click', (e) => {
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
      } else if (t.dataset.timerange) {
        const before = eng.trace.length;
        eng.setTimeRange(t.dataset.timerange, t.dataset.in === '1');
        const firedIds = new Set();
        for (const step of eng.trace.slice(before)) {
          step.fired.forEach((f) => firedIds.add(f.nodeId));
        }
        if (firedIds.size) refreshSvg([...firedIds]);
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
}
