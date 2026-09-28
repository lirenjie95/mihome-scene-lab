// 节点级 props 校验:依据 catalog.js 的 canonical 键位与 device-semantics.md 的运算符-数据类型词汇表。
const OP_BY_DTYPE = {
  boolean: ['='],
  string: ['='],
  float: ['>', '<', 'between'],
  int: ['=', '!=', '>', '<', '>=', '<=', 'between', 'include'],
  number: ['=', '!=', '>', '<', '>=', '<=', 'between', 'include'],
};

export function validateNode(node) {
  const issues = [];
  const t = node.type;
  const p = node.props ?? {};
  const push = (level, text) => issues.push({ nodeId: node.id, level, text });
  switch (t) {
    case 'deviceInput': {
      if (p.eiid !== undefined) {
        if (p.did === undefined) push('error', 'deviceInput 事件模式缺少 did');
        if (!Array.isArray(p.arguments)) push('error', 'deviceInput 事件模式缺少 arguments 数组(无过滤写 [])');
      } else {
        checkCompare(node, p, push);
      }
      break;
    }
    case 'deviceGet': {
      checkCompare(node, p, push);
      break;
    }
    case 'deviceInputSetVar': {
      if (p.eiid === undefined) checkCompare(node, p, push);
      else if (!Array.isArray(p.arguments)) push('error', 'deviceInputSetVar 事件模式缺少 arguments 数组');
      if (p.scope === undefined || p.id === undefined) push('error', 'deviceInputSetVar 缺少 scope/id');
      break;
    }
    case 'deviceGetSetVar': {
      checkCompare(node, p, push);
      if (p.scope === undefined || p.id === undefined) push('error', 'deviceGetSetVar 缺少 scope/id');
      break;
    }
    case 'deviceOutput': {
      if (Array.isArray(p.ins) && p.ins.length > 0) {
        if (p.aiid === undefined) push('error', 'deviceOutput 动作模式缺少 aiid');
      } else {
        if (p.did === undefined || p.siid === undefined || p.piid === undefined) {
          push('error', 'deviceOutput 缺少 did/siid/piid');
        }
        const hasValue = p.value !== undefined;
        const hasVar = p.scope !== undefined && p.id !== undefined;
        if (!hasValue && !hasVar) push('error', 'deviceOutput 需要 value 字面量或 scope+id 变量引用');
      }
      break;
    }
    case 'delay':
    case 'statusLast':
    case 'eventSequence': {
      if (typeof p.timeout !== 'number') push('error', `${t} 缺少数值型 timeout(毫秒)`);
      else if (t !== 'delay' && p.timeout <= 0) push('error', `${t} 的 timeout 必须大于 0`);
      break;
    }
    case 'loop': {
      if (typeof p.interval !== 'number') push('error', 'loop 缺少数值型 interval(毫秒)');
      break;
    }
    case 'onlyNTimes':
    case 'counter': {
      if (typeof p.n !== 'number' || !Number.isInteger(p.n) || p.n < 1) push('error', `${t} 的 n 必须是 ≥1 的整数`);
      break;
    }
    case 'varChange':
    case 'varGet': {
      checkVarCompare(node, p, push);
      break;
    }
    case 'varSetNumber':
    case 'varSetString': {
      if (p.scope === undefined || p.id === undefined) push('error', `${t} 缺少 scope/id`);
      if (!Array.isArray(p.elements)) push('error', `${t} 缺少 elements 数组`);
      break;
    }
    default:
      break;
  }
  return issues;
}

function checkCompare(node, p, push) {
  if (p.did === undefined || p.siid === undefined || p.piid === undefined) {
    push('error', `${node.type} 缺少 did/siid/piid`);
  }
  checkOperator(node, p, push);
}

function checkVarCompare(node, p, push) {
  if (p.scope === undefined || p.id === undefined) push('error', `${node.type} 缺少 scope/id`);
  checkOperator(node, p, push);
}

function checkOperator(node, p, push) {
  const dtype = p.dtype ?? p.varType;
  if (dtype === 'bool') {
    push('error', 'dtype 应为 "boolean",不能是 "bool"');
    return;
  }
  if (!p.operator) return;
  const allowed = OP_BY_DTYPE[dtype];
  if (allowed && !allowed.includes(p.operator)) {
    push('error', `${node.type} dtype=${dtype} 不允许运算符 ${p.operator}(允许:${allowed.join(',')})`);
  }
  if (p.operator === 'between' && p.v2 === undefined) push('error', 'between 必须同时给出 v1 与 v2');
  if (p.operator === 'include' && !Array.isArray(p.v1)) push('error', 'include 的 v1 必须是数组');
}

export function validateRule(rule) {
  return (rule.nodes ?? []).flatMap((n) => validateNode(n));
}
