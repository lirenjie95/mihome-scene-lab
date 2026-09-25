import { Engine } from '../src/simulate/engine.js';

const node = (id, type, extra = {}) => ({
  id,
  type,
  cfg: { pos: {} },
  inputs: extra.inputs ?? { input: null },
  outputs: extra.outputs ?? {},
  props: extra.props ?? {},
});

const mk = (nodes) => new Engine({ nodes });

export const tests = [
  {
    name: '事件源 → 动作直达',
    fn() {
      const eng = mk([
        node('s', 'deviceInput', { props: { eiid: 1 }, outputs: { output: ['a.trigger'] } }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: true } }),
      ]);
      eng.inject('external', 's', 'input');
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('动作未执行');
      if (!eng.log.some((l) => l.kind === 'action')) throw new Error('缺动作日志');
    },
  },
  {
    name: 'deviceGet 满足走 output,不满足走 output2',
    fn() {
      const mk2 = () => mk([
        node('g', 'deviceGet', {
          props: { did: 'd1', siid: 3, piid: 1001, operator: '>', v1: 24 },
          outputs: { output: ['hot.input'], output2: ['cold.input'] },
        }),
        node('hot', 'deviceOutput', { props: { did: 'd9', siid: 2, piid: 1, value: 1 } }),
        node('cold', 'deviceOutput', { props: { did: 'd9', siid: 2, piid: 2, value: 1 } }),
      ]);
      const a = mk2();
      a.setDevice('d1', 3, 1001, 25);
      a.inject('external', 'g', 'input');
      if (a.getDevice('d9', 2, 1) !== 1) throw new Error('热分支应执行');
      const b = mk2();
      b.setDevice('d1', 3, 1001, 20);
      b.inject('external', 'g', 'input');
      if (b.getDevice('d9', 2, 2) !== 1) throw new Error('冷分支应执行');
    },
  },
  {
    name: 'delay 事件按虚拟时钟到期输出',
    fn() {
      const eng = mk([
        node('d', 'delay', { props: { timeout: 30000 }, outputs: { output: ['a.trigger'] } }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: true } }),
      ]);
      eng.inject('external', 'd', 'input');
      if (eng.getDevice('d1', 2, 1) !== undefined) throw new Error('未到时间不应执行');
      eng.advanceTime(29999);
      if (eng.getDevice('d1', 2, 1) !== undefined) throw new Error('29999ms 时不应执行');
      eng.advanceTime(1);
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('30000ms 后应执行');
    },
  },
  {
    name: 'condition 已接状态按真假走 met/unmet;悬空按假设走 unmet',
    fn() {
      const build = (withSrc) => mk([
        ...(withSrc
          ? [node('st', 'deviceInput', {
              props: { siid: 2, piid: 1, operator: '=', v1: true, did: 'd1' },
              outputs: { output: ['c.condition'] },
            })]
          : []),
        node('c', 'condition', {
          inputs: { trigger: null, condition: null },
          outputs: { met: ['y.trigger'], unmet: ['n.trigger'] },
        }),
        node('y', 'deviceOutput', { props: { did: 'd9', siid: 2, piid: 1, value: 1 } }),
        node('n', 'deviceOutput', { props: { did: 'd9', siid: 2, piid: 2, value: 1 } }),
      ]);
      const a = build(true);
      a.setDevice('d1', 2, 1, true);
      a.inject('external', 'c', 'trigger');
      if (a.getDevice('d9', 2, 1) !== 1) throw new Error('应为 met 分支');
      const b = build(true);
      b.setDevice('d1', 2, 1, false);
      b.inject('external', 'c', 'trigger');
      if (b.getDevice('d9', 2, 2) !== 1) throw new Error('应为 unmet 分支');
      const c2 = build(false);
      c2.inject('external', 'c', 'trigger');
      if (c2.getDevice('d9', 2, 2) !== 1) throw new Error('悬空应按假设走 unmet');
      if (!c2.log.some((l) => l.kind === 'assume')) throw new Error('应记录假设日志');
    },
  },
  {
    name: 'counter 第 N 次输出,zero 清零',
    fn() {
      const eng = mk([
        node('ct', 'counter', {
          inputs: { input: null, zero: null },
          props: { threshold: 3 },
          outputs: { output: ['a.trigger'] },
        }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: true } }),
      ]);
      eng.inject('external', 'ct', 'input');
      eng.inject('external', 'ct', 'input');
      if (eng.getDevice('d1', 2, 1) !== undefined) throw new Error('第 2 次不应触发');
      eng.inject('external', 'ct', 'input');
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('第 3 次应触发');
      eng.inject('external', 'ct', 'zero');
      eng.inject('external', 'ct', 'input');
      eng.inject('external', 'ct', 'input');
      eng.inject('external', 'ct', 'input');
      if (!eng.log.some((l) => l.kind === 'action')) throw new Error('清零后应能再次触发');
    },
  },
  {
    name: 'eventSequence 顺序成立才输出',
    fn() {
      const eng = mk([
        node('seq', 'eventSequence', {
          inputs: { input1: null, input2: null },
          props: { timeout: 5000 },
          outputs: { output: ['a.trigger'] },
        }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: true } }),
      ]);
      eng.inject('external', 'seq', 'input2');
      if (eng.getDevice('d1', 2, 1) !== undefined) throw new Error('先到 input2 不应输出');
      eng.inject('external', 'seq', 'input1');
      if (eng.getDevice('d1', 2, 1) !== undefined) throw new Error('仅 input1 不应输出');
      eng.inject('external', 'seq', 'input2');
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('顺序成立应输出');
    },
  },
  {
    name: 'signalOr 任一输入触发输出',
    fn() {
      const eng = mk([
        node('o', 'signalOr', { inputs: { input0: null, input1: null }, outputs: { output: ['a.trigger'] } }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: true } }),
      ]);
      eng.inject('external', 'o', 'input1');
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('应输出');
    },
  },
  {
    name: 'register 锁存输出状态',
    fn() {
      const eng = mk([
        node('r', 'register', { inputs: { setTrue: null, setFalse: null }, outputs: { output: ['a.trigger'] } }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: true } }),
      ]);
      eng.inject('external', 'r', 'setTrue');
      eng.inject('external', 'r', 'input');
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('latch=true 应输出');
    },
  },
  {
    name: 'modeSwitch 轮转输出引脚',
    fn() {
      const eng = mk([
        node('m', 'modeSwitch', {
          inputs: { input: null },
          outputs: { output0: ['a.trigger'], output1: ['b.trigger'] },
        }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: 1 } }),
        node('b', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 2, value: 1 } }),
      ]);
      eng.inject('external', 'm', 'input');
      if (eng.getDevice('d1', 2, 1) !== 1) throw new Error('第一次应走 output0');
      eng.inject('external', 'm', 'input');
      if (eng.getDevice('d1', 2, 2) !== 1) throw new Error('第二次应走 output1');
    },
  },
  {
    name: 'varSetNumber 写变量,varGet 分支判断',
    fn() {
      const eng = mk([
        node('sv', 'varSetNumber', {
          props: { scope: 'R1', id: 'V1', elements: [{ type: 'const', value: '1' }] },
          outputs: { output: [] },
        }),
        node('gv', 'varGet', {
          props: { scope: 'R1', id: 'V1', operator: '=', v1: 1 },
          outputs: { output: ['a.trigger'], output2: ['b.trigger'] },
        }),
        node('a', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 1, value: 1 } }),
        node('b', 'deviceOutput', { props: { did: 'd1', siid: 2, piid: 2, value: 1 } }),
      ]);
      eng.inject('external', 'sv', 'input');
      if (eng.getVar('R1', 'V1') !== 1) throw new Error('变量未写入');
      eng.inject('external', 'gv', 'input');
      if (eng.getDevice('d1', 2, 1) !== 1) throw new Error('变量=1 应走 output');
    },
  },
];
