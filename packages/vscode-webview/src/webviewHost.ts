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
} from '@orientais/shared';
import type { WebviewContext } from './webview';
import type { WebviewCommandCallback } from './webviewCommandRegistrar';

export interface WebviewShowOptions {
  column?: ViewColumn;
  preserveFocus?: boolean;
  preserveVisibility?: boolean;
}

export interface WebviewHost<ID extends string> {
  readonly id: ID;
  readonly extensionUri: Uri;

  // 状态属性
  title: string;
  description?: string;
  badge?: ViewBadge;
  // Dirty 状态表示 Webview 中的内容是否已修改但尚未保存—— 仅对WebviewPanel（editor）有效，WebviewView 忽略
  /** 当前是否有未保存的更改 */
  dirty: boolean;
  readonly visible: boolean;
  readonly active?: boolean;
  readonly ready: boolean;
  readonly baseWebviewState: WebviewState;

  /** 标记为有未保存更改，并在标题上显示 "● " 指示符 */
  markDirty(): void;
  /** 清除未保存更改标记，并移除标题上的 "● " 指示符 */
  clearDirty(): void;
  //核心方法
  notify<T extends IpcNotification<unknown>>(
    notificationType: T,
    params: IpcCallParamsType<T>,
    completionId?: string
  ): Promise<boolean>;
  refresh(force?: boolean): Promise<void>;
  registerWebviewCommand<T extends Partial<WebviewContext>>(
    command: string,
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
  is(type: 'editor' | 'view'): this is WebviewHost<ID>;
}
