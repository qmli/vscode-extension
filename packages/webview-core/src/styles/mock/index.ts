/**
 * VSCode 主题模拟系统独立入口
 *
 * 这个文件用于独立编译 mock/styles 的 CSS 和 JavaScript 功能
 * 与主要的 webview-core.css 分离，避免不必要的样式包含
 */

// 注意：主题管理器已删除

// 导出 Vite 插件
export { vscodeThemePlugin } from './utils/vite-plugin';

// 导出类型定义
export type {
  ThemeInfo,
  ThemeManagerOptions,
  ThemeChangeEvent,
  VSCodeThemePluginOptions,
  ThemeVariable,
  ThemeDebugInfo,
  ThemeExportData,
  ThemeImportData,
  ThemePerformanceMetrics,
  ThemeStorageData,
  ThemeEventHandlers,
  ThemeValidationResult,
  ThemeComparisonResult,
  ThemeGeneratorOptions,
  ThemeGeneratorResult,
  ThemeAnalyzerResult,
  ThemeEventType,
  ThemeState,
  ThemeType,
  ThemeSource,
  ThemeStatus
} from './utils/types';

// 导入 mock 样式
import './index.scss';
