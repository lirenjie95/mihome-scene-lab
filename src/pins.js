// 引脚类型查询:依据 catalog.js(xgg node-catalog.md 提炼)与模式判定。
// event=纯事件,state=纯状态,event|state=双类型。
import { NODE_PINS } from './catalog.js';

export const PIN_ASSUMPTIONS = [
  'deviceInput 按 props.eiid 是否存在区分事件模式(event)与属性模式(event|state),未经实机验证',
  'timeRange 输出按 node-catalog 记为双类型;其 end 侧无等价事件属已知缺口',
  '未知节点类型输出按 event|state 保守显示,不阻断渲染',
];

export function pinType(node, pin) {
  if (!node || typeof node !== 'object') return null;
  const type = node.type;
  if (type === 'deviceInput') {
    if (pin === 'output') {
      return node.props && node.props.eiid !== undefined ? 'event' : 'event|state';
    }
    return null;
  }
  const table = NODE_PINS[type];
  if (!table) return 'event|state';
  const t = table.outputs?.[pin];
  if (t === 'E') return 'event';
  if (t === 'S') return 'state';
  if (t === 'B') return 'event|state';
  return null;
}
