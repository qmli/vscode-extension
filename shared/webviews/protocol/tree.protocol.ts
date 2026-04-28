import { IpcCommand, IpcNotification, IpcRequest, scope } from '../../protocol';
import type { EIntegrityLevel } from '../models/integerity';

/**
 * 树排序模式。
 */
export type TreeSortMode = 'manual' | 'name-asc' | 'name-desc';

/**
 * 树节点类型定义。
 */
export type TreeNodeType = 'GROUP' | 'PROJECT' | 'MODELS' | 'CONFIGURATIONS' | 'NODE' | 'REFERENCES' | 'NEW';

/**
 * 工程树节点模型（共享协议）。
 */
export interface TreeNodeDto {
  appId: string;
  id: string;
  parentId?: string;
  sourceProjectId?: string;
  referenceId?: string;
  label: string;
  type: TreeNodeType;
  name: string;
  isL1Node?: boolean;
  displayName?: string;
  description?: string;
  status?: EIntegrityLevel;
  images?: { dark: string; light: string };
  attrs?: Record<string, string>;
  platform?: string;
  pendingSave?: boolean;
  retainedView?: boolean;
  /** 内部使用：复合 key（type:id），用于树组件的唯一标识 */
  _key?: string;
  /** 内部使用：UI 父节点 ID，用于树组件的展开路径 */
  uiParentId?: string;
  children?: TreeNodeDto[];
}

/**
 * 工程树状态回放模型。
 */
export interface TreeReplayState {
  expandedKeys: string[];
  selectedKey?: string;
  sortMode: TreeSortMode;
  pendingSaveProjectIds?: string[];
  retainedViewProjectIds?: string[];
}

/**
 * 工程树初始化快照。
 */
export interface TreeSnapshot {
  nodes: TreeNodeDto[];
  replay: TreeReplayState;
}

/**
 * 工程树初始化请求参数。
 */
export interface TreeDataInitParams {
  viewId: string;
}

/**
 * 工程树初始化请求响应。
 */
export interface TreeDataInitResponse {
  snapshot: TreeSnapshot;
}

/**
 * 创建工程请求参数。
 */
export interface TreeProjectCreateParams {
  groupId: string;
}

/**
 * 创建工程请求响应。
 */
export interface TreeProjectCreateResponse {
  triggered: boolean;
}

/**
 * 更多操作请求参数。
 */
export interface TreeMoreActionParams {
  id: string;
  appId: string;
  parentId?: string;
  uiParentId?: string;
  action: TreeMoreActionType;
  value?: string;
  type: TreeNodeType;
  isL1Node?: boolean;
}

/**
 * 上下文菜单动作项类型（扩展 TreeMoreActionType）
 */
export type TreeContextMenuActionType = TreeMoreActionType | 'expandAll' | 'sort-asc' | 'sort-desc' | 'sort-manual';

/**
 * 上下文菜单项配置
 */
export interface TreeContextMenuItem {
  key: TreeContextMenuActionType;
  label: string;
  disabled?: boolean;
  divider?: boolean;
}

/**
 * 上下文菜单请求参数
 */
export interface TreeContextMenuParams {
  nodeId: string;
  nodeType: TreeNodeType;
  nodeName?: string;
  appId?: string;
  sourceProjectId?: string;
  referenceId?: string;
}

/**
 * 上下文菜单响应
 */
export interface TreeContextMenuResponse {
  actions: TreeContextMenuItem[];
}

/**
 * 更多操作类型。
 */
export type TreeMoreActionType =
  | 'rename'
  | 'delete'
  | 'create'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'clone'
  | 'sync'
  | 'link'
  | 'unlink'
  | 'import-json'
  | 'import-arxml'
  | 'import-eb'
  | 'import-dbc'
  | 'import-ldf'
  | 'import-odx'
  | 'export-project'
  | 'export-service'
  | 'export-arxml'
  | 'model-export'
  | 'table-export'
  | 'generate-code'
  | 'generate-bswmd'
  | 'make-package'
  | 'make-are-runtime'
  | 'push-are-device'
  | 'dep-link'
  | 'build'
  | 'compile'
  | 'update'
  | 'add-integrated'
  | 'delete-unit'
  | 'delete-integrated'
  | 'validate'
  | 'more'
  | 'cancel';

/**
 * 更多操作请求响应。
 */
export interface TreeMoreActionResponse {
  action: TreeMoreActionType;
  value?: string;
  executed?: boolean;
  message?: string;
}

/**
 * 节点聚焦请求参数。
 */
export interface TreeFocusParams {
  nodeId: string;
  expandPath?: boolean;
  scrollIntoView?: boolean;
}

/**
 * 节点聚焦请求响应。
 */
export interface TreeFocusResponse {
  focused: boolean;
  message?: string;
}

/**
 * 工程树增量事件类型。
 */
export type TreeDeltaType = 'add' | 'update' | 'delete' | 'reload' | 'select';

/**
 * 工程树增量事件。
 */
export interface TreeDeltaEvent {
  type: TreeDeltaType;
  node?: TreeNodeDto;
  nodeId?: string;
  parentId?: string;
  replaceChildren?: boolean;
  snapshot?: TreeSnapshot;
  /** 'select' 类型的展开路径（纯 id 数组） */
  expandedKeys?: string[];
}

/**
 * Webview 请求扩展侧工程树初始化数据。
 */
export const TreeDataInitRequest = new IpcRequest<TreeDataInitParams, TreeDataInitResponse>(
  scope,
  'app/tree/data/init'
);

/**
 * Webview 请求扩展侧拉起创建工程向导。
 */
export const TreeProjectCreateRequest = new IpcRequest<TreeProjectCreateParams, TreeProjectCreateResponse>(
  scope,
  'app/tree/project/create'
);

/**
 * Webview 请求扩展侧弹出更多操作 QuickPick。
 */
export const TreeMoreActionRequest = new IpcRequest<TreeMoreActionParams, TreeMoreActionResponse>(
  scope,
  'app/tree/more-action'
);

/**
 * 扩展侧向 Webview 推送工程树增量事件。
 */
export const TreeDeltaNotification = new IpcNotification<TreeDeltaEvent>(scope, 'app/tree/delta');

/**
 * Webview 向扩展侧同步树状态（展开、选中、排序）。
 */
export const TreeReplayStateCommand = new IpcCommand<TreeReplayState>(scope, 'app/tree/replay/state');

/**
 * 节点聚焦请求 - 用于从外部视图跳转到树节点。
 * 支持展开路径、滚动到视图等功能。
 */
export const TreeFocusRequest = new IpcRequest<TreeFocusParams, TreeFocusResponse>(scope, 'app/tree/focus');

/**
 * 打开节点编辑器请求参数。
 */
export interface TreeOpenEditorParams {
  nodeId: string;
  appId: string;
}

/**
 * 打开节点编辑器请求响应。
 */
export interface TreeOpenEditorResponse {
  opened: boolean;
  message?: string;
}

/**
 * 打开节点编辑器请求 - 用于在编辑器中打开节点。
 */
export const TreeOpenEditorRequest = new IpcRequest<TreeOpenEditorParams, TreeOpenEditorResponse>(
  scope,
  'app/tree/open-editor'
);

/**
 * 上下文菜单请求 - 用于获取节点的右键菜单配置。
 */
export const TreeContextMenuRequest = new IpcRequest<TreeContextMenuParams, TreeContextMenuResponse>(
  scope,
  'app/tree/context-menu'
);

/**
 * 树操作类型（前端执行）。
 */
export type TreeActionType = 'toggleAll' | 'sortAsc' | 'sortDesc' | 'sortManual';

/**
 * 树操作事件参数。
 */
export interface TreeActionParams {
  action: TreeActionType;
  nodeId?: string;
}

/**
 * 树操作通知 - 从后端通知前端执行操作。
 */
export const TreeActionNotification = new IpcNotification<TreeActionParams>(scope, 'app/tree/action');
