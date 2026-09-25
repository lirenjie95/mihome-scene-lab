// 语义假设注册表:依据 xgg graph-model.md「静态契约不能替代的运行探针」清单。
export const ASSUMPTIONS = [
  {
    id: 'delay-repeat',
    label: 'delay 重复触发策略',
    detail: '新事件在延时未结束时到达 delay 时,是排队还是重置计时',
    evidence: 'xgg 探针清单:delay 新事件覆盖/排队/并行未经实测',
    defaultChoice: 'each',
    choices: ['each', 'restart'],
  },
  {
    id: 'statuslast-false',
    label: 'statusLast 的 false 取消时机',
    detail: '保持时长未满足时输入变 false,计时是否取消/复位',
    evidence: 'xgg 探针清单:false 是否取消/复位计时及精确时点必须实机验证',
    defaultChoice: 'cancel',
    choices: ['cancel', 'keep'],
  },
  {
    id: 'counter-edge',
    label: 'counter 阈值边界',
    detail: '第 N 个事件到达时输出,还是第 N+1 个;阈值后计数保持还是复位',
    evidence: 'xgg 探针清单:第 N/N+1、阈值后行为未经实测',
    defaultChoice: 'at-n-keep',
    choices: ['at-n-keep', 'at-n-reset'],
  },
  {
    id: 'condition-empty',
    label: 'condition 未接状态走 unmet',
    detail: 'condition.condition 悬空时,trigger 事件走 met 还是 unmet',
    evidence: 'xgg 实测证据:空 condition 在 trigger 时走 unmet(限定固件,需复验)',
    defaultChoice: 'unmet',
    choices: ['unmet', 'met'],
  },
  {
    id: 'timerange-end',
    label: 'timeRange 无 end 事件',
    detail: '时间窗结束时不产生等价 end 事件,仅窗口状态翻转',
    evidence: 'xgg 实测证据:观察到 start 事件+窗口 state,未见等价 end event',
    defaultChoice: 'no-end-event',
    choices: ['no-end-event', 'emit-end-event'],
  },
  {
    id: 'loop-first-tick',
    label: 'loop 首 tick 时机',
    detail: 'start 后首个 output 是立即还是等一个 interval',
    evidence: 'xgg 探针清单:首 tick、重复 start 与竞态需目标环境探针',
    defaultChoice: 'after-interval',
    choices: ['after-interval', 'immediate'],
  },
  {
    id: 'deviceinput-mode',
    label: 'deviceInput 模式判定',
    detail: '按 props.eiid 是否存在区分事件/属性模式',
    evidence: '一期 pins.js 同源假设,未经实机验证',
    defaultChoice: 'by-eiid',
    choices: ['by-eiid'],
  },
  {
    id: 'register-persist',
    label: 'register 初始状态',
    detail: 'register 静态初值按 false 建模(重启后持久性未知)',
    evidence: 'xgg:静态可达性把 register 初始状态建模为 false,属保守分析假设',
    defaultChoice: 'false',
    choices: ['false', 'true'],
  },
];

const choices = new Map(ASSUMPTIONS.map((a) => [a.id, a.defaultChoice]));

export function getChoice(id) {
  return choices.get(id) ?? ASSUMPTIONS.find((a) => a.id === id)?.defaultChoice ?? null;
}

export function setChoice(id, value) {
  const a = ASSUMPTIONS.find((x) => x.id === id);
  if (!a) throw new Error(`未知假设: ${id}`);
  if (!a.choices.includes(value)) throw new Error(`假设 ${id} 不接受选项 ${value}`);
  choices.set(id, value);
}
