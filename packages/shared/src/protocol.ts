/**
 * IPC 协议基础设施
 *
 * 定义 Webview 与 VS Code 扩展主进程之间通信的核心类型和类。
 * 本模块不依赖任何业务特定类型，可独立使用。
 */

// /** 内部使用的 scope 类型，框架层保持宽泛以不依赖业务字面量。业务层应在上层收窄此类型。 */
// type IpcScope = string;

export type IpcMessage<T = unknown> = {
  id: string;
  scope: string;
  method: string;
  packed?: boolean;
  params: T;
  completionId?: string;
};

abstract class IpcCall<Params = unknown> {
  public readonly method: string;

  constructor(
    public readonly scope: string,
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type IpcCallResponseType<T> = T extends IpcRequest<infer _P, infer _R> ? T['response'] : never;
export type IpcCallResponseMessageType<T> = IpcCallMessageType<IpcCallResponseType<T>>;
export type IpcCallResponseParamsType<T> = IpcCallResponseMessageType<T>['params'];

/**
 * 命令：从 webview 发送到扩展主进程（单向）
 */
export class IpcCommand<Params = void> extends IpcCall<Params> {}

/**
 * 请求：从 webview 发送到扩展，并期望得到响应（双向）
 */
export class IpcRequest<Params = void, ResponseParams = void> extends IpcCall<Params> {
  public readonly response: IpcNotification<ResponseParams>;

  constructor(scope: string, method: string, reset?: boolean, pack?: boolean) {
    super(scope, method, reset, pack);
    this.response = new IpcNotification<ResponseParams>(this.scope, `${method}/completion`, this.reset, this.pack);
  }
}

/**
 * 通知：从扩展发送到 webview（单向推送）
 */
export class IpcNotification<Params = void> extends IpcCall<Params> {}

// ── 内置公共命令 ──────────────────────────────────────────────────────────────

/** Webview 已准备就绪 */
export const WebviewReadyCommand = new IpcCommand('core', 'webview/ready');

/** 请求 Webview 重新加载 */
export const WebviewReloadCommand = new IpcCommand('core', 'webview/reload');

export interface WebviewFocusChangedParams {
  focused: boolean;
  inputFocused: boolean;
}

/** Webview 焦点状态变更 */
export const WebviewFocusChangedCommand = new IpcCommand<WebviewFocusChangedParams>('core', 'webview/focus/changed');

// ── IpcPromise（跨进程 Promise 序列化支持）────────────────────────────────────

export interface IpcPromise {
  __ipc: 'promise';
  __promise: Promise<unknown>;
  id: string;
  method: string;
}

export function isIpcPromise(value: unknown): value is IpcPromise {
  return (
    value != null &&
    typeof value === 'object' &&
    '__ipc' in value &&
    (value as Record<string, unknown>).__ipc === 'promise' &&
    'id' in value &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    'method' in value &&
    typeof (value as Record<string, unknown>).method === 'string'
  );
}

/** 传递 Promise settled 状态的通知 */
export const ipcPromiseSettled = new IpcNotification<PromiseSettledResult<unknown>>('core', 'ipc/promise/settled');

// ── 内置通知 ──────────────────────────────────────────────────────────────────

export interface DidChangeHostWindowFocusParams {
  focused: boolean;
}

export const DidChangeHostWindowFocusNotification = new IpcNotification<DidChangeHostWindowFocusParams>(
  'core',
  'window/focus/didChange'
);

export interface DidChangeWebviewFocusParams {
  focused: boolean;
}

export const DidChangeWebviewFocusNotification = new IpcCommand<DidChangeWebviewFocusParams>(
  'core',
  'webview/focus/didChange'
);

export interface DidChangeWebviewVisibilityParams {
  visible: boolean;
}

export const DidChangeWebviewVisibilityNotification = new IpcNotification<DidChangeWebviewVisibilityParams>(
  'core',
  'webview/visibility/didChange'
);

export type AutoKeys = 'pro50' | (string & {});

export interface ApplicableRequestParams {
  readonly key: AutoKeys;
  readonly code?: string;
}

export interface ApplicableResponse {
  autoKeys: AutoKeys;
}

export const ApplicableRequest = new IpcRequest<ApplicableRequestParams, ApplicableResponse>('core', 'app/applicable');
// ── WebviewState 基础类型 ─────────────────────────────────────────────────────

/**
 * Webview 持久化状态的基础结构。
 * 业务层可通过泛型参数 ID 约束为具体的视图 ID 类型。
 */
export interface WebviewState<ID extends string = string> {
  webviewId: ID;
  webviewInstanceId: string | undefined;
  timestamp: number;
}
