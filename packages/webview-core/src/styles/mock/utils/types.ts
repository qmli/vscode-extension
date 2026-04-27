/**
 * VSCode 主题模拟系统类型定义
 */

export interface ThemeInfo {
  /** 主题唯一标识 */
  id: string;
  /** 主题名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 主题描述 */
  description: string;
  /** 是否为深色主题 */
  isDark: boolean;
  /** 主题变量 */
  variables: Record<string, string>;
  /** 主题作者 */
  author?: string;
  /** 主题版本 */
  version?: string;
  /** 主题标签 */
  tags?: string[];
}

export interface ThemeManagerOptions {
  /** 默认主题 */
  defaultTheme?: string;
  /** 启用开发工具 */
  enableDevTools?: boolean;
  /** 启用性能监控 */
  enablePerformanceMonitoring?: boolean;
  /** 本地存储键名 */
  storageKey?: string;
  /** 自动检测系统主题 */
  autoDetectSystemTheme?: boolean;
  /** 主题切换动画时长 */
  transitionDuration?: number;
  /** 调试模式 */
  debug?: boolean;
}

export interface ThemeChangeEvent {
  /** 主题信息 */
  theme: ThemeInfo;
  /** 主题ID */
  themeId: string;
  /** 是否为深色主题 */
  isDark: boolean;
  /** 切换时间戳 */
  timestamp: number;
}

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
  /** 主题切换快捷键 */
  hotkey?: string;
  /** 是否在控制台显示主题信息 */
  showThemeInfo?: boolean;
}

export interface ThemeVariable {
  /** 变量名 */
  name: string;
  /** 变量值 */
  value: string;
  /** 变量描述 */
  description?: string;
  /** 变量类型 */
  type?: 'color' | 'size' | 'spacing' | 'font' | 'shadow' | 'border' | 'other';
  /** 是否可编辑 */
  editable?: boolean;
}

export interface ThemeDebugInfo {
  /** 当前主题 */
  currentTheme: string;
  /** 主题变量数量 */
  variableCount: number;
  /** 性能指标 */
  performance: {
    /** 主题切换耗时 */
    switchTime: number;
    /** 变量应用耗时 */
    applyTime: number;
    /** 内存使用量 */
    memoryUsage: number;
  };
  /** 浏览器信息 */
  browser: {
    /** 用户代理 */
    userAgent: string;
    /** 是否支持CSS变量 */
    supportsCSSVariables: boolean;
    /** 是否支持系统主题检测 */
    supportsSystemTheme: boolean;
  };
}

export interface ThemeExportData {
  /** 主题信息 */
  theme: ThemeInfo;
  /** 导出时间戳 */
  timestamp: number;
  /** 用户代理 */
  userAgent: string;
  /** 版本信息 */
  version: string;
  /** 配置信息 */
  config: ThemeManagerOptions;
}

export interface ThemeImportData extends ThemeExportData {
  /** 导入时间戳 */
  importTimestamp: number;
  /** 导入来源 */
  source: 'file' | 'url' | 'clipboard';
}

export interface ThemePerformanceMetrics {
  /** 主题切换次数 */
  switchCount: number;
  /** 平均切换时间 */
  averageSwitchTime: number;
  /** 最大切换时间 */
  maxSwitchTime: number;
  /** 最小切换时间 */
  minSwitchTime: number;
  /** 变量应用次数 */
  variableApplyCount: number;
  /** 平均变量应用时间 */
  averageApplyTime: number;
}

export interface ThemeStorageData {
  /** 当前主题 */
  theme: string;
  /** 保存时间戳 */
  timestamp: number;
  /** 配置信息 */
  config?: Partial<ThemeManagerOptions>;
  /** 性能数据 */
  performance?: ThemePerformanceMetrics;
}

export interface ThemeEventHandlers {
  /** 主题切换前 */
  onBeforeSwitch?: (themeId: string) => void | Promise<void>;
  /** 主题切换后 */
  onAfterSwitch?: (event: ThemeChangeEvent) => void | Promise<void>;
  /** 主题加载前 */
  onBeforeLoad?: (themeId: string) => void | Promise<void>;
  /** 主题加载后 */
  onAfterLoad?: (theme: ThemeInfo) => void | Promise<void>;
  /** 主题保存前 */
  onBeforeSave?: (theme: ThemeInfo) => void | Promise<void>;
  /** 主题保存后 */
  onAfterSave?: (theme: ThemeInfo) => void | Promise<void>;
  /** 主题删除前 */
  onBeforeDelete?: (themeId: string) => void | Promise<void>;
  /** 主题删除后 */
  onAfterDelete?: (themeId: string) => void | Promise<void>;
}

export interface ThemeValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
  /** 建议信息 */
  suggestions: string[];
}

export interface ThemeComparisonResult {
  /** 主题A */
  themeA: ThemeInfo;
  /** 主题B */
  themeB: ThemeInfo;
  /** 差异变量 */
  differences: Array<{
    /** 变量名 */
    name: string;
    /** 主题A的值 */
    valueA: string;
    /** 主题B的值 */
    valueB: string;
    /** 差异类型 */
    type: 'added' | 'removed' | 'changed';
  }>;
  /** 相似度 */
  similarity: number;
}

export interface ThemeGeneratorOptions {
  /** 基础主题 */
  baseTheme?: string;
  /** 生成规则 */
  rules: {
    /** 主色调 */
    primaryColor?: string;
    /** 背景色 */
    backgroundColor?: string;
    /** 前景色 */
    foregroundColor?: string;
    /** 强调色 */
    accentColor?: string;
    /** 错误色 */
    errorColor?: string;
    /** 警告色 */
    warningColor?: string;
    /** 成功色 */
    successColor?: string;
    /** 信息色 */
    infoColor?: string;
  };
  /** 自定义变量 */
  customVariables?: Record<string, string>;
  /** 是否生成深色版本 */
  generateDark?: boolean;
  /** 是否生成浅色版本 */
  generateLight?: boolean;
}

export interface ThemeGeneratorResult {
  /** 生成的主题 */
  themes: ThemeInfo[];
  /** 生成时间 */
  generationTime: number;
  /** 生成的变量数量 */
  variableCount: number;
  /** 生成规则 */
  rules: ThemeGeneratorOptions['rules'];
}

export interface ThemeAnalyzerResult {
  /** 主题ID */
  themeId: string;
  /** 分析时间 */
  analysisTime: number;
  /** 变量统计 */
  variables: {
    /** 总数量 */
    total: number;
    /** 颜色变量数量 */
    colors: number;
    /** 尺寸变量数量 */
    sizes: number;
    /** 间距变量数量 */
    spacing: number;
    /** 字体变量数量 */
    fonts: number;
    /** 阴影变量数量 */
    shadows: number;
    /** 边框变量数量 */
    borders: number;
    /** 其他变量数量 */
    others: number;
  };
  /** 颜色分析 */
  colors: {
    /** 主色调 */
    primary: string;
    /** 背景色 */
    background: string;
    /** 前景色 */
    foreground: string;
    /** 调色板 */
    palette: string[];
    /** 对比度 */
    contrast: number;
    /** 亮度 */
    brightness: number;
    /** 饱和度 */
    saturation: number;
  };
  /** 兼容性 */
  compatibility: {
    /** 浏览器支持度 */
    browserSupport: number;
    /** 变量使用率 */
    variableUsage: number;
    /** 性能评分 */
    performanceScore: number;
  };
}

// 事件类型
export type ThemeEventType =
  | 'theme-change'
  | 'theme-load'
  | 'theme-save'
  | 'theme-delete'
  | 'theme-import'
  | 'theme-export'
  | 'theme-validate'
  | 'theme-compare'
  | 'theme-generate'
  | 'theme-analyze';

// 主题状态
export type ThemeState = 'loading' | 'loaded' | 'error' | 'switching';

// 主题类型
export type ThemeType = 'light' | 'dark' | 'auto' | 'custom';

// 主题来源
export type ThemeSource = 'builtin' | 'custom' | 'imported' | 'generated';

// 主题状态
export type ThemeStatus = 'active' | 'inactive' | 'disabled' | 'deprecated';
