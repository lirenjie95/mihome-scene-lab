# 米家场景实验室(mihome-scene-lab)

纯前端工具:在浏览器里解析、解读米家自动化极客版 / 米家 App 的场景备份文件(.bak),并可确定性脱敏后重新导出。全程本地处理,文件不上传。

在线使用:<https://lirenjie95.github.io/mihome-scene-lab/>

## 功能

- 解析官方 local-backup 容器:4 字节长度头 + raw DEFLATE + 尾部 SHA-256 校验
- 场景总览、设备清单(型号 → 中文名)、流程图(蓝=事件边,绿=状态边,橙=双类型,箭头指示方向)、中文触发链解读
- 确定性脱敏:DID → 假 DID、经纬度 → 0,时间戳 → 固定值,可重新打包为 .bak 下载
- 支持 version-2 载荷与旧版 rules-only 数组(新老两代极客版 .bak 均可打开)
- **交互式逻辑模拟**:设置设备状态与场景变量 → 触发设备事件/定时/启用触发 → 按虚拟时钟逐步回放执行路径(延时、条件、计数器、顺序事件等),流程图高亮本次触发链路,附事件日志
- **静态诊断**:无触发源、动作无通路(可能永不执行)、引脚类型错配、悬空边
- **语义假设面板**:固件未经实机验证的行为(delay 重复触发、statusLast 复位时点、counter 边界等)以可切换假设呈现,并在日志中标注
- **JSON 编辑/创建**:编辑场景 JSON 并实时预览(流程图/解读/诊断/模拟随之刷新);可从模板新建场景,或按节点类型插入 canonical 六段骨架;导出 .bak 后经极客版备份恢复导入网关
- **AI 写场景**:自然语言描述需求 → 生成场景 JSON(OpenAI 兼容端点,支持 DeepSeek 等;提示词内置完整节点目录与格式规范);API Key 仅存本浏览器,只发送给你填写的端点

## 支持范围

- ✅ 小米中枢网关极客版场景备份(.bak):version-2 与旧版 rules-only 数组两代格式
- ❌ 米家 App 云端"自动化/智能场景":没有官方导出文件格式(存于米家云,不提供文件),暂不支持;本工具保持纯本地、不登录

## 与官方编辑器的区别

米家 App 的极客版编辑器可以看到自己网关里的场景图,但本工具面向它覆盖不到的场景:

- 不登录、没有网关,也能打开和审阅任何 .bak(官方 App 无法直接打开备份文件)
- 自动生成中文触发链解读,标注"与触发源无事件通路、可能永不执行"的动作
- 引脚类型着色(event/state),把官方编辑器不显示的运行语义画出来
- 确定性脱敏后安全分享场景
- 在浏览器里模拟触发、按虚拟时钟回放逻辑,不动真实设备验证场景(延时、温度分支、变量、夜间链路等都可离线推演)

## 浏览器要求

Chrome/Edge 103+、Firefox 113+、Safari 16.4+(需要 DecompressionStream('deflate-raw'))。

## 本地开发

```bash
node tests/run.js        # 跑全部单测(零依赖)
node scripts/make-fixture.mjs <你的.bak>  # 生成脱敏测试数据
```

浏览器自测页:`tests/browser.html`。

## 语义与免责声明

节点执行语义依据 xgg 的 graph-model.md 整理;固件行为未经全面实机验证,标注"假设"处不代表真实网关行为。本工具是理解与调试辅助,不保证与网关执行结果完全一致。项目与小米公司无关。

## 致谢与参考

- [eyaeya/xiaomi-central-hub-gateway-cli](https://github.com/eyaeya/xiaomi-central-hub-gateway-cli)(GPL-3.0):已获授权使用其文档内容。容器格式见其 `packages/core/src/crypto/deflate.ts` 与 `packages/core/src/usecases/local-backup.ts`;执行模型与 25 节点 canonical 契约(引脚表、props 键位、骨架)提炼自 `packages/cli/skills/xgg-rule-authoring/references/graph-model.md` 与 `node-catalog.md`,对应本项目 `src/catalog.js`。本项目实现为独立代码
- [home.miot-spec.com](https://home.miot-spec.com)、[mijia.wiki](https://mijia.wiki):设备型号 → 名称资料
