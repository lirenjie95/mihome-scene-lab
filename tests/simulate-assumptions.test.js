import { ASSUMPTIONS, getChoice, setChoice } from '../src/simulate/assumptions.js';

export const tests = [
  {
    name: '注册表覆盖 xgg 探针清单全部条目',
    fn() {
      const ids = new Set(ASSUMPTIONS.map((a) => a.id));
      for (const id of ['delay-repeat', 'statuslast-false', 'counter-edge', 'condition-empty', 'timerange-end', 'loop-first-tick', 'register-persist']) {
        if (!ids.has(id)) throw new Error(`缺少假设 ${id}`);
      }
    },
  },
  {
    name: '默认取 defaultChoice,setChoice 校验选项',
    fn() {
      const a = ASSUMPTIONS.find((x) => x.id === 'delay-repeat');
      if (getChoice('delay-repeat') !== a.defaultChoice) throw new Error('默认值不符');
      setChoice('delay-repeat', 'restart');
      if (getChoice('delay-repeat') !== 'restart') throw new Error('切换失败');
      try {
        setChoice('delay-repeat', 'bogus');
        throw new Error('应拒绝非法选项');
      } catch (e) {
        if (!String(e.message).includes('不接受')) throw e;
      }
      setChoice('delay-repeat', a.defaultChoice);
    },
  },
  {
    name: '未知假设抛错',
    fn() {
      try {
        setChoice('nope', 'x');
        throw new Error('应抛出');
      } catch (e) {
        if (!String(e.message).includes('未知假设')) throw e;
      }
    },
  },
];
