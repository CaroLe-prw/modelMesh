# ModelMesh 开发约定

本文件是仓库级开发规范，适用于本仓库中的人类贡献者和 AI Agent。除非任务明确要求调整技术方案，否则新增代码应遵循以下约定。

## 1. 项目定位与技术栈

ModelMesh 是一个开源的 AI 模型渠道发现、比较、路由与状态监测平台。

- 前端目录：`frontend/`
- 前端框架：React、TypeScript、Vite
- 包管理器：pnpm
- 代码检查：Oxlint
- 样式系统：UnoCSS
- 后端目录：`backend/`
- 后端框架：Rust 2024、Axum、Tokio
- 前后端通过 `/api` 下的 JSON API 通信

前端不得直接保存供应商密钥或调用需要私密凭证的第三方服务。密钥、渠道路由、健康检查和聚合逻辑属于后端职责。

## 2. 视觉方向

界面采用“双主题”设计：

- 默认主题：极简浅色
- 深色主题：开发者深色

整体风格应简洁、克制、信息密度适中。优先保证数据可读性、状态辨识度和长时间使用的舒适度。

### 默认浅色主题

| 语义变量 | 色值 | 用途 |
| --- | --- | --- |
| `--color-bg` | `#F5F6F8` | 页面背景 |
| `--color-surface` | `#FFFFFF` | 卡片、表格、弹层 |
| `--color-surface-raised` | `#FFFFFF` | 高层级浮层 |
| `--color-surface-subtle` | `#F7F8FA` | 次级区域 |
| `--color-surface-hover` | `#F1F3F6` | 悬停背景 |
| `--color-text` | `#181A1F` | 主文字 |
| `--color-text-muted` | `#6D727C` | 次级文字 |
| `--color-text-faint` | `#9298A3` | 辅助信息 |
| `--color-border` | `#E3E5E9` | 默认边框 |
| `--color-border-strong` | `#D8DBE1` | 强调边框 |
| `--color-primary` | `#285DE8` | 主按钮、链接、选中态 |
| `--color-primary-foreground` | `#FFFFFF` | 主色上的文字 |
| `--color-primary-soft` | `#EEF3FF` | 主色弱背景 |
| `--color-success` | `#11965C` | 成功、在线、健康 |
| `--color-warning` | `#DF8B18` | 警告、延迟、降级 |
| `--color-danger` | `#E94E4E` | 错误、离线、危险操作 |

### 开发者深色主题

| 语义变量 | 色值 | 用途 |
| --- | --- | --- |
| `--color-bg` | `#090B0F` | 页面背景 |
| `--color-surface` | `#101319` | 卡片、表格、弹层 |
| `--color-surface-raised` | `#151920` | 高层级浮层 |
| `--color-surface-subtle` | `#171B23` | 次级区域 |
| `--color-surface-hover` | `#1B2029` | 悬停背景 |
| `--color-text` | `#F2F5F7` | 主文字 |
| `--color-text-muted` | `#969EAA` | 次级文字 |
| `--color-text-faint` | `#697280` | 辅助信息 |
| `--color-border` | `#252A33` | 默认边框 |
| `--color-border-strong` | `#343B47` | 强调边框 |
| `--color-primary` | `#75E7C1` | 主按钮、链接、选中态 |
| `--color-primary-foreground` | `#07120E` | 主色上的文字 |
| `--color-primary-soft` | `rgba(117, 231, 193, 0.11)` | 主色弱背景 |
| `--color-success` | `#4BD59A` | 成功、在线、健康 |
| `--color-warning` | `#EDB657` | 警告、延迟、降级 |
| `--color-danger` | `#FF6B74` | 错误、离线、危险操作 |

主题变量应定义在全局样式中，深色变量由 `.theme-dark` 覆盖。业务组件只使用语义变量，不直接写十六进制颜色。主题选择应保存在本地，并在首次访问时尊重系统主题偏好。

### 视觉细节

- 默认不使用大面积渐变、玻璃拟态或强烈发光效果。
- 颜色主要用于交互、品牌重点和状态表达，不用于无意义装饰。
- 普通控件圆角建议为 `8px`，卡片和面板圆角建议为 `12px`。
- 数据列表保持紧凑，桌面端常规行高建议为 `48px` 至 `52px`。
- 正文字体使用 `Inter` 或系统无衬线字体。
- 模型标识、价格、延迟和代码使用等宽数字或等宽字体。
- 所有交互元素必须有清晰的 hover、focus、disabled 和 loading 状态。
- 浅色与深色主题都要满足足够的文字对比度。

## 3. React 与 TypeScript 约定

- 使用函数组件与 Hooks，不新增 class component。
- TypeScript 保持严格类型；禁止用 `any` 绕过类型检查。
- API DTO、领域模型和组件 Props 应使用明确的类型。
- 页面组件负责组合功能，不承载复杂业务规则。
- 可复用基础组件放入统一的 UI 组件目录，领域组件按功能组织。
- 状态尽量靠近使用位置；只有真正跨页面共享的数据才进入全局状态。
- 请求必须处理 loading、error、empty 和 success 四种状态。
- 表单、按钮、弹层和表格必须支持键盘操作与可见焦点。
- 不在组件中散落服务地址；统一通过 API 客户端访问 `/api`。
- 避免不断扩大的 `App.tsx`，页面、布局和业务区域应及时拆分。
- 合并前至少运行 `pnpm lint` 与 `pnpm build`。

## 4. UnoCSS 约定

- UnoCSS 是前端唯一的原子化 CSS 引擎，不同时引入 Tailwind CSS。
- Preset、规则、shortcuts、主题映射和 safelist 统一维护在 `uno.config.ts`。
- UnoCSS 主题颜色应映射到上面的 CSS 语义变量，不在组件 class 中重复硬编码颜色。
- 重复出现的完整视觉模式可以提取为 shortcut；单次样式不应过早抽象。
- class 名必须可被 UnoCSS 静态扫描。不要用字符串拼接生成不完整的 class 名。
- 条件样式应映射为完整 class 字符串，例如为每种状态建立明确的样式映射。
- 只有无法静态发现且确实必要的 class 才加入 safelist。
- 少量无法用原子类清晰表达的样式可以写普通 CSS，但仍须使用主题变量。
- 如果采用 shadcn/ui 的设计或组件结构，应将组件适配为 UnoCSS 实现；不要直接引入其 Tailwind 配置，除非仓库明确决定更换样式方案。

## 5. Rust、Axum 与 Tokio 约定

- 使用 Rust 2024 edition，最低 Rust 版本以仓库配置为准，初始目标为 `1.85`。
- Axum handler 保持简短，只负责提取参数、调用服务和构造响应。
- 业务逻辑放在 service/domain 层，不堆积在路由或 handler 中。
- 共享依赖通过 `State<AppState>` 注入，不使用可变全局变量。
- 跨任务共享的状态必须满足 `Send + Sync`；优先共享不可变数据。
- 不默认使用 `Arc<Mutex<_>>` 解决所有共享问题，也不得持有锁跨越 `.await`。
- handler 中不得执行阻塞 I/O 或重 CPU 工作；确有需要时使用适当的阻塞任务隔离机制。
- 请求 DTO、响应 DTO 与内部领域模型应按职责分离。
- 在系统边界完成参数校验，不让无效状态进入核心业务逻辑。
- 使用结构化错误类型并实现一致的 HTTP 响应；请求路径中禁止随意使用 `unwrap()` 或 `expect()`。
- HTTP 状态码必须表达真实结果，错误响应格式应稳定且便于前端展示。
- 密钥和敏感配置只从后端配置或环境变量读取，不写入源码或日志。
- 新增异步逻辑时，要考虑取消、超时、并发上限和资源释放。
- 合并前至少运行 `cargo fmt --check`、`cargo clippy --all-targets --all-features -- -D warnings` 和 `cargo test`。

## 6. API 与目录边界

- API 路由统一放在 `/api` 下，并按资源或功能拆分。
- 前端开发环境通过 Vite proxy 连接 Axum，避免在组件中处理跨域地址。
- JSON 字段命名、分页方式、错误结构和状态码应保持一致。
- API 合约发生变化时，应同步更新前端类型和相关文档。
- 数据库、缓存、第三方供应商客户端都应通过后端抽象层访问。

## 7. 依赖和提交要求

- 前端统一使用 pnpm，并提交 `pnpm-lock.yaml`；不要生成 npm、Yarn 或 Bun 的锁文件。
- 首次克隆仓库后运行 `./scripts/setup-git-hooks.sh`，启用仓库维护的提交前检查。
- 提交前 Hook 会格式化已暂存的前端和 Rust 文件，并按变更范围执行前后端校验；不要无故绕过。
- 添加依赖前先确认标准库或现有依赖无法清晰完成需求。
- 不因局部功能引入重量级框架。
- 修改应聚焦当前任务，避免夹带无关的大范围重构。
- 不覆盖或删除他人的未提交改动。
- 功能变更应附带与风险相称的测试，并验证浅色和深色主题。
- 面向用户的行为、配置或部署方式变化时，应同步更新 README 或相应文档。
