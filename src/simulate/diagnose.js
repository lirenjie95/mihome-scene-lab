import { pinType } from '../pins.js';

const SOURCE_TYPES = new Set(['deviceInput', 'deviceInputSetVar', 'alarmClock', 'timeRange', 'onLoad', 'varChange']);
const SINK_TYPES = new Set(['deviceOutput', 'deviceGetSetVar', 'varSetNumber', 'varSetString']);
const EVENT_INPUTS = new Set(['trigger', 'input', 'input1', 'input2', 'input0', 'start', 'stop', 'setTrue', 'setFalse', 'zero']);

function isEventInput(node, pin) {
  if (pin === 'condition') return false; // condition.condition 是 state
  if (pinType(node, pin)) return pinType(node, pin).includes('event');
  return EVENT_INPUTS.has(pin);
}

export function diagnoseRule(rule) {
  const issues = [];
  const nodes = rule.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const sources = nodes.filter((n) => SOURCE_TYPES.has(n.type));
  const sinks = nodes.filter((n) => SINK_TYPES.has(n.type));

  if (sources.length === 0) {
    issues.push({ level: 'error', text: '没有任何独立触发源(设备事件/定时/变量变化/启用触发),场景永远不会启动', nodeIds: [] });
  }
  if (sinks.length === 0) {
    issues.push({ level: 'error', text: '没有任何动作节点,场景不会产生执行效果', nodeIds: [] });
  }

  const edges = [];
  for (const n of nodes) {
    for (const [pin, targets] of Object.entries(n.outputs ?? {})) {
      for (const t of targets ?? []) {
        const dot = t.lastIndexOf('.');
        const to = dot >= 0 ? t.slice(0, dot) : t;
        const toPin = dot >= 0 ? t.slice(dot + 1) : 'input';
        edges.push({ from: n.id, fromPin: pin, to, toPin });
        if (!byId.has(to)) {
          issues.push({ level: 'warn', text: `节点 ${n.id} 的 ${pin} 指向不存在的节点 ${to}`, nodeIds: [n.id] });
        }
      }
    }
  }

  for (const e of edges) {
    const src = byId.get(e.from);
    const dst = byId.get(e.to);
    if (!src || !dst) continue;
    const t = pinType(src, e.fromPin);
    const dstIsEvent = isEventInput(dst, e.toPin);
    if (t === 'event' && !dstIsEvent) {
      issues.push({ level: 'warn', text: `${src.id}.${e.fromPin}(event)接到 ${dst.id}.${e.toPin}(state 输入),类型不匹配`, nodeIds: [src.id, dst.id] });
    }
    if (t === 'state' && dstIsEvent && e.toPin !== 'condition') {
      issues.push({ level: 'warn', text: `${src.id}.${e.fromPin}(state)接到 ${dst.id}.${e.toPin}(event 输入),类型不匹配`, nodeIds: [src.id, dst.id] });
    }
  }

  const adj = new Map();
  for (const e of edges) {
    if (!byId.has(e.to)) continue;
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const reachable = (start, target) => {
    const seen = new Set();
    const q = [start];
    while (q.length) {
      const id = q.shift();
      if (id === target) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of adj.get(id) ?? []) q.push(next);
    }
    return false;
  };
  const anySourceReaches = (sink) => sources.some((s) => reachable(s.id, sink.id));
  for (const k of sinks) {
    if (!anySourceReaches(k)) {
      issues.push({ level: 'warn', text: `动作 ${k.id} 没有任何事件源能到达,可能永不执行`, nodeIds: [k.id] });
    }
  }
  return issues;
}
