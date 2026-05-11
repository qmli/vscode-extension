import type { WebviewState as BaseWebviewState } from '@orientais/shared/protocol';
import { IpcCommand, IpcRequest } from '@orientais/shared/protocol';
import type { GlCommands } from './webviews/constants/constants.commands';
import type { WebviewIds, WebviewTypes, WebviewViewIds, WebviewViewTypes } from './webviews/constants/constants.views';

// 重新导出 vscode-core 中的 IPC 基础设施，所有消费方无需更改导入路径
export {
  DidChangeHostWindowFocusNotification,
  DidChangeWebviewFocusNotification,
  DidChangeWebviewVisibilityNotification,
  ipcPromiseSettled,
  IpcCommand,
  IpcNotification,
  IpcRequest,
  isIpcPromise,
  WebviewFocusChangedCommand,
  WebviewReadyCommand,
  WebviewReloadCommand
} from '@orientais/shared/protocol';
export type {
  DidChangeHostWindowFocusParams,
  DidChangeWebviewFocusParams,
  DidChangeWebviewVisibilityParams,
  IpcCallMessageType,
  IpcCallParamsType,
  IpcCallResponseMessageType,
  IpcCallResponseParamsType,
  IpcCallResponseType,
  IpcMessage,
  IpcPromise,
  WebviewFocusChangedParams,
  WebviewState
} from '@orientais/shared/protocol';

/** 业务层收窄的 IpcScope：限定为已知的 scope 字面量 */
export type IpcScope = 'core' | WebviewTypes | WebviewViewTypes;

export const scope: IpcScope = 'core';

// ── 业务特定类型 ──────────────────────────────────────────────────────────────

export interface ExecuteCommandParams {
  command: GlCommands;
  args?: unknown[];
}

export const ExecuteCommand = new IpcCommand<ExecuteCommandParams>('core', 'command/execute');

/** Webview 持久化状态（含业务视图 ID 约束） */
export type AppWebviewState<ID extends WebviewIds | WebviewViewIds = WebviewIds | WebviewViewIds> =
  BaseWebviewState<ID>;
