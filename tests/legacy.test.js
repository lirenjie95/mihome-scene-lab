// 旧版 rules-only 数组格式的端到端支持测试。
// 结构与 xgg local-backup-legacy-array.json 夹具同源(官方 legacy 载荷 = 无 v2 外层的 {cfg, nodes} 数组),
// 这里用最小结构验证:解析 → 规范化 → 布局 → 渲染 全链路可用。
import { packBackup, decodeBackup } from '../src/parse.js';
import { normalizePayload } from '../src/model.js';
import { layoutGraph } from '../src/layout.js';
import { renderRuleSvg } from '../src/render.js';
import { describeRule } from '../src/summary.js';

const legacyPayload = [
  {
    cfg: {
      id: 'legacyRule1',
      enable: true,
      uiType: 'rule',
      userData: { name: '旧版示例场景', transform: { x: 0, y: 0, scale: 1, rotate: 0 }, lastUpdateTime: 0, version: 0 },
    },
    nodes: [
      {
        id: 'src1',
        type: 'onLoad',
        cfg: { pos: { x: 0, y: 0, width: 200, height: 120 }, name: 'onLoad', version: 1 },
        inputs: {},
        outputs: { output: ['act1.trigger'] },
        props: {},
      },
      {
        id: 'act1',
        type: 'deviceOutput',
        cfg: {
          pos: { x: 300, y: 0, width: 220, height: 110 },
          urn: 'urn:miot-spec-v2:device:switch:0000A003:xiaomi-w2:2:0000C809',
        },
        inputs: { trigger: null },
        outputs: { output: [] },
        props: { did: '1000000001', siid: 2, piid: 1, value: true },
      },
    ],
  },
];

export const tests = [
  {
    name: 'legacy 数组打包后可解析且规范化警告',
    async fn() {
      const packed = await packBackup(JSON.stringify(legacyPayload));
      const decoded = await decodeBackup(packed);
      if (!decoded.verified) throw new Error('应校验通过');
      const payload = normalizePayload(decoded.value);
      if (payload.version !== 2) throw new Error('应规范化为 v2');
      if (payload.rules.length !== 1 || payload.rules[0].id !== 'legacyRule1') throw new Error('规则规范化错误');
      if (!payload.warnings.some((w) => w.includes('旧版'))) throw new Error('应有旧版警告');
    },
  },
  {
    name: 'legacy 场景可布局渲染,无 NaN',
    fn() {
      const payload = normalizePayload(legacyPayload);
      const svg = renderRuleSvg(payload.rules[0], layoutGraph(payload.rules[0]));
      if (!svg.includes('data-id="src1"') || !svg.includes('data-id="act1"')) throw new Error('渲染缺节点');
      if (svg.includes('NaN')) throw new Error('出现 NaN');
    },
  },
  {
    name: 'legacy 场景生成中文解读',
    fn() {
      const payload = normalizePayload(legacyPayload);
      const text = describeRule(payload.rules[0]);
      if (!text.includes('旧版示例场景')) throw new Error('缺场景名');
      if (!text.includes('小米智能开关(双开)')) throw new Error('缺设备中文名');
      if (!text.includes('执行')) throw new Error('缺执行行');
    },
  },
];
