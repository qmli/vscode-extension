# VSCode 主题模拟系统集成指南

## 🎯 集成概述

VSCode 主题模拟系统已完全集成到 `webview-core` 框架中，为开发环境提供完整的 VSCode 主题模拟功能。

## 📦 使用方式

### 1. 作为 webview-core 的一部分使用

```typescript
// 导入主题管理器
import { themeManager, vscodeThemePlugin } from 'webview-core';

// 或者单独导入
import { themeManager } from 'webview-core/mock';
import { vscodeThemePlugin } from 'webview-core/mock';
```

### 2. 导入样式

```scss
// 在主样式文件中导入
@use 'webview-core/styles/mock/index.scss';

// 或者通过 JavaScript 导入
import 'webview-core/mock/styles';
```

### 3. Vite 配置集成

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { vscodeThemePlugin } from 'webview-core/mock';

export default defineConfig({
  plugins: [
    // 在开发模式下自动启用主题模拟
    vscodeThemePlugin({
      defaultTheme: 'theme-dark-vars',
      enableDevTools: true,
      enablePerformanceMonitoring: true,
      autoInjectStyles: true,
      debug: true
    })
  ]
});
```

## 🛠️ 构建配置

### 主构建配置

主构建配置 (`vite.config.ts`) 已集成 VSCode 主题模拟插件，在开发模式下自动启用。

### 独立构建配置

提供了独立的构建配置 (`vite.mock.config.ts`) 用于构建独立的主题模拟系统：

```bash
# 构建独立的主题模拟系统
npm run build:mock

# 开发模式监听
npm run dev:mock
```

## 📁 导出结构

### Package.json 导出

```json
{
  "exports": {
    "./mock": {
      "import": "./dist/mock/index.js",
      "types": "./dist/mock/index.d.ts"
    },
    "./mock/styles": {
      "import": "./dist/styles/mock/index.css"
    }
  }
}
```

### 主要导出内容

- `themeManager` - 主题管理器实例
- `VSCodeThemeManager` - 主题管理器类
- `vscodeThemePlugin` - Vite 插件
- 完整的类型定义
- 主题样式文件

## 🎨 主题系统

### 内置主题

- **Light Modern** - VSCode 浅色现代主题
- **Dark Modern** - VSCode 深色现代主题

### 主题切换

```typescript
// 切换主题
themeManager.setTheme('theme-light-vars');

// 获取当前主题
const currentTheme = themeManager.getCurrentTheme();

// 监听主题变化
window.addEventListener('vscode-theme-change', (e) => {
  console.log('主题已切换到:', e.detail.themeId);
});
```

## 🔧 开发工具

### 开发模式功能

在开发模式下，系统提供以下功能：

- 可视化主题切换器
- 主题变量调试面板
- 性能监控
- 主题对比工具

### 启用开发工具

```typescript
// 手动启用开发工具
themeManager.enableDevTools();

// 启用性能监控
themeManager.enablePerformanceMonitoring();
```

## 📋 使用示例

### Vue 组件中使用

```vue
<template>
  <div class="vscode-theme-container">
    <h1>VSCode 主题模拟示例</h1>
    <button @click="toggleTheme">切换主题 (当前: {{ currentTheme }})</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { themeManager } from 'webview-core/mock';

const currentTheme = ref('theme-dark-vars');

const toggleTheme = () => {
  const newTheme = currentTheme.value === 'theme-dark-vars' ? 'theme-light-vars' : 'theme-dark-vars';
  themeManager.setTheme(newTheme);
  currentTheme.value = newTheme;
};

onMounted(() => {
  currentTheme.value = themeManager.getCurrentTheme();

  // 监听主题变化
  window.addEventListener('vscode-theme-change', (e) => {
    currentTheme.value = e.detail.themeId;
  });
});
</script>

<style scoped>
.vscode-theme-container {
  padding: 20px;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-panel-border);
}

button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: var(--vscode-button-hoverBackground);
}
</style>
```

## 🚀 最佳实践

### 1. 样式使用

- 使用 VSCode 主题变量而不是硬编码颜色
- 遵循 VSCode 的设计规范
- 确保在两种主题下都有良好的对比度

### 2. 性能优化

- 避免频繁的主题切换
- 使用 CSS 变量而不是 JavaScript 动态修改样式
- 合理使用开发工具，生产环境关闭

### 3. 类型安全

- 使用提供的 TypeScript 类型定义
- 利用 IDE 的智能提示功能
- 遵循类型约束

## 🔍 故障排除

### 常见问题

1. **主题不生效**

   - 确保正确导入了样式文件
   - 检查 Vite 插件配置
   - 确认在开发模式下运行

2. **开发工具不显示**

   - 确保 `enableDevTools` 为 `true`
   - 检查浏览器控制台是否有错误
   - 确认在开发模式下

3. **类型错误**
   - 确保导入了正确的类型定义
   - 检查 TypeScript 配置
   - 更新到最新版本

## 📚 相关文档

- [VSCode 主题模拟系统详细文档](./README.md)
- [主题变量参考](./themes/)
- [Vite 插件配置](./utils/vite-plugin.ts)
- [类型定义](./utils/types.ts)
