# VSCode 主题模拟系统

为第三方 Vue 程序在 Vite dev 模式下提供 VSCode 主题环境模拟，支持 Light Modern 和 Dark Modern 主题的完整模拟。

## 🎯 功能特性

- ✅ **完整主题模拟** - 支持 VSCode Light Modern 和 Dark Modern 主题
- ✅ **实时主题切换** - 支持运行时动态切换主题
- ✅ **开发工具集成** - 提供主题调试和开发辅助工具
- ✅ **Vite 插件支持** - 无缝集成到 Vite 开发环境
- ✅ **TypeScript 支持** - 完整的类型定义和智能提示
- ✅ **性能监控** - 实时监控主题切换性能
- ✅ **主题导出/导入** - 支持主题配置的导出和导入
- ✅ **响应式设计** - 适配不同屏幕尺寸

## 📦 安装使用

### 1. 安装依赖

```bash
npm install @your-org/vscode-theme-mock
# 或
yarn add @your-org/vscode-theme-mock
```

### 2. Vite 配置

在 `vite.config.ts` 中配置插件：

```typescript
import { defineConfig } from 'vite';
import { vscodeThemePlugin } from '@your-org/vscode-theme-mock';

export default defineConfig({
  plugins: [
    vscodeThemePlugin({
      defaultTheme: 'theme-dark-vars', // 默认主题
      enableDevTools: true, // 启用开发工具
      enablePerformanceMonitoring: true, // 启用性能监控
      autoInjectStyles: true, // 自动注入样式
      debug: true // 调试模式
    })
  ]
});
```

### 3. 样式导入

在项目主样式文件中导入：

```scss
// main.scss
@use '@your-org/vscode-theme-mock/styles/mock/index.scss';
```

### 4. 使用主题管理器

```typescript
import { themeManager } from '@your-org/vscode-theme-mock';

// 切换主题
themeManager.setTheme('theme-light-vars');

// 获取当前主题
const currentTheme = themeManager.getCurrentTheme();

// 监听主题变化
window.addEventListener('vscode-theme-change', (e) => {
  console.log('主题已切换到:', e.detail.themeId);
});
```

## 🎨 主题系统

### 内置主题

#### Light Modern 主题

- **ID**: `theme-light-vars`
- **描述**: VSCode 官方浅色现代主题
- **特点**: 清爽明亮，适合日间使用

#### Dark Modern 主题

- **ID**: `theme-dark-vars`
- **描述**: VSCode 官方深色现代主题
- **特点**: 护眼舒适，适合夜间使用

### 主题变量

系统提供完整的 VSCode 主题变量映射，包括：

- **基础颜色**: 背景色、前景色、边框色
- **按钮颜色**: 主按钮、次要按钮、悬停状态
- **输入框颜色**: 输入框、下拉框、焦点状态
- **列表颜色**: 列表项、悬停、激活状态
- **侧边栏颜色**: 侧边栏背景、前景、边框
- **状态栏颜色**: 状态栏背景、前景
- **通知颜色**: 通知背景、前景、边框
- **功能颜色**: 错误、警告、信息、成功色
- **链接颜色**: 链接、激活链接
- **焦点颜色**: 焦点边框、阴影
- **选择颜色**: 选择背景、前景
- **滚动条颜色**: 滚动条滑块、悬停、激活状态
- **编辑器颜色**: 行号、缩进指南
- **代码块颜色**: 代码块背景、预格式化文本
- **分割线颜色**: 面板边框、侧边栏标题
- **工具提示颜色**: 工具提示背景、前景、边框
- **进度条颜色**: 进度条背景
- **徽章颜色**: 徽章背景、前景
- **扩展颜色**: 扩展按钮颜色
- **终端颜色**: 终端背景、前景、光标
- **调试颜色**: 调试控制台颜色
- **测试颜色**: 测试图标颜色
- **图表颜色**: 图表颜色系统
- **符号颜色**: 符号图标颜色

## 🛠️ 开发工具

### 主题切换器

在开发模式下，系统会自动在页面右上角显示主题切换器：

```html
<div class="vscode-theme-switcher">
  <button class="vscode-theme-switcher__button vscode-theme-switcher__button--light" data-theme="theme-light-vars">
    ☀️ Light
  </button>
  <div class="vscode-theme-switcher__separator"></div>
  <button class="vscode-theme-switcher__button vscode-theme-switcher__button--dark" data-theme="theme-dark-vars">
    🌙 Dark
  </button>
</div>
```

### 调试面板

提供主题调试面板，显示当前主题的变量信息：

```html
<div class="vscode-theme-debug">
  <div class="vscode-theme-debug__header">
    <div class="vscode-theme-debug__title">Theme Debug</div>
    <button class="vscode-theme-debug__toggle">×</button>
  </div>
  <div class="vscode-theme-debug__content">
    <!-- 主题变量信息 -->
  </div>
</div>
```

### 性能监控

实时监控主题切换性能：

```html
<div class="vscode-theme-performance">
  <div class="vscode-theme-performance__metric">
    <span class="vscode-theme-performance__metric-label">Theme:</span>
    <span class="vscode-theme-performance__metric-value">theme-dark-vars</span>
  </div>
  <div class="vscode-theme-performance__metric">
    <span class="vscode-theme-performance__metric-label">Variables:</span>
    <span class="vscode-theme-performance__metric-value">85</span>
  </div>
</div>
```

## ⌨️ 快捷键

- **Ctrl + Shift + T**: 切换主题（在 Light 和 Dark 之间切换）

## 🔧 API 参考

### ThemeManager 类

#### 构造函数

```typescript
new VSCodeThemeManager(options?: ThemeManagerOptions)
```

#### 方法

##### registerTheme(theme: ThemeInfo): void

注册自定义主题

##### getThemes(): ThemeInfo[]

获取所有可用主题

##### getCurrentTheme(): string

获取当前主题ID

##### setTheme(themeId: string): boolean

设置主题

##### toggleTheme(): void

切换主题（在 Light 和 Dark 之间切换）

##### enableDevTools(): void

启用开发工具

##### disableDevTools(): void

禁用开发工具

##### exportTheme(): void

导出当前主题配置

##### resetTheme(): void

重置主题到默认值

##### destroy(): void

销毁主题管理器

### 事件

#### vscode-theme-change

主题切换事件

```typescript
window.addEventListener('vscode-theme-change', (e) => {
  console.log('新主题:', e.detail.themeId);
  console.log('主题信息:', e.detail.theme);
});
```

## 🎯 使用示例

### 基础使用

```typescript
import { themeManager } from '@your-org/vscode-theme-mock';

// 设置主题
themeManager.setTheme('theme-light-vars');

// 监听主题变化
window.addEventListener('vscode-theme-change', (e) => {
  console.log('主题已切换到:', e.detail.themeId);
});

// 启用开发工具
themeManager.enableDevTools();
```

### 自定义主题

```typescript
import { themeManager, type ThemeInfo } from '@your-org/vscode-theme-mock';

// 创建自定义主题
const customTheme: ThemeInfo = {
  id: 'my-custom-theme',
  name: 'My Custom Theme',
  displayName: 'My Custom Theme',
  description: '我的自定义主题',
  isDark: true,
  variables: {
    '--vscode-editor-background': '#1a1a1a',
    '--vscode-editor-foreground': '#ffffff'
    // ... 更多变量
  }
};

// 注册主题
themeManager.registerTheme(customTheme);

// 使用自定义主题
themeManager.setTheme('my-custom-theme');
```

### Vue 组件中使用

```vue
<template>
  <div class="my-component">
    <h1>我的组件</h1>
    <button @click="toggleTheme">切换主题</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { themeManager } from '@your-org/vscode-theme-mock';

const currentTheme = ref(themeManager.getCurrentTheme());

const toggleTheme = () => {
  themeManager.toggleTheme();
  currentTheme.value = themeManager.getCurrentTheme();
};

onMounted(() => {
  // 监听主题变化
  window.addEventListener('vscode-theme-change', (e) => {
    currentTheme.value = e.detail.themeId;
  });
});
</script>

<style scoped>
.my-component {
  background-color: var(--vscode-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-border);
  padding: 16px;
  border-radius: 4px;
}

button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: var(--vscode-button-hoverBackground);
}
</style>
```

## 🎨 样式定制

### 使用 VSCode 变量

```scss
.my-component {
  // 使用 VSCode 主题变量
  background-color: var(--vscode-background);
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-border);

  // 按钮样式
  .button {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);

    &:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
  }

  // 输入框样式
  .input {
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);

    &:focus {
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
    }
  }
}
```

### 响应式设计

```scss
.my-component {
  // 基础样式
  padding: 16px;

  // 响应式适配
  @media (max-width: 768px) {
    padding: 8px;
  }

  // 使用 VSCode 变量
  background-color: var(--vscode-background);
  color: var(--vscode-foreground);
}
```

## 🚀 高级功能

### 主题性能监控

```typescript
import { themeManager } from '@your-org/vscode-theme-mock';

// 启用性能监控
themeManager.enablePerformanceMonitoring();

// 监听性能数据
window.addEventListener('vscode-theme-change', (e) => {
  console.log('主题切换性能:', e.detail.performance);
});
```

### 主题导出/导入

```typescript
// 导出当前主题
themeManager.exportTheme();

// 导入主题（通过文件）
const importTheme = async (file: File) => {
  const text = await file.text();
  const data = JSON.parse(text);
  themeManager.registerTheme(data.theme);
  themeManager.setTheme(data.theme.id);
};
```

### 自定义主题生成器

```typescript
import { themeManager } from '@your-org/vscode-theme-mock';

// 基于现有主题生成新主题
const generateTheme = (baseTheme: string, overrides: Record<string, string>) => {
  const base = themeManager.getThemes().find((t) => t.id === baseTheme);
  if (!base) return;

  const newTheme = {
    ...base,
    id: `${baseTheme}-custom`,
    name: `${base.name} (Custom)`,
    variables: { ...base.variables, ...overrides }
  };

  themeManager.registerTheme(newTheme);
  return newTheme;
};
```

## 🔍 故障排除

### 常见问题

#### 1. 主题切换不生效

- 检查是否正确导入了样式文件
- 确认 Vite 插件配置正确
- 查看浏览器控制台是否有错误信息

#### 2. 开发工具不显示

- 确认 `enableDevTools` 选项为 `true`
- 检查是否在开发模式下运行
- 查看是否有 CSS 冲突

#### 3. 主题变量未定义

- 确认主题已正确注册
- 检查变量名是否正确
- 查看主题变量是否包含所需变量

#### 4. 性能问题

- 启用性能监控查看详细信息
- 检查是否有过多的主题变量
- 考虑优化主题切换逻辑

### 调试技巧

1. **启用调试模式**

   ```typescript
   const themeManager = new VSCodeThemeManager({
     debug: true
   });
   ```

2. **查看主题信息**

   ```typescript
   console.log('当前主题:', themeManager.getCurrentTheme());
   console.log('所有主题:', themeManager.getThemes());
   ```

3. **监听主题变化**
   ```typescript
   window.addEventListener('vscode-theme-change', (e) => {
     console.log('主题变化详情:', e.detail);
   });
   ```

## 📝 更新日志

### v1.0.0

- ✨ 初始版本发布
- ✨ 支持 Light Modern 和 Dark Modern 主题
- ✨ 提供完整的 VSCode 主题变量映射
- ✨ 集成 Vite 插件支持
- ✨ 提供开发工具和调试功能
- ✨ 支持 TypeScript 类型定义

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [VSCode](https://code.visualstudio.com/) - 提供主题设计灵感
- [Vite](https://vitejs.dev/) - 优秀的构建工具
- [Vue.js](https://vuejs.org/) - 强大的前端框架
