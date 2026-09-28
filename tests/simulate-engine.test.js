import { Engine } from '../src/simulate/engine.js';

export const tests = [
  {
    name: 'schedule 按时间升序排队,advanceTime 依序处理',
    fn() {
      const eng = new Engine({ nodes: [] });
      eng.schedule(500, 'x', 'n1', 'input');
      eng.schedule(100, 'x', 'n2', 'input');
      if (eng.queue[0].t !== 100 || eng.queue[1].t !== 500) throw new Error('队列未排序');
      eng.advanceTime(200);
      if (eng.time !== 200) throw new Error(`time=${eng.time}`);
      if (eng.queue.length !== 1 || eng.queue[0].t !== 500) throw new Error('应剩 500 事件');
    },
  },
  {
    name: 'step 处理队首并把 time 推进到事件时间',
    fn() {
      const eng = new Engine({ nodes: [] });
      eng.schedule(1000, 'x', 'n1', 'input');
      const out = eng.step();
      if (!out || out.t !== 1000 || eng.time !== 1000) throw new Error('step 推进错误');
    },
  },
  {
    name: 'setDevice/getDevice 与 setVar/getVar 往返',
    fn() {
      const eng = new Engine({ nodes: [] });
      eng.setDevice('d1', 2, 1, true);
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('设备值往返失败');
      eng.setVar('R1', 'V1', 5);
      if (eng.getVar('R1', 'V1') !== 5) throw new Error('变量往返失败');
    },
  },
  {
    name: '事件日志记录注入与状态变化',
    fn() {
      const eng = new Engine({ nodes: [] });
      eng.setDevice('d1', 2, 1, false);
      eng.inject('external', 'nope', 'input');
      if (!eng.log.some((l) => l.kind === 'state' && l.text.includes('d1'))) throw new Error('缺状态日志');
      if (eng.trace.length !== 1) throw new Error('注入应产生 trace 条目');
    },
  },
  {
    name: 'setTimeRange 进入时向动作下游发事件',
    fn() {
      const eng = new Engine({
        nodes: [
          { id: 'tr', type: 'timeRange', cfg: { pos: {} }, inputs: {}, outputs: { output: ['a.trigger'] }, props: { start: '00:00:00', end: '23:59:59' } },
          { id: 'a', type: 'deviceOutput', cfg: { pos: {} }, inputs: { trigger: null }, outputs: {}, props: { did: 'd1', siid: 2, piid: 1, value: true } },
        ],
      });
      eng.setTimeRange('tr', true);
      if (eng.getDevice('d1', 2, 1) !== true) throw new Error('进入时间窗应触发动作');
    },
  },
  {
    name: 'setTimeRange 离开时只更新状态,不向动作下游发事件',
    fn() {
      const eng = new Engine({
        nodes: [
          { id: 'tr', type: 'timeRange', cfg: { pos: {} }, inputs: {}, outputs: { output: ['a.trigger'] }, props: { start: '00:00:00', end: '23:59:59' } },
          { id: 'a', type: 'deviceOutput', cfg: { pos: {} }, inputs: { trigger: null }, outputs: {}, props: { did: 'd1', siid: 2, piid: 1, value: true } },
        ],
      });
      eng.setTimeRange('tr', true);
      eng.setTimeRange('tr', false);
      if (!eng.log.some((l) => l.text.includes('离开'))) throw new Error('缺离开日志');
      const actions = eng.log.filter((l) => l.kind === 'action').length;
      if (actions !== 1) throw new Error(`动作应只执行一次: ${actions}`);
    },
  },
];
