import { deviceLabel } from './devices.js';
import { pinType } from './pins.js';
import { NODE_LABELS } from './catalog.js';

const TYPE_CN = NODE_LABELS;

const CATEGORY_HEAD = {
  src: ['deviceInput', 'deviceInputSetVar', 'alarmClock', 'timeRange', 'onLoad', 'varChange'],
  query: ['deviceGet', 'varGet'],
  logic: ['condition', 'signalOr', 'logicAnd', 'logicOr', 'logicNot', 'statusLast', 'delay', 'eventSequence', 'loop', 'onlyNTimes', 'counter', 'register', 'modeSwitch'],
  sink: ['deviceOutput', 'deviceGetSetVar', 'varSetNumber', 'varSetString'],
};

function catOf(type) {
  if (CATEGORY_HEAD.src.includes(type)) return 'src';
  if (CATEGORY_HEAD.query.includes(type)) return 'query';
  if (CATEGORY_HEAD.logic.includes(type)) return 'logic';
  if (CATEGORY_HEAD.sink.includes(type)) return 'sink';
  return 'other';
}

function headColor(type) {
  switch (catOf(type)) {
    case 'src': return '#b26a00';
    case 'query': return '#2f9c9c';
    case 'logic': return '#7a5af8';
    case 'sink': return '#c14b3d';
    default: return '#8a919c';
  }
}

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const trunc = (s, n) => {
  const t = String(s);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export function paramText(node) {
  const p = node.props ?? {};
  const parts = [];
  if (node.type === 'delay' && p.timeout !== undefined) parts.push(`延时 ${p.timeout / 1000}s`);
  if ((node.type === 'deviceGet' || node.type === 'varGet') && p.operator && p.v1 !== undefined) parts.push(`当值 ${p.operator} ${p.v1}`);
  if (node.type === 'deviceOutput' && p.value !== undefined) parts.push(`设置值 ${p.value}`);
  if (node.type === 'deviceInput' && p.eiid !== undefined) parts.push('事件触发');
  if (node.type === 'alarmClock' && p.isSunset !== undefined) parts.push(p.isSunset ? '日落' : '日出');
  if (node.type === 'varGet' && p.id) parts.push(`变量 ${p.id}`);
  return parts.join(' · ');
}

export function cardLabel(node) {
  const base = TYPE_CN[node.type] ?? node.type ?? '未知卡片';
  const dev = node.cfg?.urn ? deviceLabel(node.cfg.urn) : null;
  return [dev, base, paramText(node)].filter(Boolean).join(' · ');
}

// 引脚纵向排布顺序(输出引脚从头部下方开始依次排布)
const PIN_ORDER = ['output', 'output2', 'met', 'unmet', 'output0', 'output1', 'output2', 'output3', 'input', 'input0', 'input1', 'input2', 'trigger', 'condition', 'start', 'stop', 'setTrue', 'setFalse', 'zero'];
const HEAD_H = 26;

function pinY(pin) {
  const i = PIN_ORDER.indexOf(pin);
  return HEAD_H + 10 + (i >= 0 ? i : 0) * 16;
}

function pinFill(t) {
  if (t === 'event') return 'pin-event';
  if (t === 'state') return 'pin-state';
  return 'pin-both';
}

export function renderRuleSvg(rule, layout) {
  const parts = [];
  const byId = new Map((rule.nodes ?? []).map((n) => [n.id, n]));

  parts.push(`<defs>
<marker id="arrow-event" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3478f6"/></marker>
<marker id="arrow-state" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1f9d55"/></marker>
<marker id="arrow-both" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#b26a00"/></marker>
</defs>`);

  for (const id of layout.positions.keys()) {
    const node = byId.get(id);
    if (!node) continue;
    const pos = layout.positions.get(id);
    const w = node.cfg?.pos?.width > 0 ? node.cfg.pos.width : 220;
    const h = node.cfg?.pos?.height > 0 ? node.cfg.pos.height : 110;
    const head = TYPE_CN[node.type] ?? node.type ?? '未知卡片';
    const color = headColor(node.type);
    const dev = node.cfg?.urn ? deviceLabel(node.cfg.urn) : null;
    const param = paramText(node);

    const inDots = Object.keys(node.inputs ?? {})
      .map((p) => `<circle class="pin pin-in" cx="${pos.x}" cy="${pos.y + pinY(p)}" r="4"/>`)
      .join('');
    const outDots = Object.entries(node.outputs ?? {})
      .map(([p]) => {
        const t = pinType(node, p) ?? 'event|state';
        return `<circle class="pin ${pinFill(t)}" cx="${pos.x + w}" cy="${pos.y + pinY(p)}" r="4"/>`;
      })
      .join('');

    parts.push(`<g class="node" data-id="${esc(id)}">
  <rect class="node-bg" x="${pos.x}" y="${pos.y}" width="${w}" height="${h}" rx="10"/>
  <path class="node-head" d="M ${pos.x + 10} ${pos.y} H ${pos.x + w - 10} Q ${pos.x + w} ${pos.y} ${pos.x + w} ${pos.y + 10} V ${pos.y + HEAD_H} H ${pos.x} V ${pos.y + 10} Q ${pos.x} ${pos.y} ${pos.x + 10} ${pos.y} Z" fill="${color}"/>
  <text class="node-head-text" x="${pos.x + w / 2}" y="${pos.y + 17}" text-anchor="middle">${esc(head)}</text>
  <text class="node-title" x="${pos.x + 12}" y="${pos.y + HEAD_H + 20}">${esc(trunc(dev ?? '', 22))}</text>
  <text class="node-sub" x="${pos.x + 12}" y="${pos.y + HEAD_H + 38}">${esc(trunc(param || node.type, 24))}</text>
  ${inDots}${outDots}
</g>`);
  }

  for (const e of layout.edges) {
    const a = layout.positions.get(e.from);
    const b = layout.positions.get(e.to);
    if (!a || !b) continue;
    const src = byId.get(e.from);
    const type = src ? (pinType(src, e.fromPin) ?? 'event|state') : 'event|state';
    const cls = type === 'event' ? 'event' : type === 'state' ? 'state' : 'both';
    const w = src?.cfg?.pos?.width > 0 ? src.cfg.pos.width : 220;
    const x1 = a.x + w;
    const y1 = a.y + pinY(e.fromPin);
    const x2 = b.x;
    const y2 = b.y + pinY(e.toPin);
    const mx = (x1 + x2) / 2;
    parts.push(`<path class="edge edge-${cls}" d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" marker-end="url(#arrow-${cls})"/>`);
  }

  const pad = 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(layout.width + pad, 10)} ${Math.max(layout.height + pad, 10)}">${parts.join('\n')}</svg>`;
}
