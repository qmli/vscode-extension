/**
 * Vue3 Webview Composables
 *
 * 提供Vue3 Composition API风格的webview功能集成
 */

import type { Ref } from 'vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Disposable } from '../browser/events';
import type {
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcCommand,
  IpcMessage,
  IpcRequest
} from '@shared/protocol';
// 导入全局应用实例
import { readCurrentTheme, THEMEATTR } from '../app/theme';
import { getVue3App } from '../app/vue3App';

/**
 * Webview IPC通信Composable
 * 提供类型安全的IPC通信功能
 */
export function useWebviewIPC(): {
  sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => void;
  sendRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  onMessage: (handler: (msg: IpcMessage) => void) => Disposable;
} {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = app.context;

  return {
    /**
     * 发送命令（单向通信）
     */
    sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => {
      context.hostIpc.sendCommand(command, params);
    },

    /**
     * 发送请求（双向通信）
     */
    sendRequest: <T extends IpcRequest<unknown, unknown>>(
      requestType: T,
      params: IpcCallParamsType<T>
    ): Promise<IpcCallResponseParamsType<T>> => {
      return context.hostIpc.sendRequest(requestType, params);
    },

    /**
     * 监听消息
     */
    onMessage: (handler: (msg: IpcMessage) => void): Disposable => {
      return context.hostIpc.onReceiveMessage(handler);
    }
  };
}

/**
 * Webview状态管理Composable
 * 提供状态持久化和同步功能
 */
export function useWebviewState<T = any>(
  initialState?: T
): {
  state: Ref<T>;
  saveState: (newState: Partial<T>) => void;
  syncState: () => void;
  getPersistedState: () => T;
} {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = app.context;
  const localState = ref<T>(initialState || context.state.value);

  // 同步本地状态与持久化状态
  const syncState = () => {
    const persistedState = context.api.getState() as T;
    if (persistedState) {
      localState.value = persistedState;
    }
  };

  // 保存状态到持久化存储
  const saveState = (newState: Partial<T>) => {
    localState.value = { ...localState.value, ...newState };
    context.api.setState(localState.value);
  };

  onMounted(() => {
    syncState();
  });

  return {
    state: localState as Ref<T>,
    saveState: saveState,
    syncState: syncState,
    getPersistedState: () => context.api.getState() as T
  };
}

/**
 * Webview焦点管理Composable
 * 提供焦点状态跟踪功能
 */
export function useWebviewFocus(): {
  focused: Ref<boolean>;
  inputFocused: Ref<boolean>;
  isFocused: Ref<boolean>;
  isInputFocused: Ref<boolean>;
  isAnyFocused: Ref<boolean>;
} {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = app.context;
  return {
    focused: context.focused,
    inputFocused: context.inputFocused,
    isFocused: computed(() => context.focused.value),
    isInputFocused: computed(() => context.inputFocused.value),
    isAnyFocused: computed(() => context.focused.value || context.inputFocused.value)
  };
}

/**
 * Webview可见性管理Composable
 * 提供可见性状态跟踪功能
 */
export function useWebviewVisibility(): {
  visible: Ref<boolean>;
  isVisible: Ref<boolean>;
  isHidden: Ref<boolean>;
} {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = app.context;

  return {
    visible: context.visible,
    isVisible: computed(() => context.visible.value),
    isHidden: computed(() => !context.visible.value)
  };
}

/**
 * Webview连接状态Composable
 * 提供连接状态监控功能
 */
export function useWebviewConnection(): {
  connected: Ref<boolean>;
  isConnected: Ref<boolean>;
  lastHeartbeat: Ref<number>;
  updateHeartbeat: () => void;
} {
  const connected = ref(true);
  const lastHeartbeat = ref(Date.now());

  const isConnected = computed(() => {
    const now = Date.now();
    return connected.value && now - lastHeartbeat.value < 30000; // 30秒超时
  });

  const updateHeartbeat = () => {
    lastHeartbeat.value = Date.now();
  };

  onMounted(() => {
    // 定期检查连接状态
    const interval = setInterval(() => {
      updateHeartbeat();
    }, 5000);

    onUnmounted(() => {
      clearInterval(interval);
    });
  });

  return {
    connected: connected,
    isConnected: isConnected,
    lastHeartbeat: lastHeartbeat,
    updateHeartbeat: updateHeartbeat
  };
}

// 单例：全局共享的主题响应式状态与 observer
const _themeRef = ref<'light' | 'dark' | 'auto'>(readCurrentTheme());
const _themeObserver = new MutationObserver(() => {
  _themeRef.value = readCurrentTheme();
});
const _startThemeObserve = () => {
  _themeObserver.observe(document.body, { attributes: true, attributeFilter: [THEMEATTR] });
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _startThemeObserve, { once: true });
} else {
  _startThemeObserve();
}

/**
 * Webview主题管理Composable
 * 提供主题切换和监听功能
 */
export function useWebviewTheme(): {
  theme: Ref<'light' | 'dark' | 'auto'>;
  isDark: Ref<boolean>;
  isLight: Ref<boolean>;
  isAuto: Ref<boolean>;
  toggleTheme: () => void;
} {
  const isDark = computed(() => _themeRef.value === 'dark');
  const isLight = computed(() => _themeRef.value === 'light');
  const isAuto = computed(() => _themeRef.value === 'auto');

  const toggleTheme = () => {
    _themeRef.value = _themeRef.value === 'light' ? 'dark' : 'light';
  };

  return {
    theme: _themeRef,
    isDark: isDark,
    isLight: isLight,
    isAuto: isAuto,
    toggleTheme: toggleTheme
  };
}

/**
 * Webview语言管理Composable
 * 提供语言切换和监听功能
 */
export function useWebviewLanguage(): {
  language: Ref<string>;
  availableLanguages: Ref<string[]>;
  isEnglish: Ref<boolean>;
  isChinese: Ref<boolean>;
  setLanguage: (lang: string) => void;
} {
  // const context = useVue3App();
  const language = ref('en');
  const availableLanguages = ref<string[]>(['en', 'zh-cn']);

  const isEnglish = computed(() => language.value === 'en');
  const isChinese = computed(() => language.value === 'zh-cn');

  const setLanguage = (lang: string) => {
    if (availableLanguages.value.includes(lang)) {
      language.value = lang;
      // 这里可以发送语言切换命令到扩展
    }
  };

  return {
    language: language,
    availableLanguages: availableLanguages,
    isEnglish: isEnglish,
    isChinese: isChinese,
    setLanguage: setLanguage
  };
}

/**
 * Webview命令执行Composable
 * 提供命令执行和结果处理功能
 */
export function useWebviewCommands(): {
  executing: Ref<boolean>;
  lastError: Ref<Error | null>;
  executeCommand: <TCommand extends IpcCommand<any>>(
    command: TCommand,
    params: IpcCallParamsType<TCommand>
  ) => Promise<void>;
  executeRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  isExecuting: Ref<boolean>;
  hasError: Ref<boolean>;
} {
  const { sendCommand, sendRequest } = useWebviewIPC();
  const executing = ref(false);
  const lastError = ref<Error | null>(null);

  const executeCommand = async <TCommand extends IpcCommand<any>>(
    command: TCommand,
    params: IpcCallParamsType<TCommand>
  ): Promise<void> => {
    try {
      executing.value = true;
      lastError.value = null;
      await new Promise<void>((resolve) => {
        sendCommand(command, params);
        resolve();
      });
    } catch (error) {
      lastError.value = error instanceof Error ? error : new Error('Unknown error');
      throw error;
    } finally {
      executing.value = false;
    }
  };

  const executeRequest = async <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => {
    try {
      executing.value = true;
      lastError.value = null;
      return await sendRequest(requestType, params);
    } catch (error) {
      lastError.value = error instanceof Error ? error : new Error('Unknown error');
      throw error;
    } finally {
      executing.value = false;
    }
  };

  return {
    executing: executing,
    lastError: lastError,
    executeCommand: executeCommand,
    executeRequest: executeRequest,
    isExecuting: computed(() => executing.value),
    hasError: computed(() => lastError.value !== null)
  };
}

/**
 * Webview事件监听Composable
 * 提供自定义事件监听功能
 */
export function useWebviewEvents(): {
  addEventListener: (event: string, handler: EventListener) => void;
  removeEventListener: (event: string) => void;
  removeAllEventListeners: () => void;
  eventListeners: Ref<string[]>;
} {
  // const context = useVue3App();
  const eventListeners = ref<Map<string, EventListener>>(new Map());

  const addEventListener = (event: string, handler: EventListener) => {
    window.addEventListener(event, handler);
    eventListeners.value.set(event, handler);
  };

  const removeEventListener = (event: string) => {
    const handler = eventListeners.value.get(event);
    if (handler) {
      window.removeEventListener(event, handler);
      eventListeners.value.delete(event);
    }
  };

  const removeAllEventListeners = () => {
    eventListeners.value.forEach((handler, event) => {
      window.removeEventListener(event, handler);
    });
    eventListeners.value.clear();
  };

  onUnmounted(() => {
    removeAllEventListeners();
  });

  return {
    addEventListener: addEventListener,
    removeEventListener: removeEventListener,
    removeAllEventListeners: removeAllEventListeners,
    eventListeners: computed(() => Array.from(eventListeners.value.keys()))
  };
}

/**
 * Webview生命周期Composable
 * 提供简单的应用生命周期管理功能
 */
export function useSimpleWebviewLifecycle(): {
  isInitialized: Ref<boolean>;
  isReady: Ref<boolean>;
  initialize: () => void;
} {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = app.context;
  const isInitialized = ref(false);
  const isReady = ref(false);

  const initialize = () => {
    if (isInitialized.value) return;

    try {
      isInitialized.value = true;
      // 发送就绪命令
      context.hostIpc.sendCommand({ method: 'webview/ready' } as any, undefined);
      isReady.value = true;
    } catch (error) {
      console.error('Failed to initialize webview:', error);
      isInitialized.value = false;
    }
  };

  onMounted(() => {
    initialize();
  });

  return {
    isInitialized: isInitialized,
    isReady: isReady,
    initialize: initialize
  };
}
