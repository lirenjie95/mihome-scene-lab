import { layoutGraph } from '../src/layout.js';

const node = (id, outputs = {}, pos) => ({
  id,
  type: 'delay',
  cfg: { pos: pos ?? { width: 200, height: 100 } },
  inputs: { input: null },
  outputs,
  props: {},
});

export const tests = [
  {
    name: '链式三节点分层 0/1/2,x 递增',
    fn() {
      const rule = { nodes: [node('a', { output: ['b.input'] }), node('b', { output: ['c.input'] }), node('c')] };
      const { positions } = layoutGraph(rule);
      const [ax, bx, cx] = ['a', 'b', 'c'].map((id) => positions.get(id).x);
      if (!(ax < bx && bx < cx)) throw new Error(`分层错误: ${ax}, ${bx}, ${cx}`);
    },
  },
  {
    name: '边解析出 pin 与目标',
    fn() {
      const rule = { nodes: [node('s', { output: ['t.trigger'], output2: ['u.input'] }), node('t'), node('u')] };
      const { edges } = layoutGraph(rule);
      if (edges.length !== 2) throw new Error(`边数 ${edges.length}`);
      const e1 = edges.find((e) => e.to === 't');
      if (!e1 || e1.fromPin !== 'output' || e1.toPin !== 'trigger') throw new Error('边 1 解析错误');
    },
  },
  {
    name: '两个源节点同层不重叠',
    fn() {
      const rule = { nodes: [node('s1', { output: ['d.input'] }), node('s2', { output: ['d.input'] }), node('d')] };
      const { positions } = layoutGraph(rule);
      const y1 = positions.get('s1').y;
      const y2 = positions.get('s2').y;
      if (y1 === y2) throw new Error('同层节点 y 重叠');
    },
  },
  {
    name: '自环不导致死循环',
    fn() {
      const rule = { nodes: [node('x', { output: ['x.input'] })] };
      const { positions } = layoutGraph(rule);
      if (!positions.has('x')) throw new Error('x 应有坐标');
    },
  },
  {
    name: '悬空边目标不存在时被保留但不参与布局',
    fn() {
      const rule = { nodes: [node('a', { output: ['ghost.input'] })] };
      const { edges, positions } = layoutGraph(rule);
      if (edges.length !== 1 || edges[0].to !== 'ghost') throw new Error('边应保留');
      if (positions.size !== 1) throw new Error('布局只含真实节点');
    },
  },
  {
    name: '空节点列表返回零尺寸',
    fn() {
      const { width, height, positions } = layoutGraph({ nodes: [] });
      if (width !== 0 || height !== 0 || positions.size !== 0) throw new Error('空图应零尺寸');
    },
  },
  {
    name: '整体宽高覆盖所有节点',
    fn() {
      const rule = { nodes: [node('a', { output: ['b.input'] }), node('b')] };
      const { positions, width, height } = layoutGraph(rule);
      for (const [id, p] of positions) {
        const n = rule.nodes.find((x) => x.id === id);
        const w = n.cfg.pos.width;
        const h = n.cfg.pos.height;
        if (p.x + w > width || p.y + h > height) throw new Error(`节点 ${id} 超出边界`);
      }
    },
  },
];
