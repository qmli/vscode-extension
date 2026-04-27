import type { Event, ExtensionContext, SecretStorageChangeEvent } from 'vscode';
import { Disposable, EventEmitter } from 'vscode';
import { debug } from './log';

/**
 * 存储变更事件类型
 * 支持全局存储和工作区存储的变更通知
 *
 * @template TGlobalKeys 全局存储键的字符串联合类型
 * @template TWorkspaceKeys 工作区存储键的字符串联合类型
 */
export type StorageChangeEvent<TGlobalKeys extends string, TWorkspaceKeys extends string> =
  | {
      /** 已更改的存储值的键 */
      readonly keys: TGlobalKeys[];
      readonly workspace: false;
    }
  | {
      /** 已更改的存储值的键 */
      readonly keys: TWorkspaceKeys[];
      readonly workspace: true;
    };

/**
 * 泛型 Storage 类 - 管理扩展的存储功能
 *
 * 提供全局存储、工作区存储和密钥存储的统一管理接口，
 * 所有键名均会自动添加 `prefix:` 前缀，避免与其他扩展冲突。
 *
 * @template TGlobalStorage 全局存储的键值映射类型
 * @template TWorkspaceStorage 工作区存储的键值映射类型
 * @template TSecretKeys 密钥存储的键字符串联合类型
 *
 * @example
 * ```typescript
 * class MyStorage extends Storage<GlobalStorage, WorkspaceStorage, SecretKeys> {
 *   constructor(context: ExtensionContext) {
 *     super(context, 'myExtension');
 *   }
 * }
 * ```
 */
export class Storage<
  TGlobalStorage extends Record<string, unknown> = Record<string, unknown>,
  TWorkspaceStorage extends Record<string, unknown> = Record<string, unknown>,
  TSecretKeys extends string = string
> implements Disposable
{
  private _onDidChange = new EventEmitter<
    StorageChangeEvent<keyof TGlobalStorage & string, keyof TWorkspaceStorage & string>
  >();
  /** 存储变更事件 */
  get onDidChange(): Event<StorageChangeEvent<keyof TGlobalStorage & string, keyof TWorkspaceStorage & string>> {
    return this._onDidChange.event;
  }

  private _onDidChangeSecrets = new EventEmitter<SecretStorageChangeEvent>();
  /** 密钥存储变更事件 */
  get onDidChangeSecrets(): Event<SecretStorageChangeEvent> {
    return this._onDidChangeSecrets.event;
  }

  private readonly _disposable: Disposable;

  /**
   * @param context VS Code 扩展上下文
   * @param prefix  键名前缀（通常为扩展 ID），用于隔离存储命名空间
   */
  constructor(
    private readonly context: ExtensionContext,
    protected readonly prefix: string
  ) {
    this._disposable = Disposable.from(
      this._onDidChange,
      this._onDidChangeSecrets,
      this.context.secrets.onDidChange((e) => this._onDidChangeSecrets.fire(e))
    );
  }

  dispose(): void {
    this._disposable.dispose();
  }

  // ===== 全局存储方法 =====

  /**
   * 获取全局存储值
   * @param key 存储键
   * @param defaultValue 默认值（可选）
   */
  get<K extends keyof TGlobalStorage>(key: K): TGlobalStorage[K] | undefined;
  get<K extends keyof TGlobalStorage>(key: K, defaultValue: TGlobalStorage[K]): TGlobalStorage[K];
  @debug({ logThreshold: 50 })
  get(key: string, defaultValue?: unknown): unknown {
    return this.context.globalState.get(`${this.prefix}:${key}`, defaultValue);
  }

  /**
   * 删除全局存储值
   */
  @debug({ logThreshold: 250 })
  async delete(key: keyof TGlobalStorage & string): Promise<void> {
    await this.context.globalState.update(`${this.prefix}:${key}`, undefined);
    this._onDidChange.fire({ keys: [key], workspace: false });
  }

  /**
   * 根据前缀批量删除全局存储值
   * @param prefix 键名前缀（不含 extensionPrefix 部分）
   * @param exclude 排除匹配此正则的键
   */
  @debug({ logThreshold: 250 })
  async deleteWithPrefixCore(prefix?: string, exclude?: RegExp): Promise<void> {
    const qualifiedKeyPrefix = `${this.prefix}:`;
    const keys: (keyof TGlobalStorage & string)[] = [];

    for (const qualifiedKey of this.context.globalState.keys()) {
      if (!qualifiedKey.startsWith(qualifiedKeyPrefix)) continue;

      const key = qualifiedKey.substring(qualifiedKeyPrefix.length);
      if (prefix == null || key === prefix || key.startsWith(`${prefix}:`)) {
        if (exclude?.test(key)) continue;
        keys.push(key as keyof TGlobalStorage & string);
        await this.context.globalState.update(qualifiedKey, undefined);
      }
    }

    if (keys.length) {
      this._onDidChange.fire({ keys, workspace: false });
    }
  }

  /**
   * 存储全局值
   */
  @debug({ args: { 1: false }, logThreshold: 250 })
  async store<K extends keyof TGlobalStorage>(key: K, value: TGlobalStorage[K] | undefined): Promise<void> {
    await this.context.globalState.update(`${this.prefix}:${key as string}`, value);
    this._onDidChange.fire({ keys: [key as keyof TGlobalStorage & string], workspace: false });
  }

  // ===== 密钥存储方法 =====

  @debug({ args: false, logThreshold: 250 })
  async getSecret(key: TSecretKeys): Promise<string | undefined> {
    return this.context.secrets.get(key);
  }

  @debug({ args: false, logThreshold: 250 })
  async deleteSecret(key: TSecretKeys): Promise<void> {
    return this.context.secrets.delete(key);
  }

  @debug({ args: false, logThreshold: 250 })
  async storeSecret(key: TSecretKeys, value: string): Promise<void> {
    return this.context.secrets.store(key, value);
  }

  // ===== 工作区存储方法 =====

  /**
   * 获取工作区存储值
   */
  getWorkspace<K extends keyof TWorkspaceStorage>(key: K): TWorkspaceStorage[K] | undefined;
  getWorkspace<K extends keyof TWorkspaceStorage>(key: K, defaultValue: TWorkspaceStorage[K]): TWorkspaceStorage[K];
  @debug({ logThreshold: 25 })
  getWorkspace(key: string, defaultValue?: unknown): unknown {
    return this.context.workspaceState.get(`${this.prefix}:${key}`, defaultValue);
  }

  /**
   * 删除工作区存储值
   */
  @debug({ logThreshold: 250 })
  async deleteWorkspace(key: keyof TWorkspaceStorage & string): Promise<void> {
    await this.context.workspaceState.update(`${this.prefix}:${key}`, undefined);
    this._onDidChange.fire({ keys: [key], workspace: true });
  }

  /**
   * 根据前缀批量删除工作区存储值
   */
  @debug({ logThreshold: 250 })
  async deleteWorkspaceWithPrefixCore(prefix?: string, exclude?: (keyof TWorkspaceStorage & string)[]): Promise<void> {
    const qualifiedKeyPrefix = `${this.prefix}:`;
    const keys: (keyof TWorkspaceStorage & string)[] = [];

    for (const qualifiedKey of this.context.workspaceState.keys()) {
      if (!qualifiedKey.startsWith(qualifiedKeyPrefix)) continue;

      const key = qualifiedKey.substring(qualifiedKeyPrefix.length) as keyof TWorkspaceStorage & string;
      if (prefix == null || key === prefix || key.startsWith(`${prefix}:`)) {
        if (exclude?.includes(key)) continue;
        keys.push(key);
        await this.context.workspaceState.update(qualifiedKey, undefined);
      }
    }

    if (keys.length) {
      this._onDidChange.fire({ keys, workspace: true });
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
   */
  @debug({ args: { 1: false }, logThreshold: 250 })
  async storeWorkspace<K extends keyof TWorkspaceStorage>(
    key: K,
    value: TWorkspaceStorage[K] | undefined
  ): Promise<void> {
    await this.context.workspaceState.update(`${this.prefix}:${key as string}`, value);
    this._onDidChange.fire({ keys: [key as keyof TWorkspaceStorage & string], workspace: true });
  }
}
