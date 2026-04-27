// 服务相关类型定义

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
  timestamp: number;
}

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
  keys(): Promise<string[]> | string[];
}

export interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: number;
  module?: string;
  data?: any;
}

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  setLevel(level: keyof LogLevel): void;
  getEntries(): LogEntry[];
  clear(): void;
}

export interface EventListener<T = any> {
  (data: T): void;
}

export interface EventBus {
  on<T = any>(event: string, listener: EventListener<T>): () => void;
  off(event: string, listener: EventListener): void;
  emit<T = any>(event: string, data?: T): void;
  clear(): void;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
  modified: number;
  created: number;
}

export interface ConfigValue {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default?: any;
  description?: string;
  readonly?: boolean;
}

export interface ConfigSection {
  name: string;
  title: string;
  description?: string;
  values: ConfigValue[];
}
