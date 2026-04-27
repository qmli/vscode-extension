# 样式系统架构说明与使用指南

本文件介绍 `styles/` 目录的分层架构、主题机制、Element Plus 适配方式，以及在 VS Code Webview 中的推荐用法与最佳实践。

## 目录结构与职责

```
styles/
├─ index.scss                # 样式总入口（生产环境，不含 mock）
├─ index.ts                  # TS 入口：仅引入 `index.scss`
├─ README.md                 # 本文档
│
├─ core/                     # 核心基础层（变量/函数/混入/主题变量）
│  ├─ variables.scss         # 设计令牌（色板、间距、字号、圆角等）
│  ├─ functions.scss         # SCSS 函数（颜色计算、单位转换等）
│  ├─ mixins.scss            # SCSS 混入（文本溢出、滚动条、状态等）
│  ├─ theme.scss             # 将 VS Code 主题变量映射为 CSS 变量/令牌
│  ├─ light.scss             # 亮色主题覆盖
│  └─ dark.scss              # 暗色主题覆盖
│
├─ foundation/               # 基础样式层（尽量轻量，避免覆盖组件库）
│  ├─ reset.scss             # 重置/标准化默认样式
│  ├─ typography.scss        # 排版规则（标题/正文/代码等）
│  ├─ layout.scss            # 容器/栅格/间距工具等
│  ├─ forms.scss             # 原生表单最小样式
│  └─ utilities.scss         # VS Code 环境相关的工具类
│
├─ element-plus/             # Element Plus 适配与主题化
│  ├─ index.scss             # 适配入口，组织 VSCode 主题映射与组件定制
│  ├─ vscode-theme.scss      # 将 VS Code 的 CSS 变量映射到 Element Plus 主题变量
│  └─ components.scss        # 对 Element Plus 组件进行局部深度定制
│
├─ components/               # VS Code 特定的 UI 组件（Element Plus 未覆盖的）
│  ├─ index.scss             # 组件入口，汇总 VSCode-specific 与 base
│  ├─ base/                  # 基础通用样式（按钮、卡片、输入等，如需补足）
│  └─ vscode-specific/       # VS Code 专属组件（通知、侧栏、状态栏等）
│     └─ index.scss
│
└─ mock/                     # 仅开发/演示用（主题切换、示例等）
   ├─ index.scss             # mock 样式入口（不要在生产中引入）
   ├─ index.ts               # mock 运行时入口（主题切换工具等）
   ├─ dev-tools.scss         # 开发辅助样式
   ├─ theme-switcher.scss    # 主题切换控件样式
   ├─ examples/              # 示例工程片段
   └─ themes/                # 本地模拟的主题变量（如 theme-light-vars / theme-dark-vars）
```

## 分层设计与依赖关系

优先级从下至上：core → foundation → element-plus → components。

- core：提供设计令牌与抽象能力，不直接输出 UI；可被所有上层消费。
- foundation：最小化的全局样式基线，避免影响组件库默认表现。
- element-plus：将 VS Code 主题变量映射到 Element Plus 主题系统，并按需做小范围组件细化。
- components：仅补充 VS Code 专属 UI（例如通知、侧边栏、状态条），避免造“重复轮子”。
- mock：仅开发/文档/演示使用，不进入生产构建。

## 主题机制与 VS Code 适配

1. VS Code 在 Webview 中提供一系列 CSS 变量（如 `--vscode-foreground`、`--vscode-button-background`）。
2. `core/theme.scss` 将上述变量统一暴露为项目内可复用的 CSS 变量/SCSS 令牌。
3. `element-plus/vscode-theme.scss` 将这些令牌映射到 Element Plus 主题变量（如 `--el-color-primary`）。
4. `core/light.scss` / `core/dark.scss` 处理亮/暗主题细节差异。

这样即可在 VS Code 主题切换时，Webview UI 跟随变化而无需额外逻辑。

## 如何使用

### 1) 在 Webview 入口中引入样式

在你 Webview 的前端入口（例如 `src/main.ts` 或 `src/main.tsx`）中：

```ts
// 引入标准生产样式（不包含 mock）
import '@webview-core/styles'; // 等价于引入该包下的 index.ts → index.scss
```

或直接引入 SCSS（取决于构建配置）：

```ts
import '@webview-core/styles/index.scss';
```

### 2) 使用 Element Plus 组件（推荐）

按照 Element Plus 的标准用法编写组件：

```vue
<template>
  <el-button type="primary">主要按钮</el-button>
  <el-input v-model="value" placeholder="请输入" />
  <el-table :data="rows">
    <el-table-column prop="name" label="姓名" />
  </el-table>
  <el-card header="标题">内容</el-card>
  <el-dialog v-model="open" title="对话框" />
  <el-message type="success" message="操作成功" />
  <el-select v-model="opt" :options="list" />
  <el-tooltip content="提示"> <el-button>?</el-button> </el-tooltip>
  <!-- ... -->

  <!-- 若需要 VS Code 专属 UI，再组合自定义类 -->
  <div class="vscode-status-bar">...status...</div>
  <nav class="vscode-sidebar-menu">...</nav>
  <div class="vscode-notification vscode-notification--success">操作成功</div>

  <!-- Foundation 工具类可用于微调布局/文本等 -->
  <div class="vscode-text-secondary">说明文字</div>
  <div class="vscode-scroll">...</div>
  <div class="vscode-hover-lift">...</div>

  <!-- 避免与 Element Plus 冲突，尽量不要重置 `.el-` 选择器的全局行为 -->
</template>
```

### 3) 按需引入（优化体积）

如果你的构建链支持 SCSS `@use` 的静态摇树，可按需引入：

```scss
// 只引入需要的部分
@use './core/theme.scss';
@use './element-plus/vscode-theme.scss';
@use './components/vscode-specific/index.scss';
```

注意：在多数前端打包器中，直接 `import './index.scss'` 更为稳妥，按需引入需确保构建配置支持。

### 4) 自定义主题（覆盖变量）

在你的页面根节点（或 `:root`）覆盖 Element Plus 主题变量：

```scss
:root {
  --el-color-primary: #007acc;
  --el-color-success: #28a745;
  // 其他变量...
}
```

也可以通过 SCSS 令牌在局部组件中使用：

````scss
.my-card {
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}
``;

### 5) VS Code 专属组件与工具类

仅当 Element Plus 无合适组件时，使用 `components/vscode-specific` 下的类：

```html
<div class="vscode-notification vscode-notification--error">失败</div>
<div class="vscode-status-bar">...</div>
<nav class="vscode-sidebar-menu">
  <a class="vscode-sidebar-menu__item is-active">文件</a>
</nav>
````

若需自定义 Element Plus 组件的样式，建议通过其提供的类名进行“局部覆盖”，避免全局重置：

```scss
.my-page {
  .el-button.my-strong {
    font-weight: 600;
    border-radius: 8px;
    &:hover {
      transform: translateY(-1px);
    }
  }
}
```

## mock（开发/演示）集成

`styles/mock/` 提供了主题切换器、示例、测试样式等，仅用于文档/演示/开发调试：

- 不要在生产代码中引入 `styles/mock/index.ts|scss`。
- 本地演示/Storybook 场景可以引入 `mock/index.ts` 以启用主题切换与示例皮肤。

示例：

```ts
// 仅在文档/演示工程中
import '@webview-core/styles/mock';
```

## 迁移指南（从自定义到 Element Plus）

- 按钮：`<button class="vscode-button ...">` → `<el-button type="primary">`。
- 输入框：自定义 div/input 结构 → `<el-input v-model="..." />`。
- 表格：自定义 table 结构 → `<el-table>` 与 `<el-table-column>`。
- 菜单/通知/状态栏：若 Element Plus 无等价，使用 `vscode-` 前缀组件或封装成组合组件。

## 命名与冲突规避

- Element Plus 保持 `el-` 前缀，不在全局层面重置其基础样式。
- VS Code 特定组件使用 `vscode-` 前缀，避免命名污染。
- 原生元素的样式尽量通过 `foundation/` 层提供微量基线，不直接 `*` 或 `html, body` 进行激进重置。
