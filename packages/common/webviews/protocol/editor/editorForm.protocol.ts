import { IpcRequest } from '@packages/vscode-core';
import type { DraftOption, NodeAttrData, NodeAttrs } from '../../models/nodeData';

/**
 * 引用数据请求参数
 */
export interface DraftParams {
  appId: string;
  attrId: string;
  iType: string;
}

/**
 * 引用数据响应参数
 */
export type DraftResponse = DraftOption[];

export const DraftRequest = new IpcRequest<DraftParams, DraftResponse>('editor', 'draft/options');

/**
 * 编辑器右侧表单数据请求参数
 */
export interface EditorFormDataParams {
  nodeId: string;
}

/**
 * 编辑器右侧表单数据响应参数
 */
export interface SimpleObjectGroupSummary {
  templateId: string;
  parentTemplateId: string;
  name: string;
  description: string;
  upperBound: string;
  columns: string[];
  headers: string[];
  required: string[];
  count: number;
}

export interface SimpleObjectRow {
  nodeId: string;
  templateId: string;
  attrs: NodeAttrs;
}

export interface EditorNodeFormResponse {
  form: NodeAttrs;
  simpleObjectGroups: SimpleObjectGroupSummary[];
}

export type EditorFormDataResponse = EditorNodeFormResponse;

export const EditorFormDataRequest = new IpcRequest<EditorFormDataParams, EditorFormDataResponse>(
  'editor',
  'node/form'
);

/**
 * 文件夹节点列表数据请求参数
 */
export interface EditorNodeTableParams {
  nodeId: string;
}

/**
 * 文件夹节点表格单元格数据
 */
export interface FolderTableCell {
  id: string;
  name: string;
  label: string;
  value: unknown;
  component: string;
  type: string;
  iType: string;
  category: string;
  options?: NodeAttrData['options'];
}

/**
 * 文件夹节点表格行数据
 */
export interface FolderTableRow {
  nodeId: string;
  nodeName: string;
  displayName?: string;
  attrs: Record<string, FolderTableCell>;
}

/**
 * 文件夹节点列表数据响应参数
 */
export interface EditorNodeTableResponse {
  nodeId: string;
  rows: FolderTableRow[];
}

export const EditorNodeTableRequest = new IpcRequest<EditorNodeTableParams, EditorNodeTableResponse>(
  'editor',
  'node/table'
);

/**
 * Simple Objects 行数据请求参数
 */
export interface EditorSimpleObjectRowsParams {
  ownerNodeId: string;
  templateId: string;
}

/**
 * Simple Objects 行数据响应参数
 */
export type EditorSimpleObjectRowsResponse = SimpleObjectRow[];

export const EditorSimpleObjectRowsRequest = new IpcRequest<
  EditorSimpleObjectRowsParams,
  EditorSimpleObjectRowsResponse
>('editor', 'simple-object/rows');

/**
 * Simple Objects 创建请求参数。
 */
export interface EditorSimpleObjectCreateParams {
  ownerNodeId: string;
  parentTemplateId: string;
  templateId: string;
}

/**
 * Simple Objects 创建响应参数。
 */
export interface EditorSimpleObjectCreateResponse {
  ownerNodeId: string;
  templateId: string;
  row: SimpleObjectRow;
  count: number;
}

export const EditorSimpleObjectCreateRequest = new IpcRequest<
  EditorSimpleObjectCreateParams,
  EditorSimpleObjectCreateResponse
>('editor', 'simple-object/create');

/**
 * Simple Objects 删除请求参数。
 */
export interface EditorSimpleObjectDeleteParams {
  rowNodeId: string;
}

/**
 * Simple Objects 删除响应参数。
 */
export interface EditorSimpleObjectDeleteResponse {
  ownerNodeId: string;
  templateId: string;
  rowNodeId: string;
  count: number;
}

export const EditorSimpleObjectDeleteRequest = new IpcRequest<
  EditorSimpleObjectDeleteParams,
  EditorSimpleObjectDeleteResponse
>('editor', 'simple-object/delete');

/**
 * 编辑器聚焦目标。
 */
export type EditorFocusTarget =
  | { type: 'form-node'; nodeId: string }
  | { type: 'simple-row'; ownerNodeId: string; templateId: string; rowNodeId: string };

/**
 * 编辑器聚焦目标解析请求参数
 */
export interface EditorFocusTargetParams {
  nodeId: string;
}

/**
 * 编辑器聚焦目标解析响应参数
 */
export type EditorFocusTargetResponse = EditorFocusTarget | undefined;

export const EditorFocusTargetRequest = new IpcRequest<EditorFocusTargetParams, EditorFocusTargetResponse>(
  'editor',
  'focus-target'
);

/**
 * 模型编辑更新请求参数
 */
export interface EditorUpdateParams {
  nodeId: string;
  attrId: string;
  // 如果value为undefined，则表示删除该属性的值
  value?: NodeAttrData['value'] | DraftOption | DraftOption[];
}

/**
 * 模型编辑更新响应参数。
 */
export interface EditorUpdateResponse {
  changedAttrs: NodeAttrs;
}

export const EditorUpdateRequest = new IpcRequest<EditorUpdateParams, EditorUpdateResponse>('editor', 'node/update');
