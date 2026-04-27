// 日志服务

import type { LogEntry, Logger, LogLevel } from './types';

const logLevels: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class LoggerService implements Logger {
  private entries: LogEntry[] = [];
  private currentLevel: keyof LogLevel = 'INFO';
  private maxEntries = 1000;
  private module: string;

  constructor(module = 'default') {
    this.module = module;
  }

  setLevel(level: keyof LogLevel): void {
    this.currentLevel = level;
  }

  setMaxEntries(max: number): void {
    this.maxEntries = max;
    this.trimEntries();
  }

  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  private log(level: keyof LogLevel, message: string, data?: any) {
    if (logLevels[level] < logLevels[this.currentLevel]) {
      return;
    }

    const entry: LogEntry = {
      level: level,
      message: message,
      timestamp: Date.now(),
      module: this.module,
      data: data
    };

    this.entries.push(entry);
    this.trimEntries();

    // 输出到控制台
    this.outputToConsole(entry);
  }

  private outputToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.module}] [${entry.level}]`;

    switch (entry.level) {
      case 'DEBUG':
        console.debug(prefix, entry.message, entry.data);
        break;
      case 'INFO':
        console.info(prefix, entry.message, entry.data);
        break;
      case 'WARN':
        console.warn(prefix, entry.message, entry.data);
        break;
      case 'ERROR':
        console.error(prefix, entry.message, entry.data);
        break;
    }
  }

  private trimEntries() {
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getEntriesByLevel(level: keyof LogLevel): LogEntry[] {
    return this.entries.filter((entry) => entry.level === level);
  }

  getEntriesByModule(module: string): LogEntry[] {
    return this.entries.filter((entry) => entry.module === module);
  }

  getEntriesInTimeRange(start: number, end: number): LogEntry[] {
    return this.entries.filter((entry) => entry.timestamp >= start && entry.timestamp <= end);
  }

  clear(): void {
    this.entries = [];
  }

  exportLogs(format: 'json' | 'text' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    return this.entries
      .map((entry) => {
        const timestamp = new Date(entry.timestamp).toISOString();
        const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
        return `[${timestamp}] [${entry.module}] [${entry.level}] ${entry.message}${dataStr}`;
      })
      .join('\n');
  }

  // 创建子模块logger
  createModuleLogger(moduleName: string): Logger {
    return new LoggerService(`${this.module}:${moduleName}`);
  }
}

// 全局日志实例
export const logger = new LoggerService('webview');

// 模块化日志创建器
export const createLogger = (module: string): Logger => {
  return new LoggerService(module);
};

// 日志级别常量
export { logLevels };

// 导出类
export { LoggerService };
