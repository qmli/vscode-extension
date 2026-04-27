/**
 * VSCode 主题模拟系统入口文件
 */

// 导出 Vite 插件
export { vscodeThemePlugin } from '@/styles/mock/utils/vite-plugin';

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
} from '@/styles/mock/utils/types';

// 导入样式
import '../index.scss';
