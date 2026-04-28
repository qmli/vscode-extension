// =============================================================================
//  WebviewHost 接口（抽象接口层）
// =============================================================================

import type { Disposable, Uri, ViewBadge, ViewColumn } from 'vscode';
import type {
  IpcCallMessageType,
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcNotification,
  IpcRequest,
  WebviewState
} from '@shared/protocol';
import type { WebviewCommands, WebviewViewCommands } from '@shared/webviews/constants/constants.commands';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
import type { WebviewContext } from './webview';
import type { WebviewCommandCallback } from './webviewCommandRegistrar';

export interface WebviewShowOptions {
  column?: ViewColumn;
  preserveFocus?: boolean;
  preserveVisibility?: boolean;
}

export interface WebviewHost<ID extends WebviewIds | WebviewViewIds> {
  readonly id: ID;
  readonly extensionUri: Uri;

  // 状态属性
  title: string;
  description?: string;
  badge?: ViewBadge;
  readonly visible: boolean;
  readonly active?: boolean;
  readonly ready: boolean;
  readonly baseWebviewState: WebviewState;

  //核心方法
  notify<T extends IpcNotification<unknown>>(
    notificationType: T,
    params: IpcCallParamsType<T>,
    completionId?: string
  ): Promise<boolean>;
  refresh(force?: boolean): Promise<void>;
  registerWebviewCommand<T extends Partial<WebviewContext>>(
    command: WebviewCommands | WebviewViewCommands,
    callback: WebviewCommandCallback<T>
  ): Disposable;
  show(loading: boolean, options?: WebviewShowOptions, ...args: unknown[]): Promise<void>;
  respond<T extends IpcRequest<unknown, unknown>>(
    responseType: T,
    msg: IpcCallMessageType<T>,
    params: IpcCallResponseParamsType<T>
  ): Promise<boolean>;
  // 工具方法
  asWebviewUri(uri: Uri): Uri;
  getWebRoot(): string;
  // 类型判断
  is(type: 'editor'): this is WebviewHost<ID extends WebviewIds ? ID : never>;
  is(type: 'view'): this is WebviewHost<ID extends WebviewViewIds ? ID : never>;
}
