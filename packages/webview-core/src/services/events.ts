// 事件总线服务

import type { EventBus, EventListener } from './types';

class EventBusService implements EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on<T = any>(event: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(listener);

    // 返回取消监听的函数
    return () => {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  off(event: string, listener: EventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit<T = any>(event: string, data?: T): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // 复制监听器列表，避免在触发过程中修改
      const listenersArray = Array.from(eventListeners);
      listenersArray.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      });
    }
  }

  once<T = any>(event: string, listener: EventListener<T>): () => void {
    const wrappedListener = (data: T) => {
      listener(data);
      this.off(event, wrappedListener);
    };

    return this.on(event, wrappedListener);
  }

  clear(): void {
    this.listeners.clear();
  }

  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  getListenerCount(event: string): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  hasListeners(event: string): boolean {
    return this.getListenerCount(event) > 0;
  }

  // 批量移除监听器
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // 创建命名空间事件总线
  createNamespace(namespace: string): EventBus {
    return new NamespacedEventBus(this, namespace);
  }
}

class NamespacedEventBus implements EventBus {
  constructor(
    private parent: EventBusService,
    private namespace: string
  ) {}

  private getNamespacedEvent(event: string): string {
    return `${this.namespace}:${event}`;
  }

  on<T = any>(event: string, listener: EventListener<T>): () => void {
    return this.parent.on(this.getNamespacedEvent(event), listener);
  }

  off(event: string, listener: EventListener): void {
    this.parent.off(this.getNamespacedEvent(event), listener);
  }

  emit<T = any>(event: string, data?: T): void {
    this.parent.emit(this.getNamespacedEvent(event), data);
  }

  clear(): void {
    // 只清除当前命名空间的事件
    const namespacedEvents = this.parent.getEventNames().filter((event) => event.startsWith(`${this.namespace}:`));

    namespacedEvents.forEach((event) => {
      this.parent.removeAllListeners(event);
    });
  }
}

// 全局事件总线实例
export const eventBus = new EventBusService();

// 创建命名空间事件总线
export const createEventBus = (namespace?: string): EventBus => {
  if (namespace) {
    return eventBus.createNamespace(namespace);
  }
  return new EventBusService();
};

// 导出类
export { EventBusService, NamespacedEventBus };
