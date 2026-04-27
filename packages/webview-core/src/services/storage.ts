// 存储服务

import type { StorageAdapter } from './types';

// 本地存储适配器
class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set localStorage item:', error);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }
}

// 会话存储适配器
class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set sessionStorage item:', error);
    }
  }

  removeItem(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove sessionStorage item:', error);
    }
  }

  clear(): void {
    try {
      window.sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }

  keys(): string[] {
    try {
      return Object.keys(window.sessionStorage);
    } catch {
      return [];
    }
  }
}

// 内存存储适配器（用于测试或不支持存储的环境）
class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }
}

// 存储服务类
class StorageService {
  private adapter: StorageAdapter;
  private prefix: string;

  constructor(adapter?: StorageAdapter, prefix = 'webview:') {
    this.adapter = adapter || this.getDefaultAdapter();
    this.prefix = prefix;
  }

  private getDefaultAdapter(): StorageAdapter {
    if (typeof localStorage !== 'undefined') {
      return new LocalStorageAdapter();
    }
    return new MemoryStorageAdapter();
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // 基础方法
  get(key: string): Promise<string | null> | string | null {
    return this.adapter.getItem(this.getKey(key));
  }

  set(key: string, value: string): void {
    void this.adapter.setItem(this.getKey(key), value);
  }

  remove(key: string): void {
    void this.adapter.removeItem(this.getKey(key));
  }

  clear(): void {
    const keys = this.keys();
    keys.forEach((key) => this.remove(key));
  }

  keys(): string[] {
    return (this.adapter.keys() as string[])
      .filter((key: string) => key.startsWith(this.prefix))
      .map((key: string) => key.slice(this.prefix.length));
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // JSON方法
  async getJSON<T = any>(key: string, defaultValue?: T): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) {
      return defaultValue || null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue || null;
    }
  }

  setJSON(key: string, value: any): void {
    try {
      this.set(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to stringify value for storage:', error);
    }
  }

  // 数字方法
  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null) return defaultValue;

    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  setNumber(key: string, value: number): void {
    this.set(key, value.toString());
  }

  // 布尔方法
  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get(key);
    if (value === null) return defaultValue;

    return value === 'true';
  }

  setBoolean(key: string, value: boolean): void {
    this.set(key, value.toString());
  }

  // 批量操作
  setMultiple(items: Record<string, any>): void {
    Object.entries(items).forEach(([key, value]) => {
      if (typeof value === 'string') {
        this.set(key, value);
      } else {
        this.setJSON(key, value);
      }
    });
  }

  getMultiple(keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    keys.forEach((key) => {
      result[key] = this.getJSON(key);
    });
    return result;
  }

  // 过期存储
  setWithExpiry(key: string, value: any, expiryMinutes: number): void {
    const expiry = Date.now() + expiryMinutes * 60 * 1000;
    const item = {
      value: value,
      expiry: expiry
    };
    this.setJSON(key, item);
  }

  async getWithExpiry<T = any>(key: string): Promise<T | null> {
    const item = await this.getJSON(key);
    if (!item || typeof item !== 'object' || !item.expiry) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.remove(key);
      return null;
    }

    return item.value as T;
  }

  // 创建命名空间存储
  createNamespace(namespace: string): StorageService {
    return new StorageService(this.adapter, `${this.prefix}${namespace}:`);
  }

  // 获取存储大小（估算）
  getSize(): number {
    let size = 0;
    this.keys().forEach(async (key) => {
      const value = await this.get(key);
      if (value) {
        size += key.length + value.length;
      }
    });
    return size;
  }

  // 导出数据
  export(): Record<string, any> {
    const data: Record<string, any> = {};
    this.keys().forEach((key) => {
      data[key] = this.getJSON(key);
    });
    return data;
  }

  // 导入数据
  import(data: Record<string, any>): void {
    Object.entries(data).forEach(([key, value]) => {
      this.setJSON(key, value);
    });
  }
}

// 全局存储实例
export const storage = new StorageService();
export const sessionStorage = new StorageService(new SessionStorageAdapter());

// 创建存储实例
export const createStorage = (adapter?: StorageAdapter, prefix?: string): StorageService => {
  return new StorageService(adapter, prefix);
};
