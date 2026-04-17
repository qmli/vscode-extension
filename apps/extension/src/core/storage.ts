import type { Event, ExtensionContext } from 'vscode';
import { Disposable, EventEmitter, SecretStorageChangeEvent } from 'vscode';
import { extensionPrefix } from '@/common/constants/constants';
import type {
  DeprecatedGlobalStorage,
  DeprecatedWorkspaceStorage,
  GlobalStateKey,
  GlobalStorage,
  SecretKeys,
  WorkspaceStateKey,
  WorkspaceStorage
} from '@/common/constants/constants.storage';
import { debug } from '@/core/log';

// 定义全局存储键的类型，包含当前和已弃用的键
type GlobalStorageKeys = keyof (GlobalStorage & DeprecatedGlobalStorage) | GlobalStateKey;
// 定义工作区存储键的类型，包含当前和已弃用的键
type WorkspaceStorageKeys = keyof (WorkspaceStorage & DeprecatedWorkspaceStorage) | WorkspaceStateKey;

/**
 * 存储变更事件类型
 * 支持全局存储和工作区存储的变更通知
 */
export type StorageChangeEvent =
  | {
      /** 已更改的存储值的键 */
      readonly keys: GlobalStorageKeys[];
      readonly workspace: false;
    }
  | {
      /** 已更改的存储值的键 */
      readonly keys: WorkspaceStorageKeys[];
      readonly workspace: true;
    };

/**
 * Storage 类 - 管理扩展的存储功能
 * 提供全局存储、工作区存储和密钥存储的统一管理接口
 */
export class Storage implements Disposable {
  // 存储变更事件发射器
  private _onDidChange = new EventEmitter<StorageChangeEvent>();
  /** 存储变更事件 */
  get onDidChange(): Event<StorageChangeEvent> {
    return this._onDidChange.event;
  }

  // 密钥存储变更事件发射器
  private _onDidChangeSecrets = new EventEmitter<SecretStorageChangeEvent>();
  /** 密钥存储变更事件 */
  get onDidChangeSecrets(): Event<SecretStorageChangeEvent> {
    return this._onDidChangeSecrets.event;
  }

  private readonly _disposable: Disposable;

  /**
   * 构造函数
   * @param context - VS Code 扩展上下文
   */
  constructor(private readonly context: ExtensionContext) {
    this._disposable = Disposable.from(
      this._onDidChange,
      this._onDidChangeSecrets,
      // 监听密钥存储变更事件并转发
      this.context.secrets.onDidChange((e) => this._onDidChangeSecrets.fire(e))
    );
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this._disposable.dispose();
  }

  // ===== 全局存储方法 =====

  /**
   * 获取全局存储值（无默认值）
   * @param key - 存储键
   * @returns 存储值或 undefined
   */
  get<T extends keyof GlobalStorage>(key: T): GlobalStorage[T] | undefined;
  /**
   * 获取全局存储值（已弃用的键）
   * @deprecated
   */
  get<T extends keyof DeprecatedGlobalStorage>(key: T): DeprecatedGlobalStorage[T] | undefined;
  /**
   * 获取全局存储值（带默认值）
   * @param key - 存储键
   * @param defaultValue - 默认值
   * @returns 存储值或默认值
   */
  get<T extends keyof GlobalStorage>(key: T, defaultValue: GlobalStorage[T]): GlobalStorage[T];
  @debug({ logThreshold: 50 })
  get(key: GlobalStorageKeys, defaultValue?: unknown): unknown | undefined {
    // 使用扩展前缀来避免键名冲突
    return this.context.globalState.get(`${extensionPrefix}:${key}`, defaultValue);
  }

  /**
   * 删除全局存储值
   * @param key - 要删除的键
   */
  @debug({ logThreshold: 250 })
  async delete(key: GlobalStorageKeys): Promise<void> {
    await this.context.globalState.update(`${extensionPrefix}:${key}`, undefined);
    // 触发变更事件
    this._onDidChange.fire({ keys: [key], workspace: false });
  }

  /**
   * 根据前缀删除全局存储值
   * @param prefix - 键名前缀
   */
  @debug({ logThreshold: 250 })
  async deleteWithPrefix(prefix: ExtractPrefixes<GlobalStorageKeys, ':'>): Promise<void> {
    return this.deleteWithPrefixCore(prefix);
  }

  /**
   * 根据前缀删除全局存储值的核心实现
   * @param prefix - 键名前缀（可选）
   * @param exclude - 排除的键名正则表达式（可选）
   */
  async deleteWithPrefixCore(prefix?: ExtractPrefixes<GlobalStorageKeys, ':'>, exclude?: RegExp): Promise<void> {
    const qualifiedKeyPrefix = `${extensionPrefix}:`;
    const keys: GlobalStorageKeys[] = [];

    // 遍历所有全局状态键
    for (const qualifiedKey of this.context.globalState.keys() as `${typeof extensionPrefix}:${GlobalStorageKeys}`[]) {
      if (!qualifiedKey.startsWith(qualifiedKeyPrefix)) continue;

      // 提取实际的键名（去除扩展前缀）
      const key = qualifiedKey.substring(qualifiedKeyPrefix.length) as GlobalStorageKeys;
      // 检查是否匹配前缀条件
      if (prefix == null || key === prefix || key.startsWith(`${prefix}:`)) {
        // 检查是否被排除
        if (exclude?.test(key)) continue;

        keys.push(key);
        await this.context.globalState.update(qualifiedKey, undefined);
      }
    }

    // 如果有删除的键，触发变更事件
    if (keys.length) {
      this._onDidChange.fire({ keys: keys, workspace: false });
    }
  }

  /**
   * 重置全局存储（保留特定的键）
   */
  @debug({ logThreshold: 250 })
  async reset(): Promise<void> {
    // 排除订阅相关和预览相关的键
    return this.deleteWithPrefixCore(undefined, /^(premium:subscription|plus:preview:.*)$/);
  }

  /**
   * 存储全局值
   * @param key - 存储键
   * @param value - 存储值
   */
  @debug({ args: { 1: false }, logThreshold: 250 })
  async store<T extends keyof GlobalStorage>(key: T, value: GlobalStorage[T] | undefined): Promise<void> {
    await this.context.globalState.update(`${extensionPrefix}:${key}`, value);
    this._onDidChange.fire({ keys: [key], workspace: false });
  }

  // ===== 密钥存储方法 =====

  /**
   * 获取密钥存储值
   * @param key - 密钥键名
   * @returns 密钥值或 undefined
   */
  @debug({ args: false, logThreshold: 250 })
  async getSecret(key: SecretKeys): Promise<string | undefined> {
    return this.context.secrets.get(key);
  }

  /**
   * 删除密钥存储值
   * @param key - 要删除的密钥键名
   */
  @debug({ args: false, logThreshold: 250 })
  async deleteSecret(key: SecretKeys): Promise<void> {
    return this.context.secrets.delete(key);
  }

  /**
   * 存储密钥值
   * @param key - 密钥键名
   * @param value - 密钥值
   */
  @debug({ args: false, logThreshold: 250 })
  async storeSecret(key: SecretKeys, value: string): Promise<void> {
    return this.context.secrets.store(key, value);
  }

  // ===== 工作区存储方法 =====

  /**
   * 获取工作区存储值（无默认值）
   * @param key - 存储键
   * @returns 存储值或 undefined
   */
  getWorkspace<T extends keyof WorkspaceStorage>(key: T): WorkspaceStorage[T] | undefined;
  /**
   * 获取工作区存储值（已弃用的键）
   * @deprecated
   */
  getWorkspace<T extends keyof DeprecatedWorkspaceStorage>(key: T): DeprecatedWorkspaceStorage[T] | undefined;
  /**
   * 获取工作区存储值（带默认值）
   * @param key - 存储键
   * @param defaultValue - 默认值
   * @returns 存储值或默认值
   */
  getWorkspace<T extends keyof WorkspaceStorage>(key: T, defaultValue: WorkspaceStorage[T]): WorkspaceStorage[T];
  @debug({ logThreshold: 25 })
  getWorkspace(key: WorkspaceStorageKeys, defaultValue?: unknown): unknown | undefined {
    return this.context.workspaceState.get(`${extensionPrefix}:${key}`, defaultValue);
  }

  /**
   * 删除工作区存储值
   * @param key - 要删除的键
   */
  @debug({ logThreshold: 250 })
  async deleteWorkspace(key: WorkspaceStorageKeys): Promise<void> {
    await this.context.workspaceState.update(`${extensionPrefix}:${key}`, undefined);
    this._onDidChange.fire({ keys: [key], workspace: true });
  }

  /**
   * 根据前缀删除工作区存储值
   * @param prefix - 键名前缀
   */
  @debug({ logThreshold: 250 })
  async deleteWorkspaceWithPrefix(prefix: ExtractPrefixes<WorkspaceStorageKeys, ':'>): Promise<void> {
    return this.deleteWorkspaceWithPrefixCore(prefix);
  }

  /**
   * 根据前缀删除工作区存储值的核心实现
   * @param prefix - 键名前缀（可选）
   * @param exclude - 要排除的键名数组（可选）
   */
  async deleteWorkspaceWithPrefixCore(
    prefix?: ExtractPrefixes<WorkspaceStorageKeys, ':'>,
    exclude?: WorkspaceStorageKeys[]
  ): Promise<void> {
    const qualifiedKeyPrefix = `${extensionPrefix}:`;
    const keys: WorkspaceStorageKeys[] = [];

    // 遍历所有工作区状态键
    for (const qualifiedKey of this.context.workspaceState.keys() as `${typeof extensionPrefix}:${WorkspaceStorageKeys}`[]) {
      if (!qualifiedKey.startsWith(qualifiedKeyPrefix)) continue;

      // 提取实际的键名（去除扩展前缀）
      const key = qualifiedKey.substring(qualifiedKeyPrefix.length) as WorkspaceStorageKeys;
      // 检查是否匹配前缀条件
      if (prefix == null || key === prefix || key.startsWith(`${prefix}:`)) {
        // 检查是否在排除列表中
        if (exclude?.includes(key)) continue;

        keys.push(key);
        await this.context.workspaceState.update(qualifiedKey, undefined);
      }
    }

    // 如果有删除的键，触发变更事件
    if (keys.length) {
      this._onDidChange.fire({ keys: keys, workspace: true });
    }
  }

  /**
   * 重置工作区存储（删除所有工作区存储值）
   */
  @debug({ logThreshold: 250 })
  async resetWorkspace(): Promise<void> {
    return this.deleteWorkspaceWithPrefixCore();
  }

  /**
   * 存储工作区值
   * @param key - 存储键
   * @param value - 存储值
   */
  @debug({ args: { 1: false }, logThreshold: 250 })
  async storeWorkspace<T extends keyof WorkspaceStorage>(
    key: T,
    value: WorkspaceStorage[T] | undefined
  ): Promise<void> {
    await this.context.workspaceState.update(`${extensionPrefix}:${key}`, value);
    this._onDidChange.fire({ keys: [key], workspace: true });
  }
}
