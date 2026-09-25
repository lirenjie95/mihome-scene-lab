// 节点目录:依据 xgg node-catalog.md(GPL-3.0,已获授权使用其内容)提炼。
// E=event,S=state/status,B=event|state(源侧通配)。
// 用途:引脚校验、编辑器节点骨架、AI 提示词构建。

export const NODE_LABELS = {
  deviceInput: '设备事件/状态',
  deviceInputSetVar: '设备事件+变量',
  deviceGet: '查询设备',
  varGet: '查询变量',
  varChange: '变量变化',
  condition: '条件分支',
  signalOr: '任一信号',
  logicAnd: '逻辑与',
  logicOr: '逻辑或',
  logicNot: '逻辑非',
  statusLast: '保持时长',
  register: '状态记忆',
  delay: '延时',
  eventSequence: '顺序事件',
  loop: '循环',
  onlyNTimes: '限次放行',
  counter: '计数器',
  modeSwitch: '轮转输出',
  alarmClock: '定时/日出日落',
  timeRange: '时间段',
  onLoad: '启用时触发',
  deviceOutput: '执行动作',
  deviceGetSetVar: '查询+变量',
  varSetNumber: '变量赋值(数字)',
  varSetString: '变量赋值(文本)',
  nop: '备注',
};

export const NODE_PINS = {
  deviceGet: { inputs: { input: 'E' }, outputs: { output: 'E', output2: 'E' } },
  deviceOutput: { inputs: { trigger: 'E' }, outputs: { output: 'E' } },
  alarmClock: { inputs: {}, outputs: { output: 'E' } },
  timeRange: { inputs: {}, outputs: { output: 'B' } },
  delay: { inputs: { input: 'E' }, outputs: { output: 'E' } },
  signalOr: { inputs: { input0: 'E', input1: 'E' }, outputs: { output: 'E' } },
  logicOr: { inputs: { input0: 'S', input1: 'S' }, outputs: { output: 'B' } },
  logicAnd: { inputs: { input0: 'S', input1: 'S' }, outputs: { output: 'B' } },
  logicNot: { inputs: { input: 'S' }, outputs: { output: 'B' } },
  condition: { inputs: { trigger: 'E', condition: 'S' }, outputs: { met: 'E', unmet: 'E' } },
  loop: { inputs: { start: 'E', stop: 'E' }, outputs: { output: 'E' } },
  onlyNTimes: { inputs: { input: 'E', zero: 'E' }, outputs: { output: 'E' } },
  counter: { inputs: { input: 'E', zero: 'E' }, outputs: { output: 'B' } },
  modeSwitch: { inputs: { input: 'E' }, outputs: { output0: 'E', output1: 'E' } },
  register: { inputs: { setTrue: 'E', setFalse: 'E' }, outputs: { output: 'B' } },
  eventSequence: { inputs: { input1: 'E', input2: 'E' }, outputs: { output: 'E' } },
  statusLast: { inputs: { input: 'S' }, outputs: { output: 'B' } },
  onLoad: { inputs: {}, outputs: { output: 'E' } },
  deviceInputSetVar: { inputs: {}, outputs: { output: 'E' } },
  deviceGetSetVar: { inputs: { input: 'E' }, outputs: { output: 'E' } },
  varChange: { inputs: {}, outputs: { output: 'B' } },
  varGet: { inputs: { input: 'E' }, outputs: { output: 'E', output2: 'E' } },
  varSetNumber: { inputs: { input: 'E' }, outputs: { output: 'E' } },
  varSetString: { inputs: { input: 'E' }, outputs: { output: 'E' } },
  // deviceInput 按模式:property → output:B;event → output:E(props.eiid 存在)
  deviceInput: { inputs: {}, outputs: { output: 'B' } },
  nop: { inputs: {}, outputs: {} },
};

export const NODE_SEMANTICS = {
  deviceInput: '属性模式订阅状态比较;事件模式匹配设备事件(含 eiid+arguments)',
  deviceGet: '收到事件时查询设备属性,满足走 output,不满足走 output2',
  deviceOutput: '写设备属性(value)或执行动作(aiid+ins);可串接 output',
  alarmClock: '定时/日出日落事件源(props.type=periodicAlarm|sunset)',
  timeRange: '时间窗状态源,窗口开始发事件、窗口状态持续',
  delay: '把事件延后 props.timeout 毫秒',
  signalOr: '任一 input 事件到达即输出',
  logicOr: '任一状态输入为真则输出',
  logicAnd: '全部状态输入为真才输出',
  logicNot: '状态反相',
  condition: 'trigger 事件到达时读 condition 状态,走 met/unmet',
  loop: 'start 后每 interval 输出,stop 停止',
  onlyNTimes: 'reset 窗口内只放行前 N 个事件;zero 复位',
  counter: '统计输入事件,达到阈值 props.n 输出;zero 清零',
  modeSwitch: '每次输入轮换到下一个连续输出引脚',
  register: 'setTrue/setFalse 控制图内布尔锁存',
  eventSequence: 'input1 后 input2 且间隔不超 timeout 才输出',
  statusLast: '状态持续保持 props.timeout 才输出',
  onLoad: '场景启用时触发的事件源',
  deviceInputSetVar: '设备事件同时把参数写入变量',
  deviceGetSetVar: '查询设备属性并写入变量',
  varChange: '变量比较状态源',
  varGet: '收到事件时查询变量,满足走 output,不满足走 output2',
  varSetNumber: '数字变量赋值(elements 表达式)',
  varSetString: '字符串变量赋值(elements 表达式)',
  nop: '画布备注,不执行,禁止连边',
};

// canonical props 键位(逐类 cfg/props wire 键)
export const NODE_PROPS = {
  'deviceInput property': 'did,siid,piid,dtype,operator,v1[,v2],preload',
  'deviceInput event': 'did,siid,eiid,arguments:[{piid,dtype,operator,v1[,v2]}](无过滤为 [])',
  deviceGet: 'did,siid,piid,dtype,operator,v1[,v2]',
  'deviceOutput property': 'did,siid,piid + value(字面量)或 scope,id,dtype(变量)',
  'deviceOutput action': 'did,siid,aiid,ins:[{piid,value}|{piid,scope,id,dtype,...}]',
  'deviceInputSetVar property': 'did,siid,piid,dtype,scope,id,preload',
  'deviceInputSetVar event': 'did,siid,eiid,arguments:[{piid,dtype,scope,id}]',
  deviceGetSetVar: 'did,siid,piid,dtype,scope,id',
  alarmClock: 'periodicAlarm:{hour,minute,second} 或 sunset:{isSunset,offset(分钟),latitude,longitude};filter:{}|{inHoliday:bool}|{day:[0..6]}',
  timeRange: 'start,end,filter[,mingTextShow]',
  delay: 'props.timeout 毫秒;cfg.unit/value(canonical ms|s|min|hour)',
  statusLast: 'props.timeout 毫秒(≥1);cfg.unit/value',
  eventSequence: 'props.timeout 毫秒(≥1);cfg.unit/value',
  loop: 'props.interval 毫秒;cfg.unit/value',
  onlyNTimes: 'props.n(≥1)',
  counter: 'props.n(≥1)',
  signalOr: 'props {};动态 inputs 连续 input0..N-1',
  logicOr: 'props {};动态 inputs 连续 input0..N-1',
  logicAnd: 'props {};动态 inputs 连续 input0..N-1',
  logicNot: 'props {}',
  condition: 'props {}',
  onLoad: 'props {}',
  register: 'props {}',
  modeSwitch: 'props {};动态 outputs 连续 output0..N-1',
  varChange: 'scope,id,varType,preload,operator,v1[,v2]',
  varGet: 'scope,id,varType,operator,v1[,v2]',
  varSetNumber: 'scope,id,elements',
  varSetString: 'scope,id,elements',
  nop: 'props {};cfg.contents(Quill)与 cfg.background',
};

export const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'between', 'include'];

const POS = { x: 0, y: 0, width: 220, height: 110 };

function base(id, type, extra = {}) {
  return {
    id,
    type,
    cfg: { name: type, version: 1, pos: { ...POS }, ...(extra.urn !== undefined ? { urn: extra.urn } : {}) },
    inputs: extra.inputs ?? {},
    outputs: extra.outputs ?? { output: [] },
    props: extra.props ?? {},
  };
}

// canonical 六段节点骨架(占位符需使用者替换)
export function buildNodeSkeleton(type, id, did = '<设备DID>', urn = '') {
  switch (type) {
    case 'deviceInput': // event 模式骨架
      return base(id, type, {
        urn,
        outputs: { output: [] },
        props: { did, siid: 2, eiid: 1, arguments: [] },
      });
    case 'deviceGet':
      return base(id, type, {
        urn,
        inputs: { input: null },
        outputs: { output: [], output2: [] },
        props: { did, siid: 3, piid: 1, dtype: 'float', operator: '>', v1: 0 },
      });
    case 'deviceOutput':
      return base(id, type, {
        urn,
        inputs: { trigger: null },
        outputs: { output: [] },
        props: { did, siid: 2, piid: 1, value: true },
      });
    case 'deviceInputSetVar':
      return base(id, type, {
        urn,
        outputs: { output: [] },
        props: { did, siid: 2, piid: 1, dtype: 'boolean', scope: 'global', id: '<变量ID>', preload: false },
      });
    case 'deviceGetSetVar':
      return base(id, type, {
        urn,
        inputs: { input: null },
        outputs: { output: [] },
        props: { did, siid: 3, piid: 1, dtype: 'float', scope: 'global', id: '<变量ID>' },
      });
    case 'alarmClock':
      return base(id, type, {
        outputs: { output: [] },
        props: { type: 'periodicAlarm', isSunset: false, hour: 7, minute: 30, second: 0, filter: {} },
      });
    case 'timeRange':
      return base(id, type, {
        outputs: { output: [] },
        props: { start: '00:00:00', end: '23:59:59', filter: {} },
      });
    case 'delay':
      return base(id, type, {
        cfg: { name: type, version: 1, pos: { ...POS }, unit: 's', value: 5 },
        inputs: { input: null },
        outputs: { output: [] },
        props: { timeout: 5000 },
      });
    case 'statusLast':
      return base(id, type, {
        cfg: { name: type, version: 1, pos: { ...POS }, unit: 's', value: 5 },
        inputs: { input: null },
        outputs: { output: [] },
        props: { timeout: 5000 },
      });
    case 'eventSequence':
      return base(id, type, {
        cfg: { name: type, version: 1, pos: { ...POS }, unit: 'min', value: 5 },
        inputs: { input1: null, input2: null },
        outputs: { output: [] },
        props: { timeout: 300000 },
      });
    case 'loop':
      return base(id, type, {
        cfg: { name: type, version: 1, pos: { ...POS }, unit: 's', value: 10 },
        inputs: { start: null, stop: null },
        outputs: { output: [] },
        props: { interval: 10000 },
      });
    case 'signalOr':
    case 'logicAnd':
    case 'logicOr':
      return base(id, type, {
        inputs: { input0: null, input1: null },
        outputs: { output: [] },
        props: {},
      });
    case 'logicNot':
      return base(id, type, { inputs: { input: null }, outputs: { output: [] }, props: {} });
    case 'condition':
      return base(id, type, {
        inputs: { trigger: null, condition: null },
        outputs: { met: [], unmet: [] },
        props: {},
      });
    case 'onlyNTimes':
    case 'counter':
      return base(id, type, {
        inputs: { input: null, zero: null },
        outputs: { output: [] },
        props: { n: 1 },
      });
    case 'modeSwitch':
      return base(id, type, {
        inputs: { input: null },
        outputs: { output0: [], output1: [] },
        props: {},
      });
    case 'register':
      return base(id, type, {
        inputs: { setTrue: null, setFalse: null },
        outputs: { output: [] },
        props: {},
      });
    case 'onLoad':
      return base(id, type, { outputs: { output: [] }, props: {} });
    case 'varChange':
      return base(id, type, {
        outputs: { output: [] },
        props: { scope: 'global', id: '<变量ID>', varType: 'number', operator: '=', v1: 0, preload: false },
      });
    case 'varGet':
      return base(id, type, {
        inputs: { input: null },
        outputs: { output: [], output2: [] },
        props: { scope: 'global', id: '<变量ID>', varType: 'number', operator: '=', v1: 0 },
      });
    case 'varSetNumber':
      return base(id, type, {
        inputs: { input: null },
        outputs: { output: [] },
        props: { scope: 'global', id: '<变量ID>', elements: [{ type: 'const', value: '0' }] },
      });
    case 'varSetString':
      return base(id, type, {
        inputs: { input: null },
        outputs: { output: [] },
        props: { scope: 'global', id: '<变量ID>', elements: [{ type: 'const', value: '' }] },
      });
    case 'nop':
      return {
        id,
        type,
        cfg: { pos: { x: 0, y: 0, width: 320, height: 60 }, contents: '', background: '#80CAFF' },
        inputs: {},
        outputs: { output: [] },
        props: {},
      };
    default:
      throw new Error(`未知节点类型: ${type}`);
  }
}

export const NODE_TYPE_LIST = Object.keys(NODE_LABELS);
