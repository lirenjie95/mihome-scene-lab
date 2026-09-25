import { NODE_PINS, NODE_LABELS, NODE_SEMANTICS, NODE_PROPS, buildNodeSkeleton, NODE_TYPE_LIST, OPERATORS } from '../src/catalog.js';
import { normalizePayload } from '../src/model.js';
import { diagnoseRule } from '../src/simulate/diagnose.js';

export const tests = [
  {
    name: '目录覆盖全部 26 种节点(25 执行卡 + nop)',
    fn() {
      for (const type of ['deviceInput', 'deviceInputSetVar', 'deviceGet', 'deviceOutput', 'alarmClock', 'timeRange', 'delay', 'signalOr', 'logicOr', 'logicAnd', 'logicNot', 'condition', 'loop', 'onlyNTimes', 'counter', 'modeSwitch', 'register', 'eventSequence', 'statusLast', 'onLoad', 'deviceGetSetVar', 'varChange', 'varGet', 'varSetNumber', 'varSetString', 'nop']) {
        if (!NODE_LABELS[type]) throw new Error(`缺标签 ${type}`);
        if (!NODE_SEMANTICS[type]) throw new Error(`缺语义 ${type}`);
        if (type !== 'nop' && type !== 'deviceInput' && !NODE_PINS[type]) throw new Error(`缺引脚表 ${type}`);
      }
    },
  },
  {
    name: 'canonical 引脚表关键条目正确',
    fn() {
      const b = NODE_PINS;
      if (b.logicAnd.outputs.output !== 'B' || b.logicOr.outputs.output !== 'B') throw new Error('logic 输出应为 B');
      if (b.register.outputs.output !== 'B' || b.statusLast.outputs.output !== 'B') throw new Error('register/statusLast 应为 B');
      if (b.counter.outputs.output !== 'B') throw new Error('counter 应为 B');
      if (b.condition.inputs.trigger !== 'E' || b.condition.inputs.condition !== 'S') throw new Error('condition 引脚错误');
      if (b.deviceInputSetVar.outputs.output !== 'E') throw new Error('deviceInputSetVar 应为 E');
      if (b.delay.inputs.input !== 'E' || b.loop.inputs.start !== 'E') throw new Error('delay/loop 输入应为 E');
    },
  },
  {
    name: '所有类型都能生成合法六段骨架并可通过诊断解析',
    fn() {
      for (const type of NODE_TYPE_LIST) {
        const sk = buildNodeSkeleton(type, `sk_${type}`);
        if (!sk.id || !sk.type || !sk.cfg || !sk.inputs || !sk.outputs || !sk.props) throw new Error(`${type} 骨架缺段`);
        // 作为规则唯一节点时诊断不抛错(可能报无触发源,属预期)
        diagnoseRule({ nodes: [sk] });
      }
    },
  },
  {
    name: '骨架可进入模板规则并通过规范化',
    fn() {
      const rule = {
        id: 'r1',
        cfg: { id: 'r1', enable: false, uiType: 'test', userData: { name: '骨架测试', transform: {}, lastUpdateTime: 0, version: 0 } },
        nodes: [
          { ...buildNodeSkeleton('deviceInput', 's1'), outputs: { output: ['a1.trigger'] } },
          buildNodeSkeleton('deviceOutput', 'a1'),
        ],
      };
      const p = normalizePayload({ version: 2, rules: [rule], variables: {} });
      if (p.warnings.length !== 0) throw new Error(`警告: ${p.warnings}`);
      const issues = diagnoseRule(rule);
      if (issues.length !== 0) throw new Error(`骨架规则应有 0 issue: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'OPERATORS 包含 canonical 全部运算符',
    fn() {
      for (const op of ['=', '!=', '>', '<', '>=', '<=', 'between', 'include']) {
        if (!OPERATORS.includes(op)) throw new Error(`缺运算符 ${op}`);
      }
    },
  },
];
