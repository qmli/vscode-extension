# Extension

一个基于 **Monorepo** 架构的 VSCode 扩展项目，采用 **npm workspace** 管理多个子包，主要实现了 AUTOSAR 相关的开发工具功能。

> 📖 **新同事入职？** 查看 QUICK_START.md 文件获取快速开始指南。

## 工程架构概览

### 📁 核心目录结构

```
vscode-extension/
├── apps/                    # 应用层目录
│   ├── docs/               # 文档目录
│   ├── extension/          # VSCode 扩展主包
│   │   └── dist/           # 扩展构建输出目录
│   └── webview/            # Webview 相关包
│       ├── webview-main/   # 主界面 Webview
│       ├── webview-tree/   # 树形视图 Webview
│       └── webview-settings/ # 设置界面 Webview
├── packages/                # 共享包目录
│   ├── @types/             # TypeScript 类型定义
│   ├── common/             # 共享类型和协议定义
│   ├── dbdriver/           # 数据库驱动相关
│   ├── explugin/           # 扩展插件相关
│   ├── utils/              # 纯工具函数库
│   └── webview-core/       # 共享核心组件库
└── scripts/                # 构建和部署脚本
```

### 架构关系图

```
┌──────────────────────────────────────────────────────────────┐
│                    VSCode Extension Host                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                     Extension Package                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Container（DI 容器）                       │  │
│  │  • EventBus             （事件总线）                    │  │
│  │  • NotificationManager  （通知管理）                    │  │
│  │  • Storage              （存储管理）                    │  │
│  │  • Views                （视图管理）                    │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  Webview Controller                          │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │   Main       │   Tree       │   Settings   │   Core     │ │
│  │   Webview    │   Webview    │   Webview    │   Library  │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                     Shared Libraries                         │
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │   Common     │    Utils     │    Types     │              │
│  │ （协议定义） │ （工具函数） │ （类型工具定义）│               │
│  └──────────────┴──────────────┴──────────────┘              │
└──────────────────────────────────────────────────────────────┘

```

## 各目录详细说明

### 1. Extension - 扩展主包

- **职责**: VSCode 扩展的核心逻辑，负责与 VSCode API 交互
- **核心组件**:
  - `Container`: 依赖注入容器，管理所有服务实例
  - `EventBus`: 事件总线，处理跨组件通信
  - `NotificationManager`: 统一管理 Webview 通知
  - `WebviewsController`: Webview 控制器
- **关键文件**:
  - `extension.ts`: 扩展入口点
  - `container.ts`: 容器配置和服务管理
  - `webview.ts`: Webview 上下文和命令链接

### 2. Webview - 前端界面包

#### webview-core

- **职责**: 共享组件库，基于 Element Plus + Vue 3
- **包含**: 组件、样式系统、状态管理、国际化、图标等
- **特点**: 兼容 VSCode 主题，提供统一的 UI 基础

#### webview-main

- **职责**: 主界面 Webview，使用 Vue 3 + Element Plus
- **功能**: 主要的编辑器界面

#### webview-tree

- **职责**: 树形视图 Webview
- **功能**: 显示项目结构和文件树

#### webview-settings

- **职责**: 设置界面 Webview
- **功能**: 配置和设置管理

### 3. Common - 共享定义包

- **职责**: 定义各模块间共享的类型、常量、接口和协议
- **特点**: 与 Node.js 无关的纯 TypeScript 定义
- **包含**:
  - 命令常量定义
  - 视图 ID 定义
  - 协议接口定义
  - 全局配置类型

### 4. Utils - 工具函数包

- **职责**: 提供纯工具函数，无状态、低耦合
- **特点**: 与 Node.js 无关，不依赖任何第三方库
- **包含**: 计数器、迭代器、对象操作等工具函数

## 开发原则与架构特点

### 1. 模块化设计

- 采用 Monorepo 架构，每个包职责单一
- 通过 workspace 管理依赖关系
- 清晰的包边界和接口定义

### 2. 依赖注入模式

- 使用 Container 作为 DI 容器
- 统一管理服务生命周期
- 便于测试和模块替换

### 3. 事件驱动架构

- EventBus 提供跨组件通信
- 松耦合的组件间通信
- 支持异步事件处理

### 4. 前后端分离

- Extension 负责 VSCode API 交互
- Webview 负责用户界面展示
- 通过消息传递进行通信

### 5. 样式系统设计

- 基于 Element Plus 为主要组件库
- 兼容 VSCode 主题系统
- 提供主题模拟和切换功能
- 统一的样式规范和变量管理

## 开发说明

### 构建流程

```bash
# 开发模式
npm run build:dev

# 生产构建
npm run build

# 监听模式
npm run build:watch

# 单独构建各个包
npm run build:core      # 构建 webview-core
npm run build:main      # 构建 webview-main
npm run build:treeview  # 构建 webview-tree
npm run build:settings  # 构建 webview-settings
npm run build:extension # 构建 extension
```

### 包依赖关系

- `webview-*` 包依赖 `webview-core`
- `extension` 包依赖 `common` 和 `utils`
- 所有包通过 workspace 共享依赖

### 通信机制

- Extension ↔ Webview: 通过 VSCode Webview API
- Webview 内部: 通过 EventBus 和 Pinia 状态管理
- 跨包通信: 通过 Common 包定义的协议

### 开发工具链

- **包管理**: npm + workspace
- **构建工具**: Webpack (extension), Vite (webview)
- **前端框架**: Vue 3 + Element Plus
- **状态管理**: Pinia
- **国际化**: Vue I18n
- **代码规范**: ESLint + Prettier（已集成）⭐
- **类型检查**: TypeScript
- **编辑器配置**: EditorConfig

### 项目脚本说明

#### 自动化脚本

| 脚本                       | 触发时机                 | 说明                                |
| -------------------------- | ------------------------ | ----------------------------------- |
| `scripts/install-hooks.js` | `npm install` 后自动执行 | 自动安装 Git Hooks 到 `.git/hooks/` |

#### 手动管理脚本

| 脚本                        | 平台      | 用途                             |
| --------------------------- | --------- | -------------------------------- |
| `scripts/install-deps.bat`  | Windows   | 依赖管理工具（检查、安装、重装） |
| `scripts/install-deps.js`   | 跨平台    | 依赖管理工具                     |
| `.gitlab/install-hooks.sh`  | Linux/Mac | Git Hooks 安装脚本               |
| `.gitlab/install-hooks.ps1` | Windows   | Git Hooks 安装脚本               |

#### 使用示例

```bash
# Windows 用户 - 检查依赖状态
scripts\install-deps.bat check

# Windows 用户 - 重新安装所有依赖
scripts\install-deps.bat reinstall

# 跨平台 - 手动安装 Git Hooks
npm run hooks:install

# 或使用脚本
bash .gitlab/install-hooks.sh       # Linux/Mac
.\.gitlab\install-hooks.ps1         # Windows PowerShell
```

## 功能特性

- **AUTOSAR 项目支持**: 提供 AUTOSAR 项目创建、管理功能
- **树形视图**: 直观的项目结构展示
- **设置管理**: 统一的配置和设置界面
- **主题适配**: 完美适配 VSCode 主题系统
- **国际化**: 支持多语言切换
- **响应式设计**: 适配不同屏幕尺寸

## 快速开始

### 安装与配置

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd vscode_extension
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

   > 💡 **自动化脚本**：`npm install` 会自动执行以下操作：
   >
   > - ✅ 安装所有依赖包
   > - ✅ 自动安装 Git Hooks（通过 `postinstall` 脚本）
   > - ✅ 配置代码提交规范检查
   >
   > **自动执行的脚本**：
   >
   > - `scripts/install-hooks.js` - 自动安装 Git Hooks 到 `.git/hooks/` 目录
   >
   > **手动使用的脚本**：
   >
   > - `scripts/install-deps.bat` (Windows) - 依赖管理工具，用于检查、安装、重装依赖
   > - `scripts/install-deps.js` (跨平台) - 依赖管理工具

3. **验证安装（可选）**

   ```bash
   # 查看已安装的 Git Hooks
   ls -la .git/hooks/
   # 应该看到: commit-msg, pre-commit, pre-push

   # 手动重新安装 Git Hooks
   npm run hooks:install

   # 检查依赖状态 (Windows)
   scripts\install-deps.bat check

   # 检查依赖状态 (跨平台)
   node scripts/install-deps.js check
   ```

4. **配置 VSCode（推荐）**

   项目已包含 VSCode 配置文件，打开项目后：

   ```bash
   # 1. 安装推荐的扩展（VSCode 会自动提示）
   - ESLint
   - Prettier
   - Vue Language Features (Volar)

   # 2. 配置已自动生效
   - 保存时自动格式化（Prettier）
   - 保存时自动修复（ESLint）
   ```

### 开发流程

1. **开发模式**

   ```bash
   npm run build:dev
   ```

2. **生产模式**

   ```bash
   npm run build
   ```

3. **在 VSCode 中调试**

   - 按 `F5` 启动调试会话
   - 在新窗口中测试扩展功能

4. **在浏览器中调试**
   ```bash
   npm run watch:main
   npm run watch:setting
   npm run watch:tree
   ```

### 打包扩展

生成 `.vsix` 安装包用于分发或安装到 VSCode。

#### 打包命令

```bash
# 标准打包（推荐）- 清理、构建并打包生产版本
npm run package

# 开发版本打包 - 清理并打包开发版本（带 sourcemap）
npm run package:dev

# 快速打包 - 直接打包已有构建产物（跳过构建）
npm run package:quick
```

#### 打包流程说明

1. **标准打包（package）**

   - 自动清理旧的构建产物
   - 执行生产构建（所有子包）
   - 生成 `.vsix` 安装包
   - 包含代码检查（lint）

2. **开发版本打包（package:dev）**

   - 自动清理旧的构建产物
   - 执行开发构建（带 sourcemap）
   - 生成 `.vsix` 安装包
   - 适用于调试和测试

3. **快速打包（package:quick）**
   - 仅打包已构建的产物
   - 不执行清理和重新构建
   - 适合快速验证包内容

#### 打包输出

- 打包完成后会在项目根目录生成 `.vsix` 文件
- 文件命名格式：`${publisher}-${name}-${version}.vsix`
- 例如：`orientais-orientais-extension-0.0.1.vsix`

#### 安装已打包的扩展

- **通过命令行安装**：

  ```bash
  code --install-extension orientais-orientais-extension-0.0.1.vsix
  ```

- **通过 VSCode 界面安装**：
  1.  打开 VSCode
  2.  按 `Ctrl+Shift+P`（或 `Cmd+Shift+P` on Mac）
  3.  输入 "Extensions: Install from VSIX..."
  4.  选择生成的 `.vsix` 文件

#### 发布到市场（可选）

如果需要发布到 VSCode 市场：

```bash
# 登录到 VSCode Marketplace
npm dlx @vscode/vsce login ${publisher}

# 发布扩展
npm dlx @vscode/vsce publish

# 或者发布预览版本
npm dlx @vscode/vsce publish --pre-release
```

> 💡 **注意事项**：
>
> - 首次发布需要使用 `--no-yarn` 标志（如果遇到 yarn 相关问题）
> - 需要拥有 VSCode Marketplace 的发布者账号
> - 确保已完善 `package.json` 中的 `publisher` 和版本信息

### Git 提交规范

本项目使用**约定式提交（Conventional Commits）**规范，Git Hooks 会自动检查提交格式。

#### 提交格式

```
<type>(<scope>): <subject>
```

#### 支持的类型

- `feat` - 新功能
- `fix` - Bug 修复
- `perf` - 性能优化
- `docs` - 文档更新
- `style` - 代码格式调整
- `refactor` - 代码重构
- `test` - 测试相关
- `build` - 构建系统
- `chore` - 其他修改
- `ci` - CI 配置
- `revert` - 回滚
- `localize` - 国际化
- `deps` - 依赖更新

#### 示例

```bash
✅ git commit -m "feat(user): 添加用户登录功能"
✅ git commit -m "fix(auth): 修复登录验证bug"
✅ git commit -m "docs: 更新API文档"
✅ git commit -m "perf: 优化查询性能"

❌ git commit -m "update code"
❌ git commit -m "修复bug"
```

#### Git Hooks 说明

安装后会自动启用以下检查：

- **commit-msg**: 检查提交消息格式
- **pre-commit**: 提交前代码检查
  - ESLint 检查（允许最多 20 个警告，**包括 Prettier 格式化警告**）
  - **调试代码检查已禁用** - console.log 和 debugger 都允许使用 ✅
  - 冲突标记、敏感信息、文件大小等
- **pre-push**: 推送前检查（分支保护、提交格式）

如需临时跳过检查：

```bash
git commit --no-verify -m "message"
git push --no-verify
```

> 📖 **详细文档**：查看 .gitlab/README.md 文件了解更多关于 Git Hooks 的信息。

## 总结

扩展工程采用了现代化的前端架构设计

1. **清晰的职责分离**: Extension 负责后端逻辑，Webview 负责前端界面，Common 和 Utils 提供共享资源1
2. **可扩展的模块化设计**: 每个 Webview 都是独立的包，便于维护和扩展
3. **统一的样式系统**: 基于 Element Plus，兼容 VSCode 主题，提供一致的用户体验
4. **高效的开发流程**: 支持热重载、类型检查、代码规范等现代开发工具链
