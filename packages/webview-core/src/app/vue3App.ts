/**
 * Vue3 Webview 应用适配器
 *
 * Vue3 Composition API的webview应用适配器，
 *
 * 主要特性：
 * - 基于Vue3 Composition API设计
 * - 支持Pinia状态管理
 * - 提供Vue3生命周期钩子
 * - 类型安全的IPC通信
 * - 自动状态持久化
 * - 主题和语言切换支持
 */
import { createPinia } from 'pinia';
import type { Ref } from 'vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type {
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcCommand,
  IpcMessage,
  IpcRequest,
  WebviewFocusChangedParams
} from '@shared/protocol';
import {
  DidChangeWebviewFocusNotification,
  DidChangeWebviewVisibilityNotification,
  WebviewFocusChangedCommand,
  WebviewReadyCommand
} from '@shared/protocol';
import { DOM } from '../browser/dom';
import type { Disposable } from '../browser/events';
import { getHostIpcApi, HostIpc } from '../browser/ipc';
// 导入类型定义
import type { Vue3AppConfig, Vue3AppContext, Vue3AppInstance } from '../types/vue3';
import { debounce } from '../utils';
import { watchThemeColors } from './theme';

// 全局应用实例
let globalAppInstance: Vue3AppInstance | null = null;

/**
 * 创建Vue3 Webview应用，在vue 项目只创建一次，避免不可必要的错误
 *
 * @param config 应用配置
 * @returns Vue3应用实例
 */
export function createVue3App(config: Vue3AppConfig): Vue3AppInstance {
  if (globalAppInstance) {
    console.warn('Vue3 app instance already exists, returning existing instance');
    return globalAppInstance;
  }

  const disposables: Disposable[] = [];
  const api = getHostIpcApi();
  const hostIpc = new HostIpc(config.appName);
  const pinia = createPinia();

  // 响应式状态
  const state = ref((window as any).bootstrap);
  const focused = ref(false);
  const inputFocused = ref(false);
  const visible = ref(true);

  // 清理bootstrap数据
  (window as any).bootstrap = undefined;

  // 创建应用上下文
  const context: Vue3AppContext = {
    appName: config.appName,
    state: state,
    api: api,
    hostIpc: hostIpc,
    pinia: pinia,
    disposables: disposables,
    focused: focused,
    inputFocused: inputFocused,
    visible: visible
  };

  // 状态持久化处理
  // 当 webview 被销毁后重建时（如切换工作区、切换活动栏），getState() 会返回上次保存的状态
  if (config.enableStatePersistence !== false && api) {
    const persistedState = api.getState();
    if (persistedState != null) {
      // 有持久化状态：优先使用（覆盖 initialState/bootstrap）
      if (state.value != null) {
        const currentTimestamp = (state.value as any)?.timestamp ?? 0;
        const persistedTimestamp = (persistedState as any)?.timestamp ?? 0;
        if (currentTimestamp >= persistedTimestamp) {
          api.setState(state.value);
        } else {
          state.value = persistedState;
        }
      } else {
        state.value = persistedState;
      }
    } else if (state.value != null) {
      // 无持久化状态但有初始状态：保存到持久化
      api.setState(state.value);
    }
  }
  // 消息处理
  if (config.onMessageReceived) {
    disposables.push(
      hostIpc.onReceiveMessage((msg) => {
        switch (true) {
          case DidChangeWebviewFocusNotification.is(msg): {
            const focusParams = msg.params as { focused: boolean };
            focused.value = focusParams.focused;
            window.dispatchEvent(new CustomEvent(focusParams.focused ? 'webview-focus' : 'webview-blur'));
            break;
          }

          case DidChangeWebviewVisibilityNotification.is(msg): {
            const visibilityParams = msg.params as { visible: boolean };
            visible.value = visibilityParams.visible;
            window.dispatchEvent(new CustomEvent(visibilityParams.visible ? 'webview-visible' : 'webview-hidden'));
            break;
          }

          default:
            config.onMessageReceived?.(msg);
        }
      })
    );
  }

  // 焦点跟踪
  if (config.enableFocusTracking !== false && api) {
    const sendWebviewFocusChangedCommand = debounce((params: WebviewFocusChangedParams) => {
      hostIpc.sendCommand(WebviewFocusChangedCommand, params);
    }, 150);

    disposables.push(
      DOM.on(document, 'focusin', (e) => {
        const inputFocusedValue = e.composedPath().some((el) => (el as HTMLElement).tagName === 'INPUT');

        if (focused.value !== true || inputFocused.value !== inputFocusedValue) {
          focused.value = true;
          inputFocused.value = inputFocusedValue;
          sendWebviewFocusChangedCommand({ focused: true, inputFocused: inputFocusedValue });
        }
      }),
      DOM.on(document, 'focusout', () => {
        if (focused.value !== false || inputFocused.value !== false) {
          focused.value = false;
          inputFocused.value = false;
          sendWebviewFocusChangedCommand({ focused: false, inputFocused: false });
        }
      })
    );
  }

  watchThemeColors();
  // 页面卸载清理
  disposables.push(
    DOM.on(window, 'pagehide', () => {
      disposables.forEach((d) => d.dispose());
    })
  );

  // 创建应用实例
  const appInstance: Vue3AppInstance = {
    context: context,
    sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => {
      hostIpc.sendCommand(command, params);
    },
    sendRequest: <T extends IpcRequest<unknown, unknown>>(requestType: T, params: IpcCallParamsType<T>) => {
      return hostIpc.sendRequest(requestType, params);
    },
    setState: (newState: Partial<any>) => {
      state.value = { ...state.value, ...newState };
      api.setState(state.value);
    },
    getState: () => {
      return api.getState();
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
      hostIpc.dispose();
      globalAppInstance = null;
    }
  };

  // 初始化应用
  requestAnimationFrame(async () => {
    try {
      await config.onInitialize?.();

      // 发送就绪命令
      appInstance.sendCommand(WebviewReadyCommand, undefined);

      await config.onInitialized?.();
    } finally {
      if (document.body.classList.contains('preload')) {
        setTimeout(() => {
          document.body.classList.remove('preload');
        }, 500);
      }
    }
  });

  globalAppInstance = appInstance;
  return appInstance;
}

/**
 * 获取当前Vue3应用实例
 *
 * @returns 当前应用实例或null
 */
export function getVue3App(): Vue3AppInstance | null {
  return globalAppInstance;
}

/**
 * 获取Vue3应用上下文（单例模式）
 *
 * @returns 应用上下文
 */
export function useVue3App(): Vue3AppContext {
  if (!globalAppInstance) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }
  return globalAppInstance.context;
}

/**
 * Vue3应用Composable（单例模式）
 * 提供应用级别的状态和方法
 */
export function useApp(): {
  state: Ref<any, any>;
  focused: Ref<boolean>;
  inputFocused: Ref<boolean>;
  visible: Ref<boolean>;
  isConnected: Ref<boolean>;
  isFocused: Ref<boolean>;
  isInputFocused: Ref<boolean>;
  isVisible: Ref<boolean>;
  sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => void;
  sendRequest: <T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ) => Promise<IpcCallResponseParamsType<T>>;
  setState: (newState: Partial<any>) => void;
  getState: () => any;
} {
  if (!globalAppInstance) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = globalAppInstance.context;

  return {
    // 状态
    state: context.state,
    focused: context.focused,
    inputFocused: context.inputFocused,
    visible: context.visible,

    // 计算属性
    isConnected: computed(() => context.hostIpc !== null),
    isFocused: computed(() => context.focused.value),
    isInputFocused: computed(() => context.inputFocused.value),
    isVisible: computed(() => context.visible.value),

    // 方法
    sendCommand: <TCommand extends IpcCommand<any>>(command: TCommand, params: IpcCallParamsType<TCommand>) => {
      context.hostIpc.sendCommand(command, params);
    },
    sendRequest: <T extends IpcRequest<unknown, unknown>>(requestType: T, params: IpcCallParamsType<T>) => {
      return context.hostIpc.sendRequest(requestType, params);
    },
    setState: (newState: Partial<any>) => {
      context.state.value = { ...context.state.value, ...newState };
      context.api.setState(context.state.value);
    },
    getState: () => {
      return context.api.getState();
    }
  };
}

/**
 * Vue3应用生命周期Composable（单例模式）目前没有使用场景不推荐使用
 * 提供应用级别的生命周期管理
 */
export function useAppLifecycle(config: Partial<Vue3AppConfig> = {}): {
  context: Vue3AppContext;
  isMounted: Ref<boolean>;
} {
  if (!globalAppInstance) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const context = globalAppInstance.context;

  onMounted(async () => {
    if (config.onInitialize) {
      await config.onInitialize();
    }
  });

  onUnmounted(() => {
    if (config.onInitialized) {
      void config.onInitialized();
    }
  });

  return {
    context: context,
    isMounted: ref(false)
  };
}

/**
 * Vue3应用消息处理Composable（单例模式）
 * 提供消息监听和处理功能
 */
export function useAppMessages(messageHandler: (msg: IpcMessage) => void): {
  sendMessage: HostIpc['sendCommand'];
  requestMessage: HostIpc['sendRequest'];
  disposable: Disposable;
} {
  if (!globalAppInstance) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }
  const context = globalAppInstance.context;
  // 注册消息监听器
  const disposable = context.hostIpc.onReceiveMessage(messageHandler);

  return {
    sendMessage: context.hostIpc.sendCommand.bind(context.hostIpc),
    requestMessage: context.hostIpc.sendRequest.bind(context.hostIpc),
    disposable: disposable
  };
}

// 重新导出类型（保持向后兼容）
export type {
  Vue3AppContext as Vue3AppContextType,
  Vue3AppConfig as Vue3AppConfigType,
  Vue3AppInstance as Vue3AppInstanceType
} from '../types/vue3';
