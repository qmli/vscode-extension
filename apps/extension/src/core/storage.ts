import { Storage as BaseStorage } from '@orientais/vscode-core/storage';
import type { ExtensionContext } from 'vscode';
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

export type { StorageChangeEvent } from '@orientais/vscode-core/storage';

// 合并当前键、已弃用键和动态键
type AllGlobalStorage = GlobalStorage & DeprecatedGlobalStorage & Record<GlobalStateKey, unknown>;
type AllWorkspaceStorage = WorkspaceStorage & DeprecatedWorkspaceStorage & Record<WorkspaceStateKey, unknown>;

type GlobalStorageKeys = keyof AllGlobalStorage & string;
type WorkspaceStorageKeys = keyof AllWorkspaceStorage & string;

/**
 * 扩展专用 Storage 类
 *
 * 继承自 vscode-core 的泛型 Storage，注入项目特定的键值类型和扩展前缀。
 * 额外提供 reset()、deleteWithPrefix() 等扩展特有的清理方法。
 */
export class Storage extends BaseStorage<AllGlobalStorage, AllWorkspaceStorage, SecretKeys> {
  constructor(context: ExtensionContext) {
    super(context, extensionPrefix);
  }

  /**
   * 根据前缀删除全局存储值
   */
  async deleteWithPrefix(prefix: ExtractPrefixes<GlobalStorageKeys, ':'>): Promise<void> {
    return this.deleteWithPrefixCore(prefix);
  }

  /**
   * 重置全局存储，保留 premium:subscription 和 plus:preview 相关键
   */
  async reset(): Promise<void> {
    return this.deleteWithPrefixCore(undefined, /^(premium:subscription|plus:preview:.*)$/);
  }

  /**
   * 根据前缀删除工作区存储值
   */
  async deleteWorkspaceWithPrefix(prefix: ExtractPrefixes<WorkspaceStorageKeys, ':'>): Promise<void> {
    return this.deleteWorkspaceWithPrefixCore(prefix);
  }
}
