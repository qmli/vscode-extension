import { IpcCommand, IpcNotification, IpcRequest, scope } from '../../../protocol';
import type { MoreAction } from '../../models/moreAction';
import type { ProjectAppNodeAttrInfo } from '../../models/projects/projectAppNodeAttrInfo';
import type { Template } from '../../models/template';
// ==================== 路由相关 ====================

/**
 * 路由指令初始化
 */
export interface RouterInitParams {
  route: string;
  context?: Record<string, unknown>;
}
export const AppComRouterInitCommand = new IpcCommand<RouterInitParams>(scope, 'app/router/init');

// ==================== Webview 相关 ====================

/**
 * Webview 重命名
 */
export interface WebviewRenameParams {
  oldName: string;
  newName: string;
  id?: string;
}
export interface WebviewRenameResponse {
  success: boolean;
  error?: string;
}
export const AppWebviewRenameRequest = new IpcRequest<WebviewRenameParams, WebviewRenameResponse>(
  scope,
  'app/webview/rename'
);

/**
 * Webview 焦点变化
 */
export interface WebviewFocusParams {
  focused: boolean;
  webviewId?: string;
  elementId?: string;
}
export const AppWebviewFocusCommand = new IpcCommand<WebviewFocusParams>(scope, 'app/webview/focus');

/**
 * Webview 消息传递
 */
export interface WebviewMessageParams {
  type: string;
  data: unknown;
  target?: string;
  timestamp?: number;
}
export const AppWebviewMessageCommand = new IpcCommand<WebviewMessageParams>(scope, 'app/webview/message');

/**
 * Webview 数据校验
 */
export interface WebviewValidateParams {
  data: Record<string, unknown>;
  rules?: Record<string, unknown>;
}
export interface WebviewValidateResponse {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
export const AppWebviewValidateRequest = new IpcRequest<WebviewValidateParams, WebviewValidateResponse>(
  scope,
  'app/webview/validate'
);

/**
 * Webview 回调指令
 */
export interface WebviewCallbackParams {
  callbackId: string;
  data?: unknown;
  error?: string;
}
export const AppWebviewCallbackCommand = new IpcCommand<WebviewCallbackParams>(scope, 'app/webview/callback');

/**
 * Webview 页面数据初始化
 */
export interface WebviewDataInitParams {
  viewId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
export interface WebviewDataInitResponse {
  success: boolean;
  initializedFields?: string[];
}
export const AppWebviewDataInitRequest = new IpcRequest<WebviewDataInitParams, WebviewDataInitResponse>(
  scope,
  'app/webview/data/init'
);

/**
 * Webview 页面只读状态
 */
export interface WebviewReadonlyParams {
  readonly: boolean;
  viewId?: string;
  fields?: string[];
}
export const AppWebviewReadonlyCommand = new IpcCommand<WebviewReadonlyParams>(scope, 'app/webview/readonly');

// ==================== Section Tree 相关 ====================

/**
 * 树叶点击事件
 */
export interface SectionTreeLeafClickParams {
  nodeId: string;
  nodePath: string[];
  nodeData: Record<string, unknown>;
  event?: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
}
export const AppSectionTreeLeafClickCommand = new IpcCommand<SectionTreeLeafClickParams>(
  scope,
  'app/section/tree/leaf/click'
);

/**
 * 树叶激活状态
 */
export interface SectionTreeLeafActiveParams {
  nodeId: string;
  active: boolean;
}
export const AppSectionTreeLeafActiveCommand = new IpcCommand<SectionTreeLeafActiveParams>(
  scope,
  'app/section/tree/leaf/active'
);

// ==================== 状态管理相关 ====================

/**
 * VSCode 状态保持
 */
export interface VscodeStateParams {
  key: string;
  value: unknown;
  scope?: 'global' | 'workspace' | 'workspaceFolder';
}
export interface VscodeStateResponse {
  success: boolean;
  previousValue?: unknown;
}
export const AppVscodeStateRequest = new IpcRequest<VscodeStateParams, VscodeStateResponse>(scope, 'app/vscode/state');

/**
 * 文件状态
 */
export interface FileStateParams {
  filePath: string;
  state: 'saved' | 'modified' | 'deleted' | 'created';
  metadata?: Record<string, unknown>;
}
export const AppFileStateCommand = new IpcCommand<FileStateParams>(scope, 'app/file/state');

// ==================== UI 组件相关 ====================

/**
 * Footer Bar 状态更新
 */
export interface FooterBarParams {
  items?: Array<{
    id: string;
    text: string;
    icon?: string;
    tooltip?: string;
    command?: string;
  }>;
  visible?: boolean;
}
export const AppFooterBarCommand = new IpcCommand<FooterBarParams>(scope, 'app/footer/bar');

// ==================== 通知类型（从扩展发送到 webview）====================

/**
 * 通知 Webview 焦点变化
 */
export const DidChangeWebviewFocusNotification = new IpcNotification<WebviewFocusParams>(
  scope,
  'app/webview/focus/didChange'
);

/**
 * 通知文件状态变化
 */
export const DidChangeFileStateNotification = new IpcNotification<FileStateParams>(scope, 'app/file/state/didChange');

/**
 * 通知树节点激活状态变化
 */
export const DidChangeTreeLeafActiveNotification = new IpcNotification<SectionTreeLeafActiveParams>(
  scope,
  'app/section/tree/leaf/active/didChange'
);

// ==================== 其他 ====================

/**
 * Section Tree 树叶草稿
 */
export interface SectionTreeLeafDraftParams {
  transCommand: string;
  iType: string[];
  label: string;
  value: string;
  multiple: boolean;
  result: string[];
  headers: Array<{
    label: string;
    prop: string;
    hide?: boolean;
  }>;
}
/**
 *   源替换ComponentUtils.createDraft
 */
export const AppCreateDraftCommand = new IpcCommand<SectionTreeLeafDraftParams>(scope, 'app/section/tree/leaf/draft'); // 源 APP_SECTION_TREE_VIEW_COMMAND_LEAF_DRAFT

/**
 * 应用区域树视图叶子节点初始化详情对象
 */
export interface LeafInitDetail {
  /**
   * 视图扩展信息对象，包含外部传入的配置信息
   * 类型：IExt
   */
  info: {
    /** 是否保持面板状态 */
    keep?: boolean;
    /** 配置项代码标识 */
    code?: string;
    /** 配置项名称 */
    name?: string;
    /** 当前激活的标签页名称 */
    activeName?: string;
    /** 配置项唯一标识符 */
    id?: string;
    /** 是否已加载 */
    onload?: boolean;
  };

  /**
   * 标签页数据数组，经过过滤处理后的配置项列表
   * 类型：IKeyValueObject<string>[]
   * 注意：每个对象已删除 detail 和 menu 属性
   */
  tabs: Array<{
    /** 配置项唯一标识符 */
    id?: string | string[];
    /** 配置项代码标识 */
    code?: string;
    /** 配置项名称 */
    name?: string;
    /** 是否为标签页 */
    isTab?: boolean;
    /** 是否显示 */
    isShow?: boolean;
    /** 图标路径或标识 */
    icon?: string;
    /** 组件名称 */
    component?: string;
    /** 父级配置项的ID */
    parentId?: string;
    /** 头部配置对象 */
    header?: Record<string, boolean>;
    /** 数据数组 */
    data?: Record<string, unknown>[];
    // 注意：detail 和 menu 属性在 filter 过程中已被删除
  }>;
}

/**
 * 应用区域树视图叶子节点初始化传输信息对象
 */
export interface LeafInitParams {
  /** 回调函数ID，用于标识回调函数 */
  cbId: string;
  /** 命令代码，标识要执行的操作类型 */
  code: string;
  /** 详细信息对象，包含视图信息和标签页数据 */
  detail: LeafInitDetail;
}
export const AppLeafInitNotification = new IpcNotification<LeafInitParams>(scope, 'app/section/tree/leaf/init'); //isoft-orientais-studio.cmd.init

/**
 * 添加节点命令的传输数据对象
 * 类型：ITransferData
 */
export interface AddNodeferData {
  /** 回调函数ID，由前端通过 UUID() 生成，用于标识回调函数 */
  cbId: string;

  /** 命令代码，固定为 I_SOFT_GLOBAL.COMMAND.APP_WEBVIEW_CALLBACK */
  code: string;

  /** 详细信息对象，根据添加模式不同而不同 */
  detail: IAddNodeDetail;
}

/**
 * 添加节点详情对象（两种模式）
 */
type IAddNodeDetail =
  | BatchAddNodeDetail // 批量添加模式
  | SingleAddNodeDetail; // 单个添加模式

/**
 * 批量添加节点详情对象
 * 当存在 parentId 和 ids 时使用此模式
 */
interface BatchAddNodeDetail {
  /** 父节点ID，用于指定新节点的父节点 */
  parentId: string;

  /** 模板ID数组，用于批量创建节点 */
  ids: string[];

  /** 节点ID（可选），如果提供则使用该节点作为父节点 */
  nodeId?: string;

  /** 树ID（可选），用于指定节点所属的树结构 */
  treeId?: string;
}

/**
 * 单个节点添加详情对象
 * 当不存在 parentId 和 ids 时使用此模式
 */
interface SingleAddNodeDetail {
  /** 节点对象，包含完整的节点信息 */
  node: {
    /** 节点唯一标识符（前端生成，使用 UUID()） */
    id: string;

    /** 节点名称 */
    name: string;

    /** 模板ID，用于标识节点的模板类型 */
    tempId: string;

    /** 节点类型（如 ROOT, SUB_ROOT, NODE 等） */
    type: string;

    /** 是否为节点（布尔值） */
    isNode: boolean;

    /** 父节点ID */
    parentId: string;

    /** 根节点ID */
    rootId: string;

    /** 树ID（可选） */
    treeId?: string;

    /** 显示名称（可选，后端可能添加） */
    displayName?: string;

    /** 其他可能的节点属性 */
    [key: string]: unknown;
  };
}

export const AppAddNodeCommand = new IpcCommand<AddNodeferData>(scope, 'app/section/tree/leaf/add'); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_ADD isoft-orientais-studio.cmd.add

/**
 * APP_SECTION_TREE_VIEW_COMMAND_LEAF_UPDATE 命令中 data.detail 的类型定义
 */
export interface LeafUpdateDetail {
  /** 属性ID */
  id: string;
  /** 属性值 */
  value: Record<string, unknown>;
  /** 属性名称 */
  name: string;
  /** 更新前的节点数据，用于撤销操作 */
  prevNodeData: Record<string, unknown>[];
  /** 树ID（可选，可能动态添加） */
  treeId?: string;
  /** 节点ID（可选，从 state.dummy 展开） */
  nodeId?: string;
  /** 其他可能的属性（从 state.dummy 展开，格式为 [id: string]: string） */
  [key: string]: unknown;
}

/**
 * APP_SECTION_TREE_VIEW_COMMAND_LEAF_UPDATE 命令中 data 的类型定义
 */
export interface LeafUpdateData {
  /** 更新详情 */
  detail: LeafUpdateDetail;
}
export const AppLeafUpdateCommand = new IpcCommand<LeafUpdateData>(scope, 'app/section/tree/leaf/update'); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_UPDATE isoft-orientais-studio.cmd.update

/**
 * 删除叶子节点操作的 detail 数据结构
 */
interface DeleteLeafDetail {
  /** 节点ID */
  id?: string;
  /** 树ID */
  treeId?: string;
  /** 模板ID */
  tempId?: string;
  /** 操作结果代码 */
  code: string; // 源码00， 01
  /** 操作类型（仅在成功删除时存在） */
  type?: 'remove';
  /** 其他可能的属性 */
  [key: string]: any;
}

/**
 * 删除叶子节点操作的 data 数据结构
 */
export interface DeleteLeafDataResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: DeleteLeafDetail;
}

/**
 * 删除叶子节点操作的 detail 数据结构
 */
export interface DeleteLeafDetailParams {
  /** 节点ID */
  id: string;
  /** 树ID */
  treeId: string;
  /** 模板ID */
  tempId: string;
}
export const AppDeleteLeafRequest = new IpcRequest<DeleteLeafDetailParams, DeleteLeafDataResponse>(
  scope,
  'app/section/tree/leaf/delete'
); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_DELETE isoft-orientais-studio.cmd.delete

/**
 * 删除叶子节点操作的 data 数据结构
 */
export interface LeafViewResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    code: string; // 源码00， 01
  };
}

export interface LeafViewParams {
  detail: {
    nodeId: string;
  };
}

export const AppLeafViewRequest = new IpcRequest<LeafViewParams, LeafViewResponse>(scope, 'app/section/tree/leaf/view'); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_VIEW isoft-orientais-studio.command.view

/**
 * 视图焦点操作的 detail 数据结构
 */
export interface LeafViewFocusParams {
  /** 应用ID */
  appId: string;
  /** 节点ID */
  nodeId?: string;
  /** 树ID */
  treeId?: string;
  /** 根节点ID */
  rootId: string;
  /** 属性ID */
  attrId?: string;
  /** 锚点位置 */
  anchor: string;
}

export const AppViewFocusCommand = new IpcCommand<LeafViewFocusParams>(scope, 'app/section/tree/leaf/view/focus'); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_FOCUS isoft-orientais-studio.command.focus

/**
 * 表单提交操作的
 */
export interface LeafFromCommitParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    modified: string;
  };
}

export interface LeafFromCommitResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    code: string;
  };
}

export const AppLeafFromCommitRequest = new IpcRequest<LeafFromCommitParams, LeafFromCommitResponse>(
  scope,
  'app/section/tree/leaf/from/commit'
); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_COMMIT AppSectionTreeView.command.commit

export interface LeafClickParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    code: string;
    type: string;
    name: string;
  };
}

export interface LeafClickResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    original: string;
    modified: string;
  };
}

/**
 * Tree 节点击事件
 */
export const AppLeafClickRequest = new IpcRequest<LeafClickParams, LeafClickResponse>(
  scope,
  'app/section/tree/leaf/click'
); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_CLICK AppSectionTreeView.command.leaf.click

export interface LeafResetResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    code: string;
    info: {
      name: string;
    };
  };
}

export interface LeafResetParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    code: string;
    info: {
      name: string;
    };
  };
}
export const AppLeafResetRequest = new IpcRequest<LeafResetParams, LeafResetResponse>(
  scope,
  'app/section/tree/leaf/reset'
); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_RESET AppSectionTreeView.command.leaf.reset

export interface LeafFormResponse {
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: ProjectAppNodeAttrInfo[];
  data: {
    treeId?: string;
    nodeId: string;
    displayName: string;
  };
}

export interface LeafFormParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: ProjectAppNodeAttrInfo[];
  data: {
    treeId?: string;
    nodeId: string;
    displayName: string;
  };
}

/**
 * 树节点击表单
 */
export const AppLeafFormRequest = new IpcRequest<LeafFormParams, LeafFormResponse>(scope, 'app/section/tree/leaf/form'); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_FORM AppSectionTreeView.command.leaf.form

export interface LeafGetParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    type: string;
    parentId: string;
  };
}

export interface LeafGetResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: ProjectAppNodeAttrInfo[];
  data: Template[];
}
/**
 * 树节点获取节点信息
 */
export const AppLeafGetRequest = new IpcRequest<LeafGetParams, LeafGetResponse>(scope, 'app/section/tree/leaf/get'); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_GET AppSectionTreeView.command.leaf.get

export interface LeafSiblingResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: Template[];
}

export interface LeafSiblingParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    nodeId: string;
    tempId: string;
    outline: string;
  };
}

/**
 * 获取兄弟节点
 */
export const AppLeafSiblingRequest = new IpcRequest<LeafSiblingParams, LeafSiblingResponse>(
  scope,
  'app/section/tree/leaf/sibling'
); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_SIBLING AppSectionTreeView.command.leaf.sibling

/**
 * APP_SECTION_TREE_VIEW_COMMAND_LEAF_CONTEXTMENU
 */
export interface LeafContextMenuParams {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    id: string;
    nodeId: string;
    tempId: string;
  };
}

export interface LeafContextMenuResponse {
  /** 回调函数ID */
  cbId: string;
  /** 命令代码 */
  code: string;
  /** 详细信息 */
  detail: {
    code: string;
    data: MoreAction;
  };
}
/**
 * 获取鼠标右键
 */
export const AppLeafContextMenuRequest = new IpcRequest<LeafContextMenuParams, LeafContextMenuResponse>(
  scope,
  'app/section/tree/leaf/contextmenu'
); //APP_SECTION_TREE_VIEW_COMMAND_LEAF_CONTEXTMENU AppSectionTreeView.command.leaf.contextmenu
