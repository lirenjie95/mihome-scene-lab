import { diagnoseRule } from '../src/simulate/diagnose.js';

const node = (id, type, extra = {}) => ({
  id,
  type,
  cfg: { pos: {} },
  inputs: extra.inputs ?? { input: null },
  outputs: extra.outputs ?? {},
  props: extra.props ?? {},
});

export const tests = [
  {
    name: '无事件源报 error',
    fn() {
      const r = { nodes: [node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1 } })] };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.level === 'error' && i.text.includes('触发源'))) throw new Error('缺触发源 error');
    },
  },
  {
    name: '孤立动作报"可能永不执行"',
    fn() {
      const r = { nodes: [node('s', 'deviceInput', { props: { eiid: 1 } }), node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1 } })] };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.level === 'warn' && i.text.includes('永不执行'))) throw new Error('缺通路 warn');
    },
  },
  {
    name: 'event 输出接 state 输入报类型不匹配',
    fn() {
      const r = {
        nodes: [
          node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['l.condition'] } }),
          node('l', 'logicAnd', { inputs: { input: null } }),
          node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1 } }),
        ],
      };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.text.includes('类型不匹配'))) throw new Error('缺类型错配 warn');
    },
  },
  {
    name: '悬空边报 warn',
    fn() {
      const r = { nodes: [node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['ghost.input'] } })] };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.text.includes('不存在的节点'))) throw new Error('缺悬空边 warn');
    },
  },
  {
    name: '正常链路零 issue',
    fn() {
      const r = {
        nodes: [
          node('s', 'deviceInput', { props: { did: '1', siid: 2, eiid: 1, arguments: [] }, outputs: { output: ['a.trigger'] } }),
          node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1, value: true } }),
        ],
      };
      const issues = diagnoseRule(r);
      if (issues.length !== 0) throw new Error(`应有 0 issue: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: '诊断并入节点级校验问题(缺 timeout 报 error)',
    fn() {
      const r = {
        nodes: [
          node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['d.input'] } }),
          node('d', 'delay', { props: {} }),
        ],
      };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.level === 'error' && i.text.includes('timeout'))) {
        throw new Error(`缺节点校验问题: ${JSON.stringify(issues)}`);
      }
    },
  },
  {
    name: 'nop 连边报 warn',
    fn() {
      const r = {
        nodes: [
          node('s', 'deviceInput', { props: { eiid: 1 } }),
          node('note', 'nop', { outputs: { output: ['s.input'] } }),
        ],
      };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.level === 'warn' && i.text.includes('nop'))) {
        throw new Error(`缺 nop 连边警告: ${JSON.stringify(issues)}`);
      }
    },
  },
  {
    name: 'loop.stop 未连接给 info 提示',
    fn() {
      const r = {
        nodes: [
          node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['l.start'] } }),
          node('l', 'loop', { inputs: { start: null, stop: null }, props: { interval: 1000 }, outputs: { output: ['a.trigger'] } }),
          node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1, value: true } }),
        ],
      };
      const issues = diagnoseRule(r);
      if (!issues.some((i) => i.level === 'info' && i.text.includes('stop'))) {
        throw new Error(`缺 loop.stop info: ${JSON.stringify(issues)}`);
      }
    },
  },
  {
    name: 'counter.zero 已连接则无 info 提示',
    fn() {
      const r = {
        nodes: [
          node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['c.input'] } }),
          node('z', 'onLoad', { outputs: { output: ['c.zero'] } }),
          node('c', 'counter', { inputs: { input: null, zero: null }, props: { n: 1 }, outputs: { output: ['a.trigger'] } }),
          node('a', 'deviceOutput', { props: { did: '1', siid: 2, piid: 1, value: true } }),
        ],
      };
      const issues = diagnoseRule(r);
      if (issues.some((i) => i.text.includes('zero'))) {
        throw new Error(`zero 已连接不应有提示: ${JSON.stringify(issues)}`);
      }
    },
  },
];
