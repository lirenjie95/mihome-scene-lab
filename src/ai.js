// AI 写场景:构建提示词(内置 xgg 节点目录)与调用 OpenAI 兼容 chat/completions。
import { NODE_PINS, NODE_LABELS, NODE_SEMANTICS, NODE_PROPS, OPERATORS } from './catalog.js';

export function buildSystemPrompt() {
  const pinLines = Object.entries(NODE_PINS)
    .map(([t, p]) => {
      const ins = Object.entries(p.inputs ?? {}).map(([k, v]) => `${k}:${v}`).join(',') || '—';
      const outs = Object.entries(p.outputs ?? {}).map(([k, v]) => `${k}:${v}`).join(',') || '—';
      return `- ${t}(${NODE_LABELS[t] ?? t}) 输入:${ins} 输出:${outs} — ${NODE_SEMANTICS[t] ?? ''}`;
    })
    .join('\n');
  const propLines = Object.entries(NODE_PROPS).map(([t, s]) => `- ${t}: ${s}`).join('\n');
  return [
    '你是米家自动化场景(极客版)JSON 生成器。只输出一个 JSON 对象,不要任何解释、注释或 markdown 代码块。',
    '目标格式(version-2 本地备份载荷):{"version":2,"rules":[...],"variables":{}}',
    '规则 envelope:{"id":"<唯一ID>","cfg":{"id":"<同规则ID>","enable":false,"uiType":"test","userData":{"name":"<场景名>","transform":{"x":0,"y":0,"scale":1,"rotate":0},"lastUpdateTime":0,"version":0}},"nodes":[...]}',
    '每个节点严格六段:{id,type,cfg:{name,version,pos:{x,y,width,height},urn(设备卡)},inputs,outputs,props}。节点 id 只允许 ASCII 字母数字。',
    '边只写在源节点 outputs.<pin>:["目标id.目标pin"];目标 inputs 的值保持 null;每个目标输入最多一条入边;nop 禁止连边。',
    '节点类型与引脚(E=事件,S=状态,B=双类型):\n' + pinLines,
    'canonical props 键位:\n' + propLines,
    `运算符:${OPERATORS.join(' ')}。布尔用 operator:"=",v1:boolean;dtype 用 "boolean"(禁止 "bool")。`,
    '计时节点 props.timeout/interval 为毫秒。alarmClock props 形如 {"type":"periodicAlarm","isSunset":false,"hour":7,"minute":30,"second":0,"filter":{}} 或 {"type":"sunset","isSunset":true,"offset":0,"latitude":31.2,"longitude":121.4,"filter":{}}。timeRange 用 {"start":"HH:MM:SS","end":"HH:MM:SS","filter":{}}。',
    'deviceInput 事件模式必须有 props.eiid 与 arguments(无过滤写 []);属性模式用 siid/piid/dtype/operator/v1。',
    'deviceOutput 写属性用 value;执行音箱/AI 类动作用 aiid+ins:[{piid,value}]。',
    '设备 did 用占位符 "<设备DID>",urn 用空字符串 "";变量 scope 用 "global",id 用 "<变量ID>"。',
    '必须保证至少一个独立触发源(deviceInput/alarmClock/timeRange/onLoad/varChange/deviceInputSetVar)能通过事件路径到达每个动作节点;条件用 deviceGet/varGet 查询,延时用 delay,多路事件用 signalOr。',
  ].join('\n');
}

export function buildMessages(requirement) {
  return [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: `请创建米家自动化场景,需求:${requirement}\n只输出 JSON。` },
  ];
}

export function extractJson(text) {
  let s = String(text ?? '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const first = s.search(/[\[{]/);
  if (first < 0) throw new Error('回复中找不到 JSON');
  const open = s[first];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = first; i < s.length; i += 1) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth += 1;
    else if (c === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(s.slice(first, i + 1));
    }
  }
  throw new Error('JSON 括号不闭合');
}

export async function generateScene({ baseUrl, apiKey, model, requirement, fetchImpl = fetch }) {
  const url = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: buildMessages(requirement), temperature: 0.2 }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`接口返回 ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('接口未返回生成内容');
  return extractJson(content);
}
