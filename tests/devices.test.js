import { modelOf, lookupDevice, deviceLabel } from '../src/devices.js';

export const tests = [
  {
    name: 'modelOf 提取第 6 段型号',
    fn() {
      if (modelOf('urn:miot-spec-v2:device:camera:0000A01C:chuangmi-039c01:2') !== 'chuangmi-039c01') {
        throw new Error('camera urn 提取失败');
      }
      if (modelOf('urn:miot-spec-v2:device:switch:0000A003:xiaomi-w2:2:0000C809') !== 'xiaomi-w2') {
        throw new Error('switch urn 提取失败');
      }
    },
  },
  {
    name: '非 miot-spec-v2 device urn 返回 null',
    fn() {
      if (modelOf('') !== null) throw new Error('空串应 null');
      if (modelOf('urn:other:device:a:b:c') !== null) throw new Error('其他 urn 应 null');
      if (modelOf(undefined) !== null) throw new Error('undefined 应 null');
    },
  },
  {
    name: '词典命中返回中文名',
    fn() {
      const hit = lookupDevice('urn:miot-spec-v2:device:camera:0000A01C:chuangmi-039c01:2');
      if (hit?.name !== '小米智能摄像机2 云台版') throw new Error(`命中失败: ${JSON.stringify(hit)}`);
      if (hit?.category !== '摄像机') throw new Error('品类不符');
    },
  },
  {
    name: '未知型号按品类降级显示',
    fn() {
      const label = deviceLabel('urn:miot-spec-v2:device:switch:0000A003:unknown-model-xyz:1');
      if (!label.includes('开关')) throw new Error(`应含品类: ${label}`);
      if (!label.includes('unknown-model-xyz')) throw new Error(`应含型号: ${label}`);
    },
  },
  {
    name: '完全未知 urn 显示未知设备',
    fn() {
      const label = deviceLabel('urn:unknown:thing');
      if (!label.includes('未知设备')) throw new Error(`应为未知设备: ${label}`);
    },
  },
  {
    name: 'lookupDevice 未命中返回 null',
    fn() {
      if (lookupDevice('urn:miot-spec-v2:device:switch:0000A003:nope-nope:1') !== null) {
        throw new Error('应返回 null');
      }
    },
  },
  {
    name: '词典已收录不少于 20 个型号',
    fn() {
      let count = 0;
      for (const model of ['chuangmi-039c01', 'xiaomi-w2', 'xiaomi-oh2p', 'xiaomi-oh2', 'xiaomi-lx06', 'xiaomi-s12', 'xiaomi-l15a', 'xiaomi-lx5a', 'xiaomi-lx05', 'xiaomi-x10a', 'xiaomi-l17a', 'xiaomi-l06a', 'xiaomi-lx01', 'xiaomi-l05b', 'xiaomi-l05c', 'xiaomi-l09a', 'xiaomi-lx04', 'xiaomi-x4b', 'xiaomi-x6a', 'xiaomi-x08e', 'xiaomi-x8f']) {
        if (lookupDevice(`urn:miot-spec-v2:device:speaker:0000A015:${model}:1`)) count += 1;
      }
      if (count < 20) throw new Error(`词典收录不足: ${count}`);
    },
  },
  {
    name: '小爱音箱 Pro 解析为中文名',
    fn() {
      const hit = lookupDevice('urn:miot-spec-v2:device:speaker:0000A015:xiaomi-lx06:1');
      if (hit?.name !== '小爱音箱 Pro') throw new Error(`名称不符: ${JSON.stringify(hit)}`);
    },
  },
];
