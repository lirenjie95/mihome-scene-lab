import { pinType, PIN_ASSUMPTIONS } from '../src/pins.js';

const t = (type, props = {}) => ({ type, props });

export const tests = [
  {
    name: 'deviceInput 含 eiid 视为事件模式 output=event',
    fn() {
      const out = pinType(t('deviceInput', { eiid: 1 }), 'output');
      if (out !== 'event') throw new Error(`应为 event,得到 ${out}`);
    },
  },
  {
    name: 'deviceInput 无 eiid 视为属性模式 output=event|state',
    fn() {
      const out = pinType(t('deviceInput', { siid: 2 }), 'output');
      if (out !== 'event|state') throw new Error(`应为 event|state,得到 ${out}`);
    },
  },
  {
    name: '查询/分支类输出为 event;控制类状态卡输出为双类型',
    fn() {
      if (pinType(t('deviceGet'), 'output') !== 'event') throw new Error('deviceGet.output');
      if (pinType(t('deviceGet'), 'output2') !== 'event') throw new Error('deviceGet.output2');
      if (pinType(t('varGet'), 'output') !== 'event') throw new Error('varGet.output');
      if (pinType(t('condition'), 'met') !== 'event') throw new Error('condition.met');
      if (pinType(t('condition'), 'unmet') !== 'event') throw new Error('condition.unmet');
      if (pinType(t('logicAnd'), 'output') !== 'event|state') throw new Error('logicAnd.output 应为双类型');
      if (pinType(t('logicOr'), 'output') !== 'event|state') throw new Error('logicOr.output 应为双类型');
      if (pinType(t('logicNot'), 'output') !== 'event|state') throw new Error('logicNot.output 应为双类型');
      if (pinType(t('statusLast'), 'output') !== 'event|state') throw new Error('statusLast.output 应为双类型');
      if (pinType(t('register'), 'output') !== 'event|state') throw new Error('register.output 应为双类型');
    },
  },
  {
    name: '事件源与聚合/延时卡输出为 event',
    fn() {
      for (const type of ['alarmClock', 'timeRange', 'onLoad', 'varChange', 'deviceInputSetVar']) {
        const out = pinType(t(type), 'output');
        if (out !== 'event|state' && out !== 'event') throw new Error(`${type}.output 应为 event 或 event|state,得到 ${out}`);
      }
      if (pinType(t('signalOr'), 'output') !== 'event') throw new Error('signalOr.output');
      if (pinType(t('delay'), 'output') !== 'event') throw new Error('delay.output');
      if (pinType(t('eventSequence'), 'output') !== 'event') throw new Error('eventSequence.output');
      if (pinType(t('loop'), 'output') !== 'event') throw new Error('loop.output');
      if (pinType(t('modeSwitch'), 'output0') !== 'event') throw new Error('modeSwitch.output0');
    },
  },
  {
    name: 'counter 输出为双类型 event|state',
    fn() {
      if (pinType(t('counter'), 'output') !== 'event|state') throw new Error('counter.output 应双类型');
    },
  },
  {
    name: '动作/写入 sink 输出为 event',
    fn() {
      for (const type of ['deviceOutput', 'deviceGetSetVar', 'varSetNumber', 'varSetString']) {
        if (pinType(t(type), 'output') !== 'event') throw new Error(`${type}.output`);
      }
    },
  },
  {
    name: '未声明引脚返回 null,未知节点类型返回 event|state',
    fn() {
      if (pinType(t('delay'), 'nope') !== null) throw new Error('未声明引脚应 null');
      if (pinType(t('futureNodeType'), 'output') !== 'event|state') throw new Error('未知类型应 event|state');
    },
  },
  {
    name: '假设说明非空且包含 deviceInput 条目',
    fn() {
      if (!PIN_ASSUMPTIONS.some((s) => s.includes('deviceInput'))) throw new Error('缺少 deviceInput 假设说明');
    },
  },
];
