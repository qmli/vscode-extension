/**
 * Vite 插件：VSCode 主题模拟
 * 为 Vite 开发环境提供 VSCode 主题模拟功能
 */

import type { Plugin } from 'vite';

export interface VSCodeThemePluginOptions {
  /** 默认主题 */
  defaultTheme?: 'theme-light-vars' | 'theme-dark-vars' | 'auto';
  /** 启用开发工具 */
  enableDevTools?: boolean;
  /** 启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 自动注入样式 */
  autoInjectStyles?: boolean;
  /** 自定义主题路径 */
  customThemesPath?: string;
  /** 调试模式 */
  debug?: boolean;
}

export function vscodeThemePlugin(options: VSCodeThemePluginOptions = {}): Plugin {
  const { defaultTheme = 'theme-dark-vars', autoInjectStyles = true } = options;

  let isDev = false;

  return {
    name: 'vscode-theme-mock',
    configResolved: function (config) {
      isDev = config.command === 'serve';
    },
    configureServer: function (server) {
      if (!isDev) return;

      // 添加中间件来注入主题模拟脚本
      server.middlewares.use('/vscode-theme-mock', (req, res, next) => {
        if (req.url === '/vscode-theme-mock/theme-styles.css') {
          res.setHeader('Content-Type', 'text/css');
          res.end(generateThemeStyles());
        } else {
          next();
        }
      });
    },
    transformIndexHtml: function (html) {
      if (!isDev || !autoInjectStyles) return html;

      const themeScript = `
        <script type="module">
          // 主题管理器已删除，使用简化的主题切换
          document.documentElement.setAttribute('data-theme', '${defaultTheme}');

          // 监听主题变化
          window.addEventListener('vscode-theme-change', (e) => {
            console.log('Theme changed to:', e.detail.themeId);
            document.documentElement.setAttribute('data-theme', e.detail.themeId);
          });
        </script>
      `;

      const themeStyles = `
        <link rel="stylesheet" href="/vscode-theme-mock/theme-styles.css">
      `;

      return html.replace('<head>', `<head>${themeStyles}${themeScript}`);
    }
  };
}

/**
 * 生成主题样式
 */
function generateThemeStyles(): string {
  return `
    /* VSCode 主题模拟样式 - 自动生成 */
    :root {
      /* 基础颜色变量 */
      --vscode-editor-background: #1e1e1e;
      --vscode-editor-foreground: #d4d4d4;
      --vscode-sideBar-background: #252526;
      --vscode-titleBar-activeBackground: #3c3c3c;
      --vscode-titleBar-activeForeground: #cccccc;
      --vscode-titleBar-inactiveBackground: #2d2d30;
      --vscode-titleBar-inactiveForeground: #cccccc80;
      --vscode-activityBar-background: #333333;
      --vscode-activityBar-foreground: #ffffff;
      --vscode-statusBar-background: #007acc;
      --vscode-statusBar-foreground: #ffffff;
      --vscode-panel-background: #1e1e1e;
      --vscode-panel-border: #3c3c3c;
      --vscode-input-background: #3c3c3c;
      --vscode-input-foreground: #cccccc;
      --vscode-input-border: #3c3c3c;
      --vscode-button-background: #0e639c;
      --vscode-button-foreground: #ffffff;
      --vscode-button-hoverBackground: #1177bb;
      --vscode-dropdown-background: #3c3c3c;
      --vscode-dropdown-foreground: #cccccc;
      --vscode-dropdown-border: #3c3c3c;
      --vscode-checkbox-background: #3c3c3c;
      --vscode-checkbox-foreground: #cccccc;
      --vscode-checkbox-border: #3c3c3c;
      --vscode-scrollbarSlider-background: #79797966;
      --vscode-scrollbarSlider-hoverBackground: #646464b3;
      --vscode-scrollbarSlider-activeBackground: #bfbfbf66;
      --vscode-badge-background: #4d4d4d;
      --vscode-badge-foreground: #ffffff;
      --vscode-progressBar-background: #0e70c0;
      --vscode-list-activeSelectionBackground: #094771;
      --vscode-list-activeSelectionForeground: #ffffff;
      --vscode-list-hoverBackground: #2a2d2e;
      --vscode-list-inactiveSelectionBackground: #3c3c3c;
      --vscode-list-inactiveSelectionForeground: #cccccc;
      --vscode-list-focusBackground: #094771;
      --vscode-list-focusForeground: #ffffff;
      --vscode-list-hoverForeground: #ffffff;
      --vscode-list-inactiveFocusBackground: #3c3c3c;
      --vscode-list-inactiveFocusForeground: #cccccc;
      --vscode-list-inactiveHoverBackground: #2a2d2e;
      --vscode-list-inactiveHoverForeground: #cccccc;
      --vscode-list-dropBackground: #383b3d;
      --vscode-list-highlightForeground: #0078d4;
      --vscode-list-invalidItemForeground: #f44747;
      --vscode-list-errorForeground: #f44747;
      --vscode-list-warningForeground: #ffcc02;
      --vscode-list-infoForeground: #75beff;
      --vscode-list-deemphasizedForeground: #8c8c8c;
      --vscode-tree-indentGuidesStroke: #404040;
      --vscode-tree-tableColumnsBorder: #cccccc20;
      --vscode-tree-tableOddRowsBackground: #cccccc08;
      --vscode-tree-inactiveIndentGuidesStroke: #40404040;
      --vscode-tree-hoverBackground: #2a2d2e;
      --vscode-tree-tableColumnsBorder: #cccccc20;
      --vscode-tree-tableOddRowsBackground: #cccccc08;
      --vscode-tree-inactiveIndentGuidesStroke: #40404040;
      --vscode-tree-hoverBackground: #2a2d2e;
      --vscode-tree-tableColumnsBorder: #cccccc20;
      --vscode-tree-tableOddRowsBackground: #cccccc08;
      --vscode-tree-inactiveIndentGuidesStroke: #40404040;
      --vscode-tree-hoverBackground: #2a2d2e;
      --vscode-tree-tableColumnsBorder: #cccccc20;
      --vscode-tree-tableOddRowsBackground: #cccccc08;
      --vscode-tree-inactiveIndentGuidesStroke: #40404040;
      --vscode-tree-hoverBackground: #2a2d2e;
    }

    /* 浅色主题 */
    [data-theme="theme-light-vars"] {
      --vscode-editor-background: #ffffff;
      --vscode-editor-foreground: #333333;
      --vscode-sideBar-background: #f3f3f3;
      --vscode-titleBar-activeBackground: #ffffff;
      --vscode-titleBar-activeForeground: #333333;
      --vscode-titleBar-inactiveBackground: #f3f3f3;
      --vscode-titleBar-inactiveForeground: #33333380;
      --vscode-activityBar-background: #f3f3f3;
      --vscode-activityBar-foreground: #333333;
      --vscode-statusBar-background: #007acc;
      --vscode-statusBar-foreground: #ffffff;
      --vscode-panel-background: #ffffff;
      --vscode-panel-border: #e1e1e1;
      --vscode-input-background: #ffffff;
      --vscode-input-foreground: #333333;
      --vscode-input-border: #e1e1e1;
      --vscode-button-background: #007acc;
      --vscode-button-foreground: #ffffff;
      --vscode-button-hoverBackground: #1177bb;
      --vscode-dropdown-background: #ffffff;
      --vscode-dropdown-foreground: #333333;
      --vscode-dropdown-border: #e1e1e1;
      --vscode-checkbox-background: #ffffff;
      --vscode-checkbox-foreground: #333333;
      --vscode-checkbox-border: #e1e1e1;
      --vscode-scrollbarSlider-background: #79797966;
      --vscode-scrollbarSlider-hoverBackground: #646464b3;
      --vscode-scrollbarSlider-activeBackground: #bfbfbf66;
      --vscode-badge-background: #4d4d4d;
      --vscode-badge-foreground: #ffffff;
      --vscode-progressBar-background: #0e70c0;
      --vscode-list-activeSelectionBackground: #e3f2fd;
      --vscode-list-activeSelectionForeground: #333333;
      --vscode-list-hoverBackground: #f5f5f5;
      --vscode-list-inactiveSelectionBackground: #e8e8e8;
      --vscode-list-inactiveSelectionForeground: #333333;
      --vscode-list-focusBackground: #e3f2fd;
      --vscode-list-focusForeground: #333333;
      --vscode-list-hoverForeground: #333333;
      --vscode-list-inactiveFocusBackground: #e8e8e8;
      --vscode-list-inactiveFocusForeground: #333333;
      --vscode-list-inactiveHoverBackground: #f5f5f5;
      --vscode-list-inactiveHoverForeground: #333333;
      --vscode-list-dropBackground: #e8e8e8;
      --vscode-list-highlightForeground: #0078d4;
      --vscode-list-invalidItemForeground: #f44747;
      --vscode-list-errorForeground: #f44747;
      --vscode-list-warningForeground: #ffcc02;
      --vscode-list-infoForeground: #75beff;
      --vscode-list-deemphasizedForeground: #8c8c8c;
      --vscode-tree-indentGuidesStroke: #e1e1e1;
      --vscode-tree-tableColumnsBorder: #33333320;
      --vscode-tree-tableOddRowsBackground: #33333308;
      --vscode-tree-inactiveIndentGuidesStroke: #e1e1e140;
      --vscode-tree-hoverBackground: #f5f5f5;
    }
  `;
}
