import { useWebviewIPC } from '@orientais/webview-core';
import type {
  EditorTreeCloneResponse,
  EditorTreeDeleteResponse,
  EditorTreeInitParams,
  EditorTreeInitResponse,
  NodeContextMenuResponse
} from '@shared/webviews/protocol/editor/editorTree.protocol';
import {
  EditorTreeAddNodeRequest,
  EditorTreeCloneRequest,
  EditorTreeDeleteRequest,
  EditorTreeInitRequest,
  NodeContextMenuRequest
} from '@shared/webviews/protocol/editor/editorTree.protocol';

/**
 * 请求编辑器左侧树的初始化数据
 */
export async function fetchEditorTreeInitData(params: EditorTreeInitParams): Promise<EditorTreeInitResponse> {
  const { sendRequest } = useWebviewIPC();
  const nodes = await sendRequest(EditorTreeInitRequest, params);
  return nodes;
}

/**
 * 请求编辑器左侧树中节点的右键菜单数据
 */
export async function fetchNodeContextMenuData(nodeId: string): Promise<NodeContextMenuResponse> {
  const { sendRequest } = useWebviewIPC();
  const data = await sendRequest(NodeContextMenuRequest, { nodeId: nodeId });
  return data;
}

/**
 * 请求删除编辑器左侧树中的指定节点
 */
export async function deleteEditorTreeNode(nodeId: string): Promise<EditorTreeDeleteResponse> {
  const { sendRequest } = useWebviewIPC();
  const deleted = await sendRequest(EditorTreeDeleteRequest, { nodeId: nodeId });
  return deleted;
}

/**
 * 请求克隆编辑器左侧树中的指定节点
 */
export async function cloneEditorTreeNode(nodeId: string): Promise<EditorTreeCloneResponse> {
  const { sendRequest } = useWebviewIPC();
  const cloned = await sendRequest(EditorTreeCloneRequest, { nodeId: nodeId });
  return cloned;
}

/**
 * 请求后台添加编辑器左侧树中的节点
 */
export async function addEditorTreeNode(nodeId: string): Promise<void> {
  const { sendRequest } = useWebviewIPC();
  await sendRequest(EditorTreeAddNodeRequest, { nodeId: nodeId });
}
