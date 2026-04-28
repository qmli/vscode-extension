// ---------------------------------------------------------------------------
// 全局通知 / 广播协议（Global notifications / broadcast）
// ---------------------------------------------------------------------------

import { IpcCommand, IpcNotification, IpcRequest, scope } from './protocol';

/**
 * GlobalBroadcastNotification 用于在扩展与所有 webview 之间做简易的通道广播
 * - from extension -> all webviews
 * - from webview -> extension (extension 可决定是否转发给其它 webviews)
 */
export interface GlobalBroadcastParams {
  /** 频道名，便于区分不同广播通道 */
  channel: string;
  /** 可选载荷 */
  payload?: unknown;
}
export const GlobalBroadcastNotification = new IpcNotification<GlobalBroadcastParams>('core', 'global/broadcast');

/**
 * 订阅/取消订阅 全局频道（由 webview 发送到 extension，extension 根据订阅情况转发广播）
 */
export interface GlobalSubscribeParams {
  channel: string;
}
export const GlobalSubscribeCommand = new IpcCommand<GlobalSubscribeParams>('core', 'global/subscribe');
export const GlobalUnsubscribeCommand = new IpcCommand<GlobalSubscribeParams>('core', 'global/unsubscribe');

/**
 * 文件变更简要信息（用于集成连接状态通知）。
 */
export interface IntegrationFileChange {
  path: string;
  status: string;
  text?: string;
  originalPath?: string;
}

/**
 * 集成连接变化通知载荷。
 */
export type DidChangeIntegrationsConnectionsParams =
  | {
      recent: IntegrationFileChange[];
    }
  | undefined;

/**
 * DidChangeIntegrationsConnectionsNotification: 集成连接变化通知。
 */
export const DidChangeIntegrationsConnectionsNotification = new IpcNotification<DidChangeIntegrationsConnectionsParams>(
  scope,
  'integrations/didChange'
);

// ---------------------------------------------------------------------------
// 设置（configuration）相关的协议
// ---------------------------------------------------------------------------
/**
 * GetConfigurationRequest: 从 webview 请求获取设置值（可指定 key）
 * Response: { value }
 */
export interface GetConfigurationParams {
  /** 要查询的设置键，undefined 表示获取全部或默认行为由实现决定 */
  key?: string;
  /** 可选默认值，当未找到时返回该值 */
  defaultValue?: unknown;
}
export interface GetConfigurationResponse {
  value: unknown;
}
export const GetConfigurationRequest = new IpcRequest<GetConfigurationParams, GetConfigurationResponse>(
  'core',
  'settings/get'
);

/**
 * WatchConfigurationRequest: webview 请求订阅某个设置的变更（extension 返回 subscriptionId）
 * 用法示例：webview -> watch settings/key -> extension 保存订阅并在变更时推送 DidChangeConfigurationNotification
 */
export interface WatchConfigurationParams {
  /** 要监听的键，未指定则表示监听所有变化（实现可限制） */
  key?: string;
  /** 是否开始（true）或停止（false）监听；可用来复用同一请求 */
  watch: boolean;
  /** 可选，客户端生成的标识，extension 可回传以便管理 */
  subscriptionId?: string;
}
export interface WatchConfigurationResponse {
  subscriptionId: string;
}

export const WatchConfigurationRequest = new IpcRequest<WatchConfigurationParams, WatchConfigurationResponse>(
  'core',
  'settings/watch'
);

// ---------------------------------------------------------------------------
// 主题（Theme）相关协议
// ---------------------------------------------------------------------------

/**
 * 主题类型定义
 */
type CustomThemeKind = 'light' | 'dark';

/**
 * VS Code 内置主题名称
 */
type VSCodeThemeName =
  // Light themes
  | 'Default Light+'
  | 'Default Light Modern'
  | 'Light (Visual Studio)'
  | 'Quiet Light'
  | 'Solarized Light'
  // Dark themes
  | 'Default Dark+'
  | 'Default Dark Modern'
  | 'Dark (Visual Studio)'
  | 'Monokai'
  | 'Monokai Dimmed'
  | 'Dark+ (default dark)'
  | 'Tomorrow Night Blue'
  | 'Red'
  | 'Solarized Dark'
  // High Contrast themes
  | 'Default High Contrast'
  | 'Default High Contrast Light'
  // 自定义主题或其他
  | (string & {});

/**
 * 主题信息
 */
export type AppThemeType = VSCodeThemeName | CustomThemeKind;

/**
 * GetCurrentThemeRequest: 获取当前主题信息
 */
// export interface GetCurrentThemeResponse {
//   theme: AppThemeType;
// }
// export const GetCurrentThemeRequest = new IpcRequest<unknown, GetCurrentThemeResponse>(scope, 'theme/getCurrent');

/**
 * ChangeThemeCommand: 请求切换主题
 */
export interface ChangeThemeParams {
  /** 目标主题类型 */
  theme: AppThemeType;
}
export const ChangeThemeCommand = new IpcCommand<ChangeThemeParams>(scope, 'theme/change');

/**
 * DidChangeThemeNotification: 主题变更通知
 */
export interface DidChangeThemeParams {
  theme: AppThemeType;
}
export const DidChangeThemeNotification = new IpcNotification<DidChangeThemeParams>(scope, 'theme/didChange');

/**
 * GetAvailableThemesRequest: 获取可用主题列表
 */
export interface GetAvailableThemesResponse {
  themes: AppThemeType[];
}
export const GetAvailableThemesRequest = new IpcRequest<void, GetAvailableThemesResponse>(scope, 'theme/getAvailable');

// ---------------------------------------------------------------------------
// 语言/本地化（Language/Localization）相关协议
// ---------------------------------------------------------------------------

/**
 * 语言信息
 */
export interface LanguageInfo {
  /** 语言代码，如 'en', 'zh-cn', 'ja' */
  code: string;
  /** 显示名称 */
  displayName: string;
  /** 原生名称 */
  nativeName?: string;
  /** 是否为当前语言 */
  isCurrent?: boolean;
}

/**
 * GetCurrentLanguageRequest: 获取当前语言设置
 */
export interface GetCurrentLanguageResponse {
  language: LanguageInfo;
}
export const GetCurrentLanguageRequest = new IpcRequest<unknown, GetCurrentLanguageResponse>(
  scope,
  'language/getCurrent'
);

/**
 * ChangeLanguageCommand: 请求切换界面语言
 */
export interface ChangeLanguageParams {
  /** 目标语言代码 */
  languageCode: string;
  /** 是否立即生效（可能需要重启） */
  immediate?: boolean;
}
export const ChangeLanguageCommand = new IpcCommand<ChangeLanguageParams>(scope, 'language/change');

/**
 * DidChangeLanguageNotification: 语言变更通知
 */
export interface DidChangeLanguageParams {
  /** 新的语言信息 */
  language: LanguageInfo;
  /** 是否需要重启生效 */
  requiresRestart?: boolean;
  /** 变更来源 */
  source?: 'user' | 'system' | 'api';
}
export const DidChangeLanguageNotification = new IpcNotification<DidChangeLanguageParams>(scope, 'language/didChange');

/**
 * GetAvailableLanguagesRequest: 获取可用语言列表
 */
export interface GetAvailableLanguagesResponse {
  languages: LanguageInfo[];
}
export const GetAvailableLanguagesRequest = new IpcRequest<unknown, GetAvailableLanguagesResponse>(
  scope,
  'language/getAvailable'
);

/**
 * GetLocalizedStringRequest: 获取本地化字符串
 */
export interface GetLocalizedStringParams {
  /** 字符串键值 */
  key: string;
  /** 可选参数用于字符串插值 */
  args?: Record<string, string | number>;
  /** 可选默认值 */
  defaultValue?: string;
}
export interface GetLocalizedStringResponse {
  value: string;
}
export const GetLocalizedStringRequest = new IpcRequest<GetLocalizedStringParams, GetLocalizedStringResponse>(
  scope,
  'language/getLocalizedString'
);
