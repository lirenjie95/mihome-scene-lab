// 型号 → 中文名。来源逐条注释;新增条目请附带来源(PR 贡献见 README)。
const DICT = {
  // 来源:home.miot-spec.com(设计文档第 10 节)
  'chuangmi-039c01': { name: '小米智能摄像机2 云台版', category: '摄像机' },
  'xiaomi-w2': { name: '小米智能开关(双开)', category: '开关' },
  'xiaomi-oh2p': { name: 'Xiaomi 智能音箱 Pro', category: '音箱' },
  // 来源:mi-gpt compatibility.md(各型号附 home.miot-spec.com 链接)
  'xiaomi-oh2': { name: 'Xiaomi 智能音箱', category: '音箱' },
  'xiaomi-lx06': { name: '小爱音箱 Pro', category: '音箱' },
  'xiaomi-s12': { name: '小米 AI 音箱', category: '音箱' },
  'xiaomi-l15a': { name: '小米 AI 音箱(第二代)', category: '音箱' },
  'xiaomi-lx5a': { name: '小爱音箱 万能遥控版', category: '音箱' },
  'xiaomi-lx05': { name: '小爱音箱 Play(2019 款)', category: '音箱' },
  'xiaomi-x10a': { name: '小爱智能家庭屏 10', category: '音箱' },
  'xiaomi-l17a': { name: 'Xiaomi Sound Pro', category: '音箱' },
  'xiaomi-l06a': { name: '小爱音箱', category: '音箱' },
  'xiaomi-lx01': { name: '小爱音箱 mini', category: '音箱' },
  'xiaomi-l05b': { name: '小爱音箱 Play', category: '音箱' },
  'xiaomi-l05c': { name: '小米小爱音箱 Play 增强版', category: '音箱' },
  'xiaomi-l09a': { name: '小爱音箱 Art', category: '音箱' },
  'xiaomi-lx04': { name: '小爱触屏音箱', category: '音箱' },
  'xiaomi-x4b': { name: 'Xiaomi 智能家庭屏 Mini', category: '音箱' },
  'xiaomi-x6a': { name: 'Xiaomi 智能家庭屏 6', category: '音箱' },
  'xiaomi-x08e': { name: 'Redmi 小爱触屏音箱 Pro 8 英寸', category: '音箱' },
  'xiaomi-x8f': { name: 'Xiaomi 智能家庭屏 Pro 8', category: '音箱' },
};

// urn 品类段 → 中文品类
const CATEGORY_CN = {
  camera: '摄像机',
  switch: '开关',
  speaker: '音箱',
  gateway: '网关',
  outlet: '插座',
  'temperature-humidity-sensor': '温湿度传感器',
  'window-opener': '开窗器',
  'air-conditioner': '空调',
};

export function modelOf(urn) {
  if (typeof urn !== 'string') return null;
  const p = urn.split(':');
  if (p[0] === 'urn' && p[1] === 'miot-spec-v2' && p[2] === 'device' && p.length >= 6) {
    return p[5];
  }
  return null;
}

export function categoryOf(urn) {
  if (typeof urn !== 'string') return null;
  const p = urn.split(':');
  if (p[0] === 'urn' && p[1] === 'miot-spec-v2' && p[2] === 'device' && p.length >= 4) {
    return CATEGORY_CN[p[3]] ?? null;
  }
  return null;
}

export function lookupDevice(urn) {
  const model = modelOf(urn);
  if (model && DICT[model]) return { model, ...DICT[model] };
  return null;
}

export function deviceLabel(urn) {
  const hit = lookupDevice(urn);
  if (hit) return hit.name;
  const model = modelOf(urn);
  const cat = categoryOf(urn);
  if (model && cat) return `${cat}(${model})`;
  if (model) return `未知设备(${model})`;
  return `未知设备(${urn ?? '无型号'})`;
}
