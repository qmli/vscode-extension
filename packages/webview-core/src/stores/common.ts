// 通用状态管理

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { generateId } from '../utils';

export const useCommonStore = defineStore('common', () => {
  // 状态
  const loading = ref(false);
  const error = ref<string | null>(null);
  const messages = ref<
    Array<{
      id: string;
      type: 'success' | 'warning' | 'error' | 'info';
      message: string;
      timestamp: number;
      duration?: number;
    }>
  >([]);

  // 计算属性
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);
  const currentError = computed(() => error.value);
  const allMessages = computed(() => messages.value);
  const latestMessage = computed(() => messages.value[messages.value.length - 1]);

  // 方法
  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  const clearError = () => {
    error.value = null;
  };

  const addMessage = (options: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    duration?: number;
  }) => {
    const messageId = generateId();
    const newMessage = {
      id: messageId,
      type: options.type,
      message: options.message,
      timestamp: Date.now(),
      duration: options.duration || 3000
    };

    messages.value.push(newMessage);

    // 自动移除消息
    if (newMessage.duration > 0) {
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        removeMessage(messageId);
      }, newMessage.duration);
    }

    return messageId;
  };

  const removeMessage = (messageId: string) => {
    const index = messages.value.findIndex((msg) => msg.id === messageId);
    if (index > -1) {
      messages.value.splice(index, 1);
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  const clearOldMessages = (olderThan: number = 30000) => {
    const now = Date.now();
    messages.value = messages.value.filter((msg) => now - msg.timestamp < olderThan);
  };

  // 便捷方法
  const showSuccess = (message: string, duration?: number) => {
    return addMessage({ type: 'success', message: message, duration: duration });
  };

  const showWarning = (message: string, duration?: number) => {
    return addMessage({ type: 'warning', message: message, duration: duration });
  };

  const showError = (message: string, duration?: number) => {
    setError(message);
    return addMessage({ type: 'error', message: message, duration: duration });
  };

  const showInfo = (message: string, duration?: number) => {
    return addMessage({ type: 'info', message: message, duration: duration });
  };

  // 异步操作包装器
  const withLoading = async <T>(
    operation: () => Promise<T>,
    errorHandler?: (error: any) => void
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();

      const result = await operation();

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);

      if (errorHandler) {
        errorHandler(err);
      } else {
        showError(errorMessage);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  // 重试机制
  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T | null> => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;

        if (attempt < maxRetries) {
          // 等待后重试
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
          continue;
        }
      }
    }

    // 所有重试都失败了
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    setError(`Operation failed after ${maxRetries} attempts: ${errorMessage}`);
    showError(errorMessage);

    return null;
  };

  // 防抖操作
  const debouncedOperations = new Map<string, NodeJS.Timeout>();

  const debounce = (key: string, operation: () => void, delay: number = 300) => {
    // 清除之前的定时器
    const existingTimeout = debouncedOperations.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // 设置新的定时器
    const timeout = setTimeout(() => {
      operation();
      debouncedOperations.delete(key);
    }, delay);

    debouncedOperations.set(key, timeout);
  };

  // 清理资源
  const cleanup = () => {
    // 清除所有防抖定时器
    debouncedOperations.forEach((timeout) => clearTimeout(timeout));
    debouncedOperations.clear();

    // 清理状态
    loading.value = false;
    error.value = null;
    messages.value = [];
  };

  return {
    // 状态
    loading: loading,
    error: error,
    messages: messages,

    // 计算属性
    isLoading: isLoading,
    hasError: hasError,
    currentError: currentError,
    allMessages: allMessages,
    latestMessage: latestMessage,

    // 基础方法
    setLoading: setLoading,
    setError: setError,
    clearError: clearError,
    addMessage: addMessage,
    removeMessage: removeMessage,
    clearMessages: clearMessages,
    clearOldMessages: clearOldMessages,

    // 便捷方法
    showSuccess: showSuccess,
    showWarning: showWarning,
    showError: showError,
    showInfo: showInfo,

    // 高级方法
    withLoading: withLoading,
    withRetry: withRetry,
    debounce: debounce,
    cleanup: cleanup
  };
});
