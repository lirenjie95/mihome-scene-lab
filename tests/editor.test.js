import { newSceneTemplate, payloadToText, textToPayload } from '../src/editor.js';
import { normalizePayload } from '../src/model.js';
import { diagnoseRule } from '../src/simulate/diagnose.js';

export const tests = [
  {
    name: '模板结构合法:version 2、1 规则 2 节点、可规范化',
    fn() {
      const t = newSceneTemplate();
      if (t.version !== 2) throw new Error('version 应为 2');
      if (t.rules.length !== 1) throw new Error('规则数应为 1');
      if (t.rules[0].nodes.length !== 2) throw new Error('节点数应为 2');
      const p = normalizePayload(t);
      if (p.warnings.length !== 0) throw new Error(`模板不应有警告: ${p.warnings}`);
    },
  },
  {
    name: '模板可通过静态诊断(触发源可达动作)',
    fn() {
      const t = newSceneTemplate();
      const issues = diagnoseRule(t.rules[0]);
      if (issues.length !== 0) throw new Error(`模板应有 0 issue: ${JSON.stringify(issues)}`);
    },
  },
  {
    name: 'payloadToText/textToPayload 往返',
    fn() {
      const t = newSceneTemplate();
      const back = textToPayload(payloadToText(t));
      if (JSON.stringify(back) !== JSON.stringify(t)) throw new Error('往返不一致');
    },
  },
  {
    name: 'textToPayload 接受 legacy 数组',
    fn() {
      const back = textToPayload('[{"cfg":{"id":"a"},"nodes":[]}]');
      if (!Array.isArray(back) || back.length !== 1) throw new Error('legacy 数组解析失败');
    },
  },
  {
    name: '非法 JSON 抛错',
    fn() {
      try {
        textToPayload('{oops');
        throw new Error('应抛出');
      } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
      }
    },
  },
];
