// 配置管理服务

import { eventBus } from './events';
import { storage } from './storage';
import type { ConfigSection, ConfigValue } from './types';

class ConfigService {
  private configs: Map<string, ConfigValue> = new Map();
  private sections: Map<string, ConfigSection> = new Map();
  private storageKey = 'config';

  constructor() {
    this.loadFromStorage();
  }

  // 注册配置项
  register(config: ConfigValue): void {
    this.configs.set(config.key, config);
  }

  // 批量注册配置项
  registerBatch(configs: ConfigValue[]): void {
    configs.forEach((config) => this.register(config));
  }

  // 注册配置分组
  registerSection(section: ConfigSection): void {
    this.sections.set(section.name, section);
    this.registerBatch(section.values);
  }

  // 获取配置值
  get<T = any>(key: string, defaultValue?: T): T {
    const config = this.configs.get(key);
    if (!config) {
      return defaultValue as T;
    }

    const storedValue = storage.getJSON(`${this.storageKey}.${key}`);
    if (storedValue !== null) {
      return storedValue as T;
    }

    return (config.default !== undefined ? config.default : defaultValue) as T;
  }

  // 设置配置值
  set<T = any>(key: string, value: T): boolean {
    const config = this.configs.get(key);
    if (!config) {
      console.warn(`Config key "${key}" not registered`);
      return false;
    }

    if (config.readonly) {
      console.warn(`Config key "${key}" is readonly`);
      return false;
    }

    // 类型验证
    if (!this.validateType(value, config.type)) {
      console.warn(`Invalid type for config key "${key}", expected ${config.type}`);
      return false;
    }

    storage.setJSON(`${this.storageKey}.${key}`, value);

    // 触发变更事件
    eventBus.emit('config:changed', { key: key, value: value, oldValue: this.get(key) });
    eventBus.emit(`config:changed:${key}`, { value: value, oldValue: this.get(key) });

    return true;
  }

  // 重置配置项到默认值
  reset(key: string): boolean {
    const config = this.configs.get(key);
    if (!config) {
      return false;
    }

    if (config.readonly) {
      console.warn(`Config key "${key}" is readonly`);
      return false;
    }

    storage.remove(`${this.storageKey}.${key}`);

    eventBus.emit('config:reset', { key: key });
    eventBus.emit(`config:reset:${key}`, {});

    return true;
  }

  // 重置所有配置
  resetAll(): void {
    const keys = Array.from(this.configs.keys());
    keys.forEach((key) => this.reset(key));

    eventBus.emit('config:reset-all', {});
  }

  // 获取配置项信息
  getConfigInfo(key: string): ConfigValue | undefined {
    return this.configs.get(key);
  }

  // 获取所有配置项
  getAllConfigs(): ConfigValue[] {
    return Array.from(this.configs.values());
  }

  // 获取配置分组
  getSection(name: string): ConfigSection | undefined {
    return this.sections.get(name);
  }

  // 获取所有配置分组
  getAllSections(): ConfigSection[] {
    return Array.from(this.sections.values());
  }

  // 获取分组内的配置值
  getSectionValues(sectionName: string): Record<string, any> {
    const section = this.sections.get(sectionName);
    if (!section) {
      return {};
    }

    const values: Record<string, any> = {};
    section.values.forEach((config) => {
      values[config.key] = this.get(config.key);
    });

    return values;
  }

  // 设置分组内的配置值
  setSectionValues(sectionName: string, values: Record<string, any>): boolean {
    const section = this.sections.get(sectionName);
    if (!section) {
      return false;
    }

    let allSuccess = true;
    Object.entries(values).forEach(([key, value]) => {
      const success = this.set(key, value);
      if (!success) {
        allSuccess = false;
      }
    });

    return allSuccess;
  }

  // 类型验证
  private validateType(value: any, expectedType: ConfigValue['type']): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true;
    }
  }

  // 从存储加载配置
  private loadFromStorage(): void {
    // 这里可以在服务启动时加载保存的配置
  }

  // 导出配置
  export(): Record<string, any> {
    const exported: Record<string, any> = {};

    this.configs.forEach((config, key) => {
      if (!config.readonly) {
        exported[key] = this.get(key);
      }
    });

    return exported;
  }

  // 导入配置
  import(data: Record<string, any>): boolean {
    let allSuccess = true;

    Object.entries(data).forEach(([key, value]) => {
      const success = this.set(key, value);
      if (!success) {
        allSuccess = false;
      }
    });

    return allSuccess;
  }

  // 监听配置变更
  onChange(key: string, callback: (data: { value: any; oldValue: any }) => void): () => void {
    return eventBus.on(`config:changed:${key}`, callback);
  }

  // 监听配置重置
  onReset(key: string, callback: () => void): () => void {
    return eventBus.on(`config:reset:${key}`, callback);
  }

  // 监听全局配置变更
  onAnyChange(callback: (data: { key: string; value: any; oldValue: any }) => void): () => void {
    return eventBus.on('config:changed', callback);
  }

  // 搜索配置项
  search(query: string): ConfigValue[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.configs.values()).filter((config) => {
      return config.key.toLowerCase().includes(lowerQuery) || config.description?.toLowerCase().includes(lowerQuery);
    });
  }

  // 验证所有配置项
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    this.configs.forEach((config, key) => {
      const value = this.get(key);
      if (!this.validateType(value, config.type)) {
        errors.push(`Invalid type for config "${key}": expected ${config.type}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

// 默认配置项
const defaultConfigs: ConfigValue[] = [
  {
    key: 'theme',
    value: 'auto',
    type: 'string',
    default: 'auto',
    description: 'Application theme (light, dark, auto)'
  },
  {
    key: 'language',
    value: 'en',
    type: 'string',
    default: 'en',
    description: 'Application language'
  },
  {
    key: 'fontSize',
    value: 14,
    type: 'number',
    default: 14,
    description: 'Base font size in pixels'
  },
  {
    key: 'autoSave',
    value: true,
    type: 'boolean',
    default: true,
    description: 'Enable automatic saving'
  },
  {
    key: 'debug',
    value: false,
    type: 'boolean',
    default: false,
    description: 'Enable debug mode'
  }
];

// 全局配置实例
export const config = new ConfigService();

// 注册默认配置
config.registerBatch(defaultConfigs);

// 创建配置实例
export const createConfig = (): ConfigService => {
  return new ConfigService();
};

// 导出类
export { ConfigService };
