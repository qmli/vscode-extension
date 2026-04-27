/**
 * Vue3 生命周期适配器，在vue 页面使用，非vue 页面禁止使用
 *
 * 提供Vue3生命周期钩子与webview生命周期的映射
 */

import type { Ref } from 'vue';
import { onBeforeMount, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
import { getVue3App } from '../app/vue3App';

/**
 * Webview生命周期状态
 */
export interface WebviewLifecycleState {
  isInitializing: Ref<boolean>;
  isInitialized: Ref<boolean>;
  isReady: Ref<boolean>;
  isDisposing: Ref<boolean>;
  isDisposed: Ref<boolean>;
}

/**
 * Webview生命周期钩子
 */
export interface WebviewLifecycleHooks {
  onInitialize?: () => void | Promise<void>;
  onInitialized?: () => void | Promise<void>;
  onReady?: () => void | Promise<void>;
  onDispose?: () => void | Promise<void>;
  onDisposed?: () => void | Promise<void>;
}

/**
 * 使用Webview生命周期管理
 *
 * @param hooks 生命周期钩子函数
 * @returns 生命周期状态和方法
 */
export function useWebviewLifecycle(hooks: WebviewLifecycleHooks = {}): {
  state: WebviewLifecycleState;
  initialize: () => Promise<void>;
  dispose: () => Promise<void>;
  isInitializing: Ref<boolean>;
  isInitialized: Ref<boolean>;
  isReady: Ref<boolean>;
  isDisposing: Ref<boolean>;
  isDisposed: Ref<boolean>;
} {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  // 生命周期状态
  const state: WebviewLifecycleState = {
    isInitializing: ref(false),
    isInitialized: ref(false),
    isReady: ref(false),
    isDisposing: ref(false),
    isDisposed: ref(false)
  };

  // 初始化方法
  const initialize = async () => {
    if (state.isInitialized.value || state.isInitializing.value) {
      return;
    }

    try {
      state.isInitializing.value = true;

      // 调用初始化钩子
      if (hooks.onInitialize) {
        await hooks.onInitialize();
      }

      state.isInitialized.value = true;

      // 调用初始化完成钩子
      if (hooks.onInitialized) {
        await hooks.onInitialized();
      }

      // 标记为就绪
      state.isReady.value = true;

      // 调用就绪钩子
      if (hooks.onReady) {
        await hooks.onReady();
      }
    } catch (error) {
      console.error('Failed to initialize webview lifecycle:', error);
      state.isInitializing.value = false;
      throw error;
    } finally {
      state.isInitializing.value = false;
    }
  };

  // 销毁方法
  const dispose = async () => {
    if (state.isDisposed.value || state.isDisposing.value) {
      return;
    }

    try {
      state.isDisposing.value = true;

      // 调用销毁钩子
      if (hooks.onDispose) {
        await hooks.onDispose();
      }

      state.isDisposed.value = true;

      // 调用销毁完成钩子
      if (hooks.onDisposed) {
        await hooks.onDisposed();
      }
    } catch (error) {
      console.error('Failed to dispose webview lifecycle:', error);
      throw error;
    } finally {
      state.isDisposing.value = false;
    }
  };

  // Vue3生命周期集成
  onBeforeMount(() => {
    void initialize();
  });

  onBeforeUnmount(() => {
    void dispose();
  });

  return {
    state: state,
    initialize: initialize,
    dispose: dispose,
    // 便捷的计算属性
    isInitializing: state.isInitializing,
    isInitialized: state.isInitialized,
    isReady: state.isReady,
    isDisposing: state.isDisposing,
    isDisposed: state.isDisposed
  };
}

/**
 * 使用Webview挂载状态
 * 提供组件挂载状态的响应式跟踪
 */
export function useWebviewMounted(): { isMounted: Ref<boolean> } {
  const isMounted = ref(false);

  onMounted(() => {
    isMounted.value = true;
  });

  onUnmounted(() => {
    isMounted.value = false;
  });

  return {
    isMounted: isMounted
  };
}

/**
 * 使用Webview激活状态
 * 提供webview激活/非激活状态的跟踪
 */
export function useWebviewActive(): { isActive: Ref<boolean> } {
  const app = getVue3App();
  if (!app) {
    throw new Error('Vue3 app not initialized. Call createVue3App() first.');
  }

  const isActive = ref(true);

  // 监听页面可见性变化
  const handleVisibilityChange = () => {
    isActive.value = !document.hidden;
  };

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    isActive: isActive
  };
}

/**
 * 使用Webview错误处理
 * 提供统一的错误处理机制
 */
export function useWebviewError(): {
  error: Ref<Error | null>;
  hasError: Ref<boolean>;
  setError: (err: Error | string) => void;
  clearError: () => void;
  handleError: (err: unknown) => void;
} {
  const error = ref<Error | null>(null);
  const hasError = ref(false);

  const setError = (err: Error | string) => {
    const errorObj = err instanceof Error ? err : new Error(err);
    error.value = errorObj;
    hasError.value = true;
    console.error('Webview error:', errorObj);
  };

  const clearError = () => {
    error.value = null;
    hasError.value = false;
  };

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else if (typeof err === 'string') {
      setError(err);
    } else {
      setError('Unknown error occurred');
    }
  };

  return {
    error: error,
    hasError: hasError,
    setError: setError,
    clearError: clearError,
    handleError: handleError
  };
}

/**
 * 使用Webview性能监控
 * 提供性能指标监控功能
 */
export function useWebviewPerformance(): {
  performanceMetrics: Ref<{
    loadTime: number;
    renderTime: number;
    memoryUsage: number;
    lastUpdate: number;
  }>;
  updateMetrics: () => void;
} {
  const performanceMetrics = ref({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    lastUpdate: Date.now()
  });

  const updateMetrics = () => {
    const now = Date.now();
    performanceMetrics.value = {
      ...performanceMetrics.value,
      lastUpdate: now
    };
  };

  onMounted(() => {
    const startTime = performance.now();

    // 监控内存使用情况
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        performanceMetrics.value.memoryUsage = memory.usedJSHeapSize;
      }
    };

    // 定期更新性能指标
    const interval = setInterval(() => {
      updateMetrics();
      updateMemoryUsage();
    }, 1000);

    onUnmounted(() => {
      clearInterval(interval);
      const endTime = performance.now();
      performanceMetrics.value.loadTime = endTime - startTime;
    });
  });

  return {
    performanceMetrics: performanceMetrics,
    updateMetrics: updateMetrics
  };
}

/**
 * 使用Webview资源管理
 * 提供资源加载和清理功能
 */
export function useWebviewResources(): {
  resources: Ref<Set<string>>;
  loadingResources: Ref<Set<string>>;
  failedResources: Ref<Set<string>>;
  loadResource: (url: string) => Promise<void>;
  unloadResource: (url: string) => void;
  clearAllResources: () => void;
  isResourceLoaded: (url: string) => boolean;
  isResourceLoading: (url: string) => boolean;
  isResourceFailed: (url: string) => boolean;
} {
  const resources = ref<Set<string>>(new Set());
  const loadingResources = ref<Set<string>>(new Set());
  const failedResources = ref<Set<string>>(new Set());

  const loadResource = async (url: string): Promise<void> => {
    if (resources.value.has(url)) {
      return;
    }

    try {
      loadingResources.value.add(url);

      // 这里可以实现具体的资源加载逻辑
      // 例如：加载图片、脚本、样式等
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(void 0);
        img.onerror = () => reject(new Error(`Failed to load resource: ${url}`));
        img.src = url;
      });

      resources.value.add(url);
      failedResources.value.delete(url);
    } catch (error) {
      failedResources.value.add(url);
      throw error;
    } finally {
      loadingResources.value.delete(url);
    }
  };

  const unloadResource = (url: string) => {
    resources.value.delete(url);
    loadingResources.value.delete(url);
    failedResources.value.delete(url);
  };

  const clearAllResources = () => {
    resources.value.clear();
    loadingResources.value.clear();
    failedResources.value.clear();
  };

  onUnmounted(() => {
    clearAllResources();
  });

  return {
    resources: resources,
    loadingResources: loadingResources,
    failedResources: failedResources,
    loadResource: loadResource,
    unloadResource: unloadResource,
    clearAllResources: clearAllResources,
    isResourceLoaded: (url: string) => resources.value.has(url),
    isResourceLoading: (url: string) => loadingResources.value.has(url),
    isResourceFailed: (url: string) => failedResources.value.has(url)
  };
}
