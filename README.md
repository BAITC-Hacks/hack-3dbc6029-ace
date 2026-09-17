# LECTOR AI

最新后端状态：真实生成、原文分段、引用校验、AI 审核和 NDJSON 进度已实现，替代原 501 占位响应。前端正在独立迁入，须按 [后端接入说明](docs/backend-handoff.md) 连接。一次性 JSON 模式需发送 `Accept: application/json`。以下“骨架”段落记录早期交付，不代表最新后端能力。

将讲稿转换为有原文依据的摘要、要点、测试题和复习卡片。

当前状态：E01/E02 项目骨架与接口定义已实现，待双方接口评审。已有基础讲稿表单、请求校验和统一数据类型；合法生成请求明确返回 HTTP 501（生成流程尚未接入）。当前版本不是完整 AI 演示。

## 团队与分工

| 成员 | 开发分支 | 主要职责 |
| --- | --- | --- |
| elika-88 | `elika` | 项目初始化、共享数据接口、AI 流程、来源校验、后端测试、部署 |
| xiaomao | `xiaomao` | 输入与结果界面、测试题和卡片交互、来源展示、浏览器测试、演示材料 |

- [两人任务分工与协作流程](docs/team-tasks.md)：任务编号、文件归属、依赖、验收标准和 Git 流程。
- [完整技术实施方案](docs/implementation-plan.md)：架构、数据结构、提示词、可靠性和测试设计。
- [接口契约与前端交接](docs/api-contract.md)：请求、错误码、NDJSON 事件、数据 Schema 和当前实现边界。

## 核心交付

输入讲稿后，通过真实 OpenAI API 生成四类学习材料；显示对应原文；支持答题、卡片复习和重新生成；明确处理空输入、短输入及生成失败。

技术栈：Next.js App Router、React、TypeScript、Tailwind CSS、shadcn/ui 配置与按钮基础组件、Lucide、Zod；已安装 OpenAI SDK，Responses API 生成流程将在 E04 接入，目标部署为 Vercel。

演示讲稿可以预置，生成结果必须现场处理。服务器默认密钥保存在服务端环境变量中；用户自定义密钥仅在当前页面内存和请求处理中使用，不持久化、不提交到 GitHub。

## 本地运行

使用 Node.js 22.15 或更高版本（团队基线见 `.nvmrc`）和 npm。只使用 `package-lock.json`，不混用其他包管理器。

```bash
npm ci
npm run dev
```

打开 `http://127.0.0.1:3000`。端口被占用时运行 `npm run dev -- --port 3001` 并访问对应端口。

基础安装、启动、测试和构建不需要 OpenAI 密钥。后续 AI 接入时，在本地 `.env.local` 或部署平台配置以下服务端变量；模板见 `.env.example`：

| 变量 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | E04 起用于真实生成；不传给浏览器，不使用 NEXT_PUBLIC 前缀 |
| `OPENAI_BASE_URL` | 服务器默认 API 根地址，默认 `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 默认 `gpt-5-mini` |

`.env.local` 等本地环境文件已加入 `.gitignore`，仅 `.env.example` 可提交。

## 自定义 API 设置

页面的“Настройки API”中开启“Свой API”，即可填写 **API Base URL、API key、模型 ID**，支持显示/隐藏密钥和重置。未开启时使用服务器默认配置。自定义配置必须完整，不会借用服务器密钥。

URL 填写 API 根地址，例如 `https://api.openai.com/v1`，模型可自由输入。支持 HTTPS 和 HTTP 本地回环地址；localhost 指服务端机器。所有设置仅保留在当前页面内存中，刷新后清空；关闭自定义模式也会清空密钥。未来接入的服务需要支持 Responses API 和结构化输出。

当前已实现配置输入、请求校验和独立 SDK 客户端工厂，尚未接入 AI 生成或真实连接测试；合法请求仍返回 501。

## 检查与构建

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run check` 串行执行 lint、typecheck、单元测试和 build。浏览器测试会在独立的 `127.0.0.1:3100` 启动并关闭测试服务器；该端口需空闲。覆盖 Chromium 桌面和手机视口，截图存放在被 Git 忽略的 `test-results/`。

若浏览器下载受网络限制，可使用已经安装的 Chrome。在 PowerShell 中执行 `$env:PLAYWRIGHT_CHANNEL = 'chrome'` 后运行 `npm run test:e2e`。不设置该变量时使用 Playwright 自带的 Chromium，CI 也使用这个默认值。不要同时运行 build 和浏览器测试，两者会使用同一个 `.next` 目录。

生产运行：`npm run build` 后执行 `npm start`。GitHub Actions 已配置相同基础检查和浏览器测试，不需要仓库内保存密钥。

本次骨架本地验证：`npm ci`、零警告 lint、typecheck、30 项单元测试、生产 build 通过；本机 Chrome 上 4 项桌面/手机视口测试通过，截图已检查。Playwright 自带 Chromium 下载在本机网络超时，因此本地浏览器结果使用上述 Chrome 回退配置；CI 的实际运行结果以 GitHub Actions 为准。

自定义 API 扩展验证：零警告 lint、typecheck、生产 build、52 项单元测试和 6 项 Chrome 桌面/手机视口测试通过。验证了配置实际进入请求、默认/自定义密钥隔离、刷新后清空、重置、显示/隐藏和无浏览器持久化；未使用真实第三方密钥进行外部调用。

依赖说明：当前 React ESLint 插件的 peer 范围尚未包含 ESLint 10，因此锁定兼容的 ESLint 9；npm 安装会显示该版本的弃用提示。后续升级应一起检查 Next.js ESLint 配置和插件兼容性，不使用强制忽略 peer 依赖的安装方式。

## 当前功能与限制

- 可启动的俄文基础工作区、讲稿输入、语言选择、共享字数与长度校验。
- 可选的自定义 API URL、密钥和模型；密钥不持久化，服务端配置与自定义配置隔离。
- `POST /api/generate` 校验 JSON、请求字节、字段、讲稿长度和词数；合法输入返回 `NOT_IMPLEMENTED`，不生成假结果。
- 严格 Zod Schema 定义四类材料、来源、审核、错误和阶段事件；包含 OpenAI SDK 的结构化输出格式转换测试。
- AI 分析/生成/审核、token 限制、原文分段和引用语义校验、实际 NDJSON 流、学习交互、持久化会话和部署均未完成。
- 当前最低 80 个词单位和 300 个非空白字符，最高 60,000 个字符；16,000 input token 上限仅定义为常量，E03 中需实现服务端计数。
- 结构校验通过不代表材料真实可靠。完成原文与审核验证前不能宣称已实现来源保障。

后续按 E03-E08、X01-X08 推进；前端接管范围与依赖变更规则见分工文档。
