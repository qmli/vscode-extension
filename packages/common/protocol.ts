import type { GlCommands } from './webviews/constants/constants.commands';
import type { WebviewIds, WebviewTypes, WebviewViewIds, WebviewViewTypes } from './webviews/constants/constants.views';

export type IpcScope = 'core' | WebviewTypes | WebviewViewTypes;

export const scope: IpcScope = 'core';

export type IpcMessage<T = unknown> = {
  id: string;
  scope: IpcScope;
  method: string;
  packed?: boolean;
  params: T;
  completionId?: string;
};

abstract class IpcCall<Params = unknown> {
  public readonly method: string;
  constructor(
    public readonly scope: IpcScope,
    method: string,
    public readonly reset: boolean = false,
    public readonly pack: boolean = false
  ) {
    this.method = `${scope}/${method}`;
  }
  is(msg: IpcMessage): msg is IpcMessage<Params> {
    return msg.method === this.method;
  }
}

export type IpcCallMessageType<T> = T extends IpcCall<infer P> ? IpcMessage<P> : never;
export type IpcCallParamsType<T> = IpcCallMessageType<T>['params'];
export type IpcCallResponseType<T> = T extends IpcRequest<infer _, infer _> ? T['response'] : never;
export type IpcCallResponseMessageType<T> = IpcCallMessageType<IpcCallResponseType<T>>;
export type IpcCallResponseParamsType<T> = IpcCallResponseMessageType<T>['params'];

/**
 * 命令是从 webview 发送到扩展主进程的
 */
export class IpcCommand<Params = void> extends IpcCall<Params> {}

/**
 * 请求从 webview 发送到扩展，并期望得到响应
 */
export class IpcRequest<Params = void, ResponseParams = void> extends IpcCall<Params> {
  public readonly response: IpcNotification<ResponseParams>;

  constructor(scope: IpcScope, method: string, reset?: boolean, pack?: boolean) {
    super(scope, method, reset, pack);

    this.response = new IpcNotification<ResponseParams>(this.scope, `${method}/completion`, this.reset, this.pack);
  }
}

/**
 * 通知从扩展发送到 Web 视图
 */
export class IpcNotification<Params = void> extends IpcCall<Params> {}

/**
 * WebviewReadyCommand 用于通知扩展主进程 Web 视图已准备就绪
 */
export const WebviewReadyCommand = new IpcCommand('core', 'webview/ready');

/**
 * WebviewReloadCommand 用于通知扩展主进程 Web 视图需要重新加载
 */
export const WebviewReloadCommand = new IpcCommand('core', 'webview/reload');

export interface WebviewFocusChangedParams {
  focused: boolean;
  inputFocused: boolean;
}
/**
 * WebviewFocusChangedCommand 用于通知扩展主进程 Web 视图的焦点状态已更改
 * 该命令从 Web 视图发送到扩展主进程
 */
export const WebviewFocusChangedCommand = new IpcCommand<WebviewFocusChangedParams>('core', 'webview/focus/changed');

export interface ExecuteCommandParams {
  command: GlCommands;
  args?: unknown[];
}

// ExecuteCommand 用于执行扩展命令
// 该命令从 Web 视图发送到扩展主进程，并期望得到响应
// 例如：执行命令、打开面板等
export const ExecuteCommand = new IpcCommand<ExecuteCommandParams>('core', 'command/execute');

// NOTIFICATIONS

export interface IpcPromise {
  __ipc: 'promise';
  __promise: Promise<unknown>;
  id: string;
  method: string;
}

/**
 *
 * @param value 检查给定的值是否是一个 IpcPromise 对象
 * @returns IpcPromise 用于在 Web 视图和扩展主进程之间传递 Promise 对象
 */
export function isIpcPromise(value: unknown): value is IpcPromise {
  return (
    value != null &&
    typeof value === 'object' &&
    '__ipc' in value &&
    value.__ipc === 'promise' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'method' in value &&
    typeof value.method === 'string'
  );
}
export type AutoKeys = 'pro50' | (string & {});
export interface ApplicableRequestParams {
  readonly key: AutoKeys;
  readonly code?: string;
}
export interface ApplicableResponse {
  autoKeys: AutoKeys;
}
export const ApplicableRequest = new IpcRequest<ApplicableRequestParams, ApplicableResponse>('core', 'app/applicable');

/**
 *  ipcPromiseSettled 用于在 Web 视图和扩展主进程之间传递 Promise 的 settled 状态
 */
export const ipcPromiseSettled = new IpcNotification<PromiseSettledResult<unknown>>('core', 'ipc/promise/settled');

export interface DidChangeHostWindowFocusParams {
  focused: boolean;
}

/**
 *  DidChangeHostWindowFocusNotification 用于通知 Web 视图主机窗口的焦点状态已更改
 */
export const DidChangeHostWindowFocusNotification = new IpcNotification<DidChangeHostWindowFocusParams>(
  'core',
  'window/focus/didChange'
);

export interface DidChangeWebviewFocusParams {
  focused: boolean;
}
// DidChangeWebviewFocusNotification 用于通知 Web 视图的焦点状态已更改
export const DidChangeWebviewFocusNotification = new IpcCommand<DidChangeWebviewFocusParams>(
  'core',
  'webview/focus/didChange'
);

// DidChangeWebviewVisibilityParams 用于通知 Web 视图的可见性状态已更改
export interface DidChangeWebviewVisibilityParams {
  visible: boolean;
}
/**
 * DidChangeWebviewVisibilityNotification 用于通知 Web 视图的可见性状态已更改
 */
export const DidChangeWebviewVisibilityNotification = new IpcNotification<DidChangeWebviewVisibilityParams>(
  'core',
  'webview/visibility/didChange'
);

export interface WebviewState<ID extends WebviewIds | WebviewViewIds = WebviewIds | WebviewViewIds> {
  webviewId: ID;
  webviewInstanceId: string | undefined;
  timestamp: number;
}
