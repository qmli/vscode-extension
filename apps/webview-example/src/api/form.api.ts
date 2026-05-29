import { useWebviewIPC } from '@orientais/webview-core';
import type {
  DraftParams,
  DraftResponse,
  EditorFocusTargetResponse,
  EditorFormDataResponse,
  EditorNodeTableResponse,
  EditorSimpleObjectCreateParams,
  EditorSimpleObjectCreateResponse,
  EditorSimpleObjectDeleteResponse,
  EditorSimpleObjectRowsResponse,
  EditorUpdateParams,
  EditorUpdateResponse
} from '@shared/webviews/protocol/editor/editorForm.protocol';
import {
  DraftRequest,
  EditorFocusTargetRequest,
  EditorFormDataRequest,
  EditorNodeTableRequest,
  EditorSimpleObjectCreateRequest,
  EditorSimpleObjectDeleteRequest,
  EditorSimpleObjectRowsRequest,
  EditorUpdateRequest
} from '@shared/webviews/protocol/editor/editorForm.protocol';

/**
 * 查询引用选项列表
 */
export async function fetchDraftOptions(params: DraftParams): Promise<DraftResponse> {
  const { sendRequest } = useWebviewIPC();
  const draftOptions = await sendRequest(DraftRequest, params);
  return draftOptions;
}

/**
 * 查询指定节点的表单数据
 */
export async function fetchNodeFormData(nodeId: string): Promise<EditorFormDataResponse> {
  const { sendRequest } = useWebviewIPC();
  const formData = await sendRequest(EditorFormDataRequest, { nodeId: nodeId });
  return formData;
}

/**
 * 查询指定文件夹节点的列表数据
 */
export async function fetchNodeTableData(nodeId: string): Promise<EditorNodeTableResponse> {
  const { sendRequest } = useWebviewIPC();
  const tableData = await sendRequest(EditorNodeTableRequest, { nodeId: nodeId });
  return tableData;
}

/**
 * 查询指定 Simple Object 分组的 rows 数据。
 */
export async function fetchSimpleObjectRows(
  ownerNodeId: string,
  templateId: string
): Promise<EditorSimpleObjectRowsResponse> {
  const { sendRequest } = useWebviewIPC();
  return sendRequest(EditorSimpleObjectRowsRequest, { ownerNodeId: ownerNodeId, templateId: templateId });
}

/**
 * 创建指定 Simple Object 分组下的新 row。
 */
export async function createSimpleObjectRow(
  params: EditorSimpleObjectCreateParams
): Promise<EditorSimpleObjectCreateResponse> {
  const { sendRequest } = useWebviewIPC();
  return sendRequest(EditorSimpleObjectCreateRequest, params);
}

/**
 * 删除指定 Simple Object row。
 */
export async function deleteSimpleObjectRow(rowNodeId: string): Promise<EditorSimpleObjectDeleteResponse> {
  const { sendRequest } = useWebviewIPC();
  return sendRequest(EditorSimpleObjectDeleteRequest, { rowNodeId: rowNodeId });
}

/**
 * 根据目标节点 ID 解析编辑器跳转目标。
 */
export async function resolveEditorFocusTarget(nodeId: string): Promise<EditorFocusTargetResponse> {
  const { sendRequest } = useWebviewIPC();
  return sendRequest(EditorFocusTargetRequest, { nodeId: nodeId });
}

/**
 * 更新指定节点的表单数据
 */
export async function updateNodeFormData(params: EditorUpdateParams): Promise<EditorUpdateResponse> {
  const { sendRequest } = useWebviewIPC();
  return sendRequest(EditorUpdateRequest, {
    nodeId: params.nodeId,
    attrId: params.attrId,
    value: params.value
  });
}
