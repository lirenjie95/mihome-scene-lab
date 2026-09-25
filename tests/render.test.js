import { renderRuleSvg, cardLabel } from '../src/render.js';
import { layoutGraph } from '../src/layout.js';

const node = (id, type, extra = {}) => ({
  id,
  type,
  cfg: { pos: { width: 220, height: 110 }, urn: extra.urn },
  inputs: { input: null },
  outputs: extra.outputs ?? {},
  props: extra.props ?? {},
});

const rule = {
  cfg: { userData: { name: '测试场景' } },
  nodes: [
    node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['d.input'] } }),
    node('d', 'deviceOutput', {
      urn: 'urn:miot-spec-v2:device:camera:0000A01C:chuangmi-039c01:2',
      props: { did: '1', siid: 2, piid: 1, value: false },
    }),
  ],
};

export const tests = [
  {
    name: 'SVG 包含节点与边,无 NaN',
    fn() {
      const svg = renderRuleSvg(rule, layoutGraph(rule));
      if (!svg.startsWith('<svg')) throw new Error('应以 <svg 开头');
      if (!svg.includes('data-id="s"') || !svg.includes('data-id="d"')) throw new Error('缺节点');
      if (!svg.includes('class="edge')) throw new Error('缺边');
      if (svg.includes('NaN')) throw new Error('出现 NaN');
    },
  },
  {
    name: 'event 边着色为 edge-event',
    fn() {
      const svg = renderRuleSvg(rule, layoutGraph(rule));
      if (!svg.includes('edge-event')) throw new Error('deviceInput→deviceOutput 应为 event 边');
    },
  },
  {
    name: 'cardLabel 设备卡使用中文名',
    fn() {
      const label = cardLabel(rule.nodes[1]);
      if (!label.includes('小米智能摄像机2 云台版')) throw new Error(`标签: ${label}`);
    },
  },
  {
    name: 'cardLabel 控制卡带参数摘要',
    fn() {
      const d = node('x', 'delay', { props: { timeout: 30000 } });
      const label = cardLabel(d);
      if (!label.includes('延时') || !label.includes('30')) throw new Error(`标签: ${label}`);
    },
  },
];
