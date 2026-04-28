import { IpcRequest } from '@shared/protocol';
import type { NodeContextMenuData, NodeData } from '../../models/nodeData';

// #region 编辑器左侧树形Node数据初始化相关协议
/**
 * 编辑器左侧树形Node数据初始化请求参数
 */
export interface EditorTreeInitParams {
  /**
   * 工程ID - 后面可以考虑是否可以重命名为projectId
   */
  appId: string;

  /**
   * 树根节点ID
   */
  rootId: string;
}

/**
 * 编辑器左侧树形Node数据初始化响应参数
 */
export type EditorTreeInitResponse = {
  /**
   * 在某些特殊场景下，树形菜单为不可见状态
   */
  treeVisible: boolean;
  /**
   * 树形菜单节点数据
   */
  nodes: NodeData[];
};

/**
 * EditorTreeInitRequest 用于请求编辑器左侧树形Node数据的初始化
 */
export const EditorTreeInitRequest = new IpcRequest<EditorTreeInitParams, EditorTreeInitResponse>(
  'editor',
  'tree/init'
);

/**
 * Node右键菜单请求参数
 */
export interface NodeContextMenuParams {
  nodeId: string;
}

/**
 * Node右键菜单响应参数
 */
export type NodeContextMenuResponse = NodeContextMenuData;

export const NodeContextMenuRequest = new IpcRequest<NodeContextMenuParams, NodeContextMenuResponse>(
  'editor',
  'tree/node-context-menu'
);

/**
 * 树节点删除请求参数
 */
export interface EditorTreeDeleteParams {
  nodeId: string;
}

/**
 * 树节点删除响应参数
 */
export type EditorTreeDeleteResponse = boolean;

/**
 * EditorTreeDeleteRequest 用于请求删除编辑器左侧树中的指定节点
 */
export const EditorTreeDeleteRequest = new IpcRequest<EditorTreeDeleteParams, EditorTreeDeleteResponse>(
  'editor',
  'tree/delete'
);

/**
 * 树节点克隆请求参数
 */
export interface EditorTreeCloneParams {
  nodeId: string;
}

/**
 * 树节点克隆响应参数
 */
export type EditorTreeCloneResponse = boolean;

/**
 * EditorTreeCloneRequest 用于请求克隆编辑器左侧树中的指定节点
 */
export const EditorTreeCloneRequest = new IpcRequest<EditorTreeCloneParams, EditorTreeCloneResponse>(
  'editor',
  'tree/clone'
);

export const EditorTreeAddNodeRequest = new IpcRequest<{ nodeId: string }, void>('editor', 'tree/addNode');

// #region 编辑器树节点复制粘贴协议

/**
 * 树节点复制请求参数
 */
export interface EditorTreeCopyParams {
  nodeId: string;
}

/**
 * 树节点复制响应参数
 */
export type EditorTreeCopyResponse = boolean;

/**
 * EditorTreeCopyRequest 用于将指定节点信息存入剪贴板
 */
export const EditorTreeCopyRequest = new IpcRequest<EditorTreeCopyParams, EditorTreeCopyResponse>(
  'editor',
  'tree/copy'
);

/**
 * 树节点粘贴请求参数
 */
export interface EditorTreePasteParams {
  nodeId: string;
}

/**
 * 树节点粘贴响应参数 — 返回新增的节点列表，失败时返回 null
 */
export type EditorTreePasteResponse = NodeData[] | null;

/**
 * EditorTreePasteRequest 用于将剪贴板中的节点粘贴到目标节点下
 */
export const EditorTreePasteRequest = new IpcRequest<EditorTreePasteParams, EditorTreePasteResponse>(
  'editor',
  'tree/paste'
);
// #endregion
// #endregion
