import type { TreeNode } from '@packages/common/webviews/viewNode';

/**
 * 工作区键枚举
 * 定义工作区存储的键名标识
 */
export enum EWorkspaceKey {
  /** 所有项目 */
  ALL_PROJECT = 'allProject',
  /** 用于项目添加 */
  FOR_PROJECT_ADD = 'forProjectAdd',
  /** 用于项目移除 */
  FOR_PROJECT_REMOVE = 'forProjectRemove'
}

/**
 * 全局前缀键枚举
 * 定义存储中使用的前缀标识
 */
export enum EPrefixKey {
  /** 待保存文件前缀 */
  TO_SAVE_ = 'TO_SAVE_',
  /** 保留视图前缀 */
  VIEW_KEEP_ = 'VIEW_KEEP_',
  /** 文件哈希前缀 */
  FILE_HASH_ = 'FILE_HASH_',
  /** 文件合并前缀 */
  FILE_MERGE_ = 'FILE_MERGE_',
  /** 数据状态前缀 */
  DATA_STATE_ = 'DATA_STATE_',
  /** TODO 引用前缀 */
  TODO_REF_ = 'TODO_REF_',
  /** 主线程 Webview 前缀 */
  MAIN_THREAD_WEBVIEW = 'mainThreadWebview-',
  // 模型扩展信息
  EXTEND_INFO_ = 'EXTEND_INFO_'
}

/**
 * 工作区状态键常量定义
 * 用于统一管理工作区存储的键名
 */
export const workspaceState = Object.freeze({
  sdkInfoPrefix: 'SdkInfo.',
  arePrefix: 'IntegratedUnitAres.',
  areFileMTimeKeyPrefix: 'IntegratedUnitAreFileMTime.',
  runningMachinePrefix: 'RunningMachine.',
  deviceRunningArePrefix: 'DeviceRunningAre.',
  devices: 'devices',
  networkConfigMap: 'networkConfigMap',
  autotaskConfigMap: 'autotaskConfigMap',
  latestSdkVersion: 'latestSdkVersion',
  latestSdkName: 'latestSdkName',
  lastSelectedSdkDir: 'lastSelectedSdkDir', // 用户上次选择的SDK安装包所在目录
  allProject: EWorkspaceKey.ALL_PROJECT,
  forProjectAdd: EWorkspaceKey.FOR_PROJECT_ADD,
  forProjectRemove: EWorkspaceKey.FOR_PROJECT_REMOVE
} as const);

/**
 * 工作区状态键类型
 */
export type WorkspaceStateKey = (typeof workspaceState)[keyof typeof workspaceState];

/**
 * 全局状态键枚举
 * 定义全局状态的键名标识
 */
export enum EGlobalState {
  /** 项目树展开状态 */
  PROJECT_TREE_EXPANDED = 'projectTreeExpandedStates'
}

/**
 * 全局状态键常量定义
 * 用于统一管理全局存储的键名
 */
export const globalState = Object.freeze({
  deviceStatus: 'deviceStatus',
  defaultAreNameSequence: 'defaultAreNameSequence', // 从1开始自增
  projectTreeExpanded: EGlobalState.PROJECT_TREE_EXPANDED
} as const);

/**
 * 全局状态键类型
 */
export type GlobalStateKey = (typeof globalState)[keyof typeof globalState];

export type SecretKeys =
  | 'autosar:license'
  | 'auth:token' // 认证令牌
  | 'api:key'; // API 密钥

export type WorkspaceStorage = {
  currentNode: TreeNode;
};

/**
 * 存储已标记为废弃的工作区状态。
 */
export type DeprecatedWorkspaceStorage = {
  /** @deprecated use `currentNode` */
  test1currentNodeDeprecated: TreeNode;
};

/**
 * 编辑器树节点剪贴板数据
 */
export interface EditorClipboardData {
  /** 被复制的节点 ID */
  nodeId: string;
}

export type GlobalStorage = {
  'project.sort': boolean;
  /** 编辑器树节点复制剪贴板 */
  'editor.clipboard': EditorClipboardData | null;
};

/**
 * 目的：
 * 存储已标记为废弃的键值对。
 * 这些键可能在旧版本中使用过，但现在已被替换或不再需要。
 * 保留这些键可以确保向后兼容，并防止遗留数据的问题。
 *
 * 特点：
 * - 包含使用 @ deprecated 注解的键。
 * - 在未来版本中可能会被完全移除。
 * - 通常不会直接使用，而是通过迁移逻辑将其数据转移到新的存储结构中。
 */
export type DeprecatedGlobalStorage = {
  /** @deprecated use `project.sort` */
  'test1project.sortDeprecated': boolean;
};
