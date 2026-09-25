import { describeRule } from '../src/summary.js';

const node = (id, type, extra = {}) => ({
  id,
  type,
  cfg: { pos: {}, urn: extra.urn },
  inputs: { input: null },
  outputs: extra.outputs ?? {},
  props: extra.props ?? {},
});

const chainRule = {
  cfg: { userData: { name: '回家' }, enable: true },
  nodes: [
    node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['a.input'] } }),
    node('a', 'deviceOutput', {
      urn: 'urn:miot-spec-v2:device:camera:0000A01C:chuangmi-039c01:2',
      props: { did: '1', siid: 2, piid: 1, value: false },
    }),
  ],
};

export const tests = [
  {
    name: '场景名与启用状态进入解读',
    fn() {
      const text = describeRule(chainRule);
      if (!text.includes('回家')) throw new Error('缺场景名');
      if (!text.includes('启用')) throw new Error('缺启用状态');
    },
  },
  {
    name: '有通路的动作输出"执行",并带设备中文名',
    fn() {
      const text = describeRule(chainRule);
      if (!text.includes('执行')) throw new Error('缺执行行');
      if (!text.includes('小米智能摄像机2 云台版')) throw new Error('缺设备中文名');
    },
  },
  {
    name: '无触发源场景出现警告',
    fn() {
      const text = describeRule({
        cfg: { userData: { name: 'x' }, enable: false },
        nodes: [node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1, value: true } })],
      });
      if (!text.includes('触发源')) throw new Error('缺触发源警告');
    },
  },
  {
    name: '无动作场景出现警告',
    fn() {
      const text = describeRule({
        cfg: { userData: { name: 'x' }, enable: false },
        nodes: [node('s', 'deviceInput', { props: { eiid: 1 } })],
      });
      if (!text.includes('动作')) throw new Error('缺动作警告');
    },
  },
  {
    name: '与触发源无通路的动作标注"可能永不执行"',
    fn() {
      const rule = {
        cfg: { userData: { name: 'x' }, enable: false },
        nodes: [
          node('s', 'deviceInput', { props: { eiid: 1 } }),
          node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1, value: true } }),
        ],
      };
      const text = describeRule(rule);
      if (!text.includes('可能永不执行')) throw new Error('缺通路警告');
    },
  },
];
