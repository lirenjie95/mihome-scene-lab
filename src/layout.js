const COL_GAP = 32;
const ROW_GAP = 24;

export function layoutGraph(rule) {
  const nodes = rule.nodes ?? [];
  const positions = new Map();
  if (nodes.length === 0) return { positions, edges: [], width: 0, height: 0 };

  const outAdj = new Map();
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  const edges = [];
  for (const n of nodes) {
    for (const [pin, targets] of Object.entries(n.outputs ?? {})) {
      for (const t of targets ?? []) {
        const dot = t.lastIndexOf('.');
        const to = dot >= 0 ? t.slice(0, dot) : t;
        const toPin = dot >= 0 ? t.slice(dot + 1) : '';
        edges.push({ from: n.id, fromPin: pin, to, toPin });
        if (!outAdj.has(n.id)) outAdj.set(n.id, []);
        outAdj.get(n.id).push(to);
        inDeg.set(to, (inDeg.get(to) ?? 0) + 1);
      }
    }
  }

  // 从源出发的最长路径分层,visited 防环
  const layer = new Map(nodes.map((n) => [n.id, 0]));
  const queue = nodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const visited = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    for (const to of outAdj.get(id) ?? []) {
      const next = (layer.get(id) ?? 0) + 1;
      if (!layer.has(to) || next > layer.get(to)) layer.set(to, next);
      queue.push(to);
    }
  }

  const byLayer = new Map();
  for (const n of nodes) {
    const l = layer.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(n);
  }

  const wOf = (n) => (n.cfg?.pos?.width > 0 ? n.cfg.pos.width : 220);
  const hOf = (n) => (n.cfg?.pos?.height > 0 ? n.cfg.pos.height : 110);
  const maxW = Math.max(...nodes.map(wOf));

  let x = 0;
  let width = 0;
  let height = 0;
  for (const l of [...byLayer.keys()].sort((a, b) => a - b)) {
    let y = 0;
    for (const n of byLayer.get(l)) {
      positions.set(n.id, { x, y });
      width = Math.max(width, x + wOf(n));
      height = Math.max(height, y + hOf(n));
      y += hOf(n) + ROW_GAP;
    }
    x += maxW + COL_GAP;
  }
  return { positions, edges, width, height };
}
