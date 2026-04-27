/**
 * Vue3 Webview 类型定义
 *
 * 提供Vue3 webview集成的完整类型支持
 */

import type { Pinia } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import type { Disposable } from '../browser/events';
import type { HostIpc, HostIpcApi } from '../browser/ipc';
import type {
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcCommand,
  IpcMessage,
  IpcRequest
} from '@packages/common/protocol';
import type { WebviewIds, WebviewViewIds } from '@packages/common/webviews/constants/constants.views';

/**
 * Vue3应用基础状态接口
 */
export interface Vue3AppBaseState {
  webviewId: WebviewIds | WebviewViewIds;
  timestamp: number;
}

/**
 * Vue3应用状态接口
 */
export interface Vue3AppState extends Vue3AppBaseState {
  [key: string]: any;
}

/**
 * Vue3应用配置接口
 */
export interface Vue3AppConfig {
  /** 应用名称 */
  appName: string;
  /** 是否启用状态持久化 */
  enableStatePersistence?: boolean;
  /** 是否启用焦点跟踪 */
  enableFocusTracking?: boolean;
  /** 是否启用可见性跟踪 */
  enableVisibilityTracking?: boolean;
  /** 初始化钩子 */
  onInitialize?: () => void | Promise<void>;
  /** 初始化完成钩子 */
  onInitialized?: () => void | Promise<void>;
  /** 消息接收钩子 */
  onMessageReceived?: (msg: IpcMessage) => void;
  /** 主题更新钩子 */
  onThemeUpdated?: (theme: string) => void;
  /** 语言变更钩子 */
  onLanguageChanged?: (language: string) => void;
}

/**
 * Vue3应用上下文接口
 */
export interface Vue3AppContext {
  /** 应用名称 */
  appName: string;
  /** 应用状态 */
  state: Ref;
  /** VS Code API实例 */
  api: HostIpcApi;
  /** IPC通信实例 */
  hostIpc: HostIpc;
  /** Pinia实例 */
  pinia: Pinia;
  /** 可释放资源列表 */
  disposables: Disposable[];
  /** 焦点状态 */
  focused: Ref<boolean>;
  /** 输入焦点状态 */
  inputFocused: Ref<boolean>;
  /** 可见性状态 */
  visible: Ref<boolean>;
}

/**
 * Vue3应用实例接口
 */
export interface Vue3AppInstance {
  /** 应用上下文 */
  context: Vue3AppContext;
  /** 发送命令方法 */
  sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => void;
  /** 发送请求方法 */
  sendRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  /** 设置状态方法 */
  setState: (state: Partial<any>) => void;
  /** 获取状态方法 */
  getState: () => any;
  /** 销毁方法 */
  dispose: () => void;
}

/**
 * Vue3应用生命周期状态接口
 */
export interface Vue3AppLifecycleState {
  /** 是否正在初始化 */
  isInitializing: Ref<boolean>;
  /** 是否已初始化 */
  isInitialized: Ref<boolean>;
  /** 是否已就绪 */
  isReady: Ref<boolean>;
  /** 是否正在销毁 */
  isDisposing: Ref<boolean>;
  /** 是否已销毁 */
  isDisposed: Ref<boolean>;
}

/**
 * Vue3应用生命周期钩子接口
 */
export interface Vue3AppLifecycleHooks {
  /** 初始化钩子 */
  onInitialize?: () => void | Promise<void>;
  /** 初始化完成钩子 */
  onInitialized?: () => void | Promise<void>;
  /** 就绪钩子 */
  onReady?: () => void | Promise<void>;
  /** 销毁钩子 */
  onDispose?: () => void | Promise<void>;
  /** 销毁完成钩子 */
  onDisposed?: () => void | Promise<void>;
}

/**
 * Vue3应用性能指标接口
 */
export interface Vue3AppPerformanceMetrics {
  /** 加载时间 */
  loadTime: number;
  /** 渲染时间 */
  renderTime: number;
  /** 内存使用量 */
  memoryUsage: number;
  /** 最后更新时间 */
  lastUpdate: number;
}

/**
 * Vue3应用资源管理接口
 */
export interface Vue3AppResourceManager {
  /** 已加载的资源 */
  resources: Ref<Set<string>>;
  /** 正在加载的资源 */
  loadingResources: Ref<Set<string>>;
  /** 加载失败的资源 */
  failedResources: Ref<Set<string>>;
  /** 加载资源方法 */
  loadResource: (url: string) => Promise<void>;
  /** 卸载资源方法 */
  unloadResource: (url: string) => void;
  /** 清理所有资源方法 */
  clearAllResources: () => void;
  /** 检查资源是否已加载 */
  isResourceLoaded: (url: string) => boolean;
  /** 检查资源是否正在加载 */
  isResourceLoading: (url: string) => boolean;
  /** 检查资源是否加载失败 */
  isResourceFailed: (url: string) => boolean;
}

/**
 * Vue3应用错误处理接口
 */
export interface Vue3AppErrorHandler {
  /** 错误对象 */
  error: Ref<Error | null>;
  /** 是否有错误 */
  hasError: Ref<boolean>;
  /** 设置错误方法 */
  setError: (err: Error | string) => void;
  /** 清除错误方法 */
  clearError: () => void;
  /** 处理错误方法 */
  handleError: (err: unknown) => void;
}

/**
 * Vue3应用主题接口
 */
export interface Vue3AppTheme {
  /** 当前主题 */
  theme: Ref<'light' | 'dark' | 'auto'>;
  /** 是否为深色主题 */
  isDark: ComputedRef<boolean>;
  /** 是否为浅色主题 */
  isLight: ComputedRef<boolean>;
  /** 是否为自动主题 */
  isAuto: ComputedRef<boolean>;
  /** 切换主题方法 */
  toggleTheme: () => void;
}

/**
 * Vue3应用语言接口
 */
export interface Vue3AppLanguage {
  /** 当前语言 */
  language: Ref<string>;
  /** 可用语言列表 */
  availableLanguages: Ref<string[]>;
  /** 是否为英语 */
  isEnglish: ComputedRef<boolean>;
  /** 是否为中文 */
  isChinese: ComputedRef<boolean>;
  /** 设置语言方法 */
  setLanguage: (lang: string) => void;
}

/**
 * Vue3应用连接状态接口
 */
export interface Vue3AppConnection {
  /** 连接状态 */
  connected: Ref<boolean>;
  /** 是否已连接 */
  isConnected: ComputedRef<boolean>;
  /** 最后心跳时间 */
  lastHeartbeat: Ref<number>;
  /** 更新心跳方法 */
  updateHeartbeat: () => void;
}

/**
 * Vue3应用焦点状态接口
 */
export interface Vue3AppFocus {
  /** 焦点状态 */
  focused: Ref<boolean>;
  /** 输入焦点状态 */
  inputFocused: Ref<boolean>;
  /** 是否有焦点 */
  isFocused: ComputedRef<boolean>;
  /** 是否有输入焦点 */
  isInputFocused: ComputedRef<boolean>;
  /** 是否有任何焦点 */
  isAnyFocused: ComputedRef<boolean>;
}

/**
 * Vue3应用可见性状态接口
 */
export interface Vue3AppVisibility {
  /** 可见性状态 */
  visible: Ref<boolean>;
  /** 是否可见 */
  isVisible: ComputedRef<boolean>;
  /** 是否隐藏 */
  isHidden: ComputedRef<boolean>;
}

/**
 * Vue3应用命令执行接口
 */
export interface Vue3AppCommands {
  /** 是否正在执行 */
  executing: Ref<boolean>;
  /** 最后错误 */
  lastError: Ref<Error | null>;
  /** 执行命令方法 */
  executeCommand: <TCommand extends IpcCommand<any>>(
    command: TCommand,
    params: IpcCallParamsType<TCommand>
  ) => Promise<void>;
  /** 执行请求方法 */
  executeRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  /** 是否正在执行 */
  isExecuting: ComputedRef<boolean>;
  /** 是否有错误 */
  hasError: ComputedRef<boolean>;
}

/**
 * Vue3应用事件监听接口
 */
export interface Vue3AppEvents {
  /** 添加事件监听器方法 */
  addEventListener: (event: string, handler: EventListener) => void;
  /** 移除事件监听器方法 */
  removeEventListener: (event: string) => void;
  /** 移除所有事件监听器方法 */
  removeAllEventListeners: () => void;
  /** 事件监听器列表 */
  eventListeners: ComputedRef<string[]>;
}

/**
 * Vue3应用状态管理接口
 */
export interface Vue3AppStateManager<T = any> {
  /** 本地状态 */
  state: Ref<T>;
  /** 保存状态方法 */
  saveState: (newState: Partial<T>) => void;
  /** 同步状态方法 */
  syncState: () => void;
  /** 获取持久化状态方法 */
  getPersistedState: () => T;
}

/**
 * Vue3应用IPC通信接口
 */
export interface Vue3AppIPC {
  /** 发送命令方法 */
  sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => void;
  /** 发送请求方法 */
  sendRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  /** 监听消息方法 */
  onMessage: (handler: (msg: IpcMessage) => void) => Disposable;
}

/**
 * Vue3应用Provider组件Props接口
 */
export interface Vue3AppProviderProps {
  /** 应用名称 */
  appName: string;
  /** 初始状态 */
  initialState?: any;
  /** 是否启用状态持久化 */
  enableStatePersistence?: boolean;
  /** 是否启用焦点跟踪 */
  enableFocusTracking?: boolean;
  /** 是否启用可见性跟踪 */
  enableVisibilityTracking?: boolean;
  /** 初始化钩子 */
  onInitialize?: () => void | Promise<void>;
  /** 初始化完成钩子 */
  onInitialized?: () => void | Promise<void>;
  /** 消息接收钩子 */
  onMessageReceived?: (msg: any) => void;
  /** 主题更新钩子 */
  onThemeUpdated?: (theme: string) => void;
  /** 语言变更钩子 */
  onLanguageChanged?: (language: string) => void;
}

/**
 * Vue3应用Provider组件暴露接口
 */
export interface Vue3AppProviderExpose {
  /** 应用实例 */
  app: Vue3AppInstance;
  /** 应用上下文 */
  context: Vue3AppContext;
  /** 是否已挂载 */
  isMounted: Ref<boolean>;
  /** 是否有焦点 */
  isFocused: ComputedRef<boolean>;
  /** 是否有输入焦点 */
  isInputFocused: ComputedRef<boolean>;
  /** 是否可见 */
  isVisible: ComputedRef<boolean>;
  /** 当前主题 */
  theme: Ref<'light' | 'dark' | 'auto'>;
}

/**
 * Vue3应用Composable返回类型
 */
export interface Vue3AppComposableReturn {
  /** 应用状态 */
  state: Ref;
  /** 焦点状态 */
  focused: Ref<boolean>;
  /** 输入焦点状态 */
  inputFocused: Ref<boolean>;
  /** 可见性状态 */
  visible: Ref<boolean>;
  /** 是否已连接 */
  isConnected: ComputedRef<boolean>;
  /** 是否有焦点 */
  isFocused: ComputedRef<boolean>;
  /** 是否有输入焦点 */
  isInputFocused: ComputedRef<boolean>;
  /** 是否可见 */
  isVisible: ComputedRef<boolean>;
  /** 发送命令方法 */
  sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => void;
  /** 发送请求方法 */
  sendRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  /** 设置状态方法 */
  setState: (newState: Partial<any>) => void;
  /** 获取状态方法 */
  getState: () => any;
}
