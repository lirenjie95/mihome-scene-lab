import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeBackup } from '../src/parse.js';
import { Engine } from '../src/simulate/engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const bytes = new Uint8Array(readFileSync(join(here, 'fixtures', 'home-sanitized.bak')));

const findNode = (rule, type, pred) => rule.nodes.find((n) => n.type === type && (!pred || pred(n)));

export const tests = [
  {
    name: '脱敏回家.bak 可解码并构造引擎',
    async fn() {
      const decoded = await decodeBackup(bytes);
      const rule = decoded.value.rules[0];
      const eng = new Engine(rule);
      if (eng.nodes.length !== 25) throw new Error(`节点数 ${eng.nodes.length}`);
      const src = findNode(rule, 'deviceInput', (n) => n.props?.eiid !== undefined);
      if (!src) throw new Error('应有 deviceInput 事件源');
    },
  },
  {
    name: '“回家”触发链:关摄像头 + 30 秒后小爱 AI 回复',
    async fn() {
      const decoded = await decodeBackup(bytes);
      const rule = decoded.value.rules[0];
      const eng = new Engine(rule);
      const src = findNode(rule, 'deviceInput', (n) => n.props?.eiid !== undefined);
      eng.inject('external', src.id, 'input');
      if (eng.getDevice('1000000001', 2, 1) !== false) throw new Error('摄像头未关闭');
      eng.advanceTime(30000);
      const ai = findNode(rule, 'deviceOutput', (n) => n.props?.ins?.[0]?.value?.includes('AI'));
      if (!ai) throw new Error('缺 AI 回复动作节点');
      const fired = eng.trace.flatMap((t) => t.fired.map((f) => f.nodeId));
      if (!fired.includes(ai.id)) throw new Error('30 秒后 AI 回复节点未触发');
    },
  },
  {
    name: '温度分支:>27 执行除湿动作,<19 执行制热动作',
    async fn() {
      const decoded = await decodeBackup(bytes);
      const rule = decoded.value.rules[0];
      const sensor = findNode(rule, 'deviceGet', (n) => n.props?.v1 === 27);
      const heat = findNode(rule, 'deviceOutput', (n) => n.props?.ins?.[0]?.value?.includes('制热'));
      const dry = findNode(rule, 'deviceOutput', (n) => n.props?.ins?.[0]?.value?.includes('除湿'));
      const sensorDid = sensor.props.did;

      const hot = new Engine(rule);
      hot.setDevice(sensorDid, 3, 1001, 28);
      hot.inject('external', sensor.id, 'input');
      const hotFired = hot.trace.flatMap((t) => t.fired.map((f) => f.nodeId));
      if (!hotFired.includes(dry.id)) throw new Error('>27 应触发除湿动作');
      if (hotFired.includes(heat.id)) throw new Error('>27 不应触发制热');

      const cold = new Engine(rule);
      cold.setDevice(sensorDid, 3, 1001, 18);
      cold.inject('external', sensor.id, 'input');
      const coldFired = cold.trace.flatMap((t) => t.fired.map((f) => f.nodeId));
      if (!coldFired.includes(heat.id)) throw new Error('<19 应触发制热动作');
    },
  },
  {
    name: '日落变量链:时段=0 时 varGet 放行夜间动作(关窗帘)',
    async fn() {
      const decoded = await decodeBackup(bytes);
      const rule = decoded.value.rules[0];
      const eng = new Engine(rule);
      const varGet = findNode(rule, 'varGet', (n) => n.props?.v1 === 0);
      const src = findNode(rule, 'deviceInput', (n) => n.props?.eiid !== undefined);
      eng.setVar('R1790303088195', 'VodjZRPVOyZ', 0);
      eng.inject('external', src.id, 'input');
      const fired = eng.trace.flatMap((t) => t.fired.map((f) => f.nodeId));
      if (!fired.includes(varGet.id)) throw new Error('varGet 应被触发');
      const curtain = findNode(rule, 'deviceOutput', (n) => n.props?.aiid === 1 && n.props?.ins?.[0]?.value?.includes('窗帘'));
      if (!curtain || !fired.includes(curtain.id)) throw new Error('夜间应执行关窗帘');
    },
  },
];
