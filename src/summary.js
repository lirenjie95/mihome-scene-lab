import { deviceLabel } from './devices.js';
import { cardLabel } from './render.js';

const SOURCE_TYPES = new Set(['deviceInput', 'deviceInputSetVar', 'alarmClock', 'timeRange', 'onLoad', 'varChange']);
const SINK_TYPES = new Set(['deviceOutput', 'deviceGetSetVar', 'varSetNumber', 'varSetString']);

function adjacency(nodes) {
  const adj = new Map();
  for (const n of nodes) {
    for (const targets of Object.values(n.outputs ?? {})) {
      for (const t of targets ?? []) {
        const to = t.includes('.') ? t.slice(0, t.lastIndexOf('.')) : t;
        if (!adj.has(n.id)) adj.set(n.id, []);
        adj.get(n.id).push(to);
      }
    }
  }
  return adj;
}

function reachable(adj, start, target) {
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    if (id === target) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) queue.push(next);
  }
  return false;
}

export function describeRule(rule) {
  const lines = [];
  const name = rule.cfg?.userData?.name ?? rule.id ?? '未命名场景';
  lines.push(`【${name}】 ${rule.cfg?.enable ? '启用' : '停用'} · ${rule.nodes?.length ?? 0} 个节点`);
  const nodes = rule.nodes ?? [];
  const sources = nodes.filter((n) => SOURCE_TYPES.has(n.type));
  const sinks = nodes.filter((n) => SINK_TYPES.has(n.type));
  if (sources.length === 0) lines.push('⚠ 未找到独立触发源(设备事件/定时/变量变化等),场景可能永远不会触发');
  if (sinks.length === 0) lines.push('⚠ 场景没有动作节点,不会产生任何执行效果');
  const adj = adjacency(nodes);
  for (const s of sources) {
    const srcText = cardLabel(s);
    if (s.cfg?.urn) lines.push(`触发:${srcText}(来自 ${deviceLabel(s.cfg.urn)})`);
    else lines.push(`触发:${srcText}`);
    for (const k of sinks) {
      const ok = reachable(adj, s.id, k.id);
      lines.push(ok ? `  → 执行:${cardLabel(k)}` : `  → ${cardLabel(k)}(与触发源无事件通路,可能永不执行)`);
    }
  }
  return lines.join('\n');
}
