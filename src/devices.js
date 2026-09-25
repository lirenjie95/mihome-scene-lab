// 型号 → 中文名。首批来源:home.miot-spec.com / mijia.wiki(见设计文档第 10 节)。
const DICT = {
  'chuangmi-039c01': { name: '小米智能摄像机2 云台版', category: '摄像机' },
  'xiaomi-w2': { name: '小米智能开关(双开)', category: '开关' },
  'xiaomi-oh2p': { name: '小米智能音箱 Pro', category: '音箱' },
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
