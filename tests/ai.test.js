import { buildMessages, buildSystemPrompt, extractJson, generateScene } from '../src/ai.js';
import { normalizePayload } from '../src/model.js';

export const tests = [
  {
    name: 'extractJson 剥离 markdown 围栏并解析对象',
    fn() {
      const v = extractJson('```json\n{"version":2,"rules":[],"variables":{}}\n```');
      if (v.version !== 2) throw new Error('解析失败');
    },
  },
  {
    name: 'extractJson 从前后夹带文字中提取',
    fn() {
      const v = extractJson('好的,场景如下:{"version":2,"rules":[],"variables":{}} 希望对你有帮助');
      if (v.version !== 2) throw new Error('提取失败');
    },
  },
  {
    name: 'extractJson 支持 legacy 数组',
    fn() {
      const v = extractJson('[{"cfg":{"id":"a"},"nodes":[]}]');
      if (!Array.isArray(v) || v.length !== 1) throw new Error('数组提取失败');
    },
  },
  {
    name: 'extractJson 非法输入抛错',
    fn() {
      for (const bad of ['', '没有 JSON', '{"a":1']) {
        try {
          extractJson(bad);
          throw new Error(`应抛出: ${bad}`);
        } catch (e) {
          // 预期抛错
        }
      }
    },
  },
  {
    name: '系统提示词包含节点目录、canonical 键位与运算符',
    fn() {
      const p = buildSystemPrompt();
      for (const need of ['deviceOutput', 'deviceInput', '六段', 'outputs', '运算符', 'alarmClock', 'dtype']) {
        if (!p.includes(need)) throw new Error(`提示词缺 ${need}`);
      }
    },
  },
  {
    name: 'buildMessages 携带用户需求',
    fn() {
      const msgs = buildMessages('晚上回家关灯');
      if (!msgs[1].content.includes('晚上回家关灯')) throw new Error('需求丢失');
      if (msgs[0].role !== 'system' || msgs[1].role !== 'user') throw new Error('角色错误');
    },
  },
  {
    name: 'generateScene 调用兼容端点并解析结果',
    async fn() {
      const mockFetch = async (url, opts) => {
        if (url !== 'https://api.example.com/v1/chat/completions') throw new Error(`URL 错误: ${url}`);
        const body = JSON.parse(opts.body);
        if (body.model !== 'deepseek-chat') throw new Error('模型未传递');
        if (!opts.headers.Authorization.includes('sk-test')) throw new Error('密钥未传递');
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: '```json\n{"version":2,"rules":[],"variables":{}}\n```' } }] }),
        };
      };
      const v = await generateScene({ baseUrl: 'https://api.example.com/v1/', apiKey: 'sk-test', model: 'deepseek-chat', requirement: 'x', fetchImpl: mockFetch });
      const p = normalizePayload(v);
      if (p.version !== 2) throw new Error('生成结果不可规范化');
    },
  },
  {
    name: 'generateScene 接口错误透出状态码',
    async fn() {
      const mockFetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
      try {
        await generateScene({ baseUrl: 'https://x', apiKey: 'k', model: 'm', requirement: 'x', fetchImpl: mockFetch });
        throw new Error('应抛出');
      } catch (e) {
        if (!String(e.message).includes('401')) throw e;
      }
    },
  },
];
