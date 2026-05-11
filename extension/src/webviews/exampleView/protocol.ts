import type { WebviewState } from '@shared/protocol';

export interface State extends WebviewState<'autosar.example'> {
  version: string;
  /** onShowing 时传入的初始节点 ID，供前端跳过首次请求直接渲染 */
  initialNodeId?: string;
  /** onShowing 时传入的父节点 ID，供前端跳过首次请求直接渲染 */
  parentNodeId?: string;
  appId: string;
  rootId: string;
}
