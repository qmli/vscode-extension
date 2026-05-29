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

// ---------------------------------------------------------------------------
// Dirty State（未保存状态）IPC 协议
// ---------------------------------------------------------------------------
/**
 * DidChangeDirtyStateNotification: Extension 推送给 Webview，通知当前 dirty 状态已变更。
 * Webview 端可据此更新 UI（如禁用/启用保存按钮、显示提示等）。
 */
export interface DidChangeDirtyStateParams {
  /** true = 有未保存更改，false = 已保存/无更改 */
  dirty: boolean;
}

export const DidChangeDirtyStateNotification = new IpcNotification<DidChangeDirtyStateParams>(
  'core',
  'webview/dirty/didChange'
);

/**
 * WebviewSetDirtyCommand: Webview 通知 Extension 标记 dirty 状态。
 * 当前端数据发生变更时，主动通过此命令将 dirty 状态同步给后端控制器，
 * 控制器会同步更新面板标题的"● "指示符。
 */
export interface WebviewSetDirtyCommandParams {
  /** true = 标记为有未保存更改，false = 清除未保存更改标记 */
  dirty: boolean;
}
export const WebviewSetDirtyCommand = new IpcCommand<WebviewSetDirtyCommandParams>('core', 'webview/dirty/set');

// ---------------------------------------------------------------------------
// Document Save / Revert IPC 协议（配合 CustomEditorProvider 使用）
// ---------------------------------------------------------------------------

/**
 * WebviewRequestSaveCommand: Webview 请求触发保存（等效于用户按 Ctrl+S）。
 * Extension 收到后通过 workbench.action.files.save 触发 VS Code 原生保存流程，
 * 进而调用 CustomEditorProvider.saveCustomDocument。
 * 可用于 Webview 内部"保存"按钮的实现。
 */
export const WebviewRequestSaveCommand = new IpcCommand('core', 'document/requestSave');

/**
 * DidSaveDocumentNotification: Extension 通知 Webview 文档已成功保存。
 * Webview 可据此更新 UI（如隐藏"未保存"提示、刷新数据快照等）。
 */
export interface DidSaveDocumentParams {
  /** 保存成功时始终为 true */
  success: true;
}
export const DidSaveDocumentNotification = new IpcNotification<DidSaveDocumentParams>('core', 'document/didSave');

/**
 * DidRevertDocumentNotification: Extension 通知 Webview 文档已被还原至已保存状态。
 * Webview 应重新从 bootstrap 或请求接口拉取最新数据。
 */
export const DidRevertDocumentNotification = new IpcNotification('core', 'document/didRevert');

// ---------------------------------------------------------------------------
// History（撤销/重做）IPC 协议
// ---------------------------------------------------------------------------

/**
 * HistoryCommandExecutedCommand: Webview 通知 Extension 一条 History 命令刚被执行。
 *
 * Extension 收到后通过 `CustomDocumentEditEvent` 将该操作注册到 VSCode 的原生
 * 撤销/重做栈，使 Edit 菜单的"撤销（Ctrl+Z）/恢复（Ctrl+Y）"能驱动
 * Webview 内自定义 History 的 undo/redo 回调。
 *
 * 数据流：
 *   Webview history.execute(cmd)
 *     → 发送 HistoryCommandExecutedCommand
 *     → Extension 注册 CustomDocumentEditEvent
 *       { undo: → HistoryUndoNotification, redo: → HistoryRedoNotification }
 *     → VSCode Edit 菜单 / Ctrl+Z 触发 editEvent.undo()
 *     → Webview history.undo()
 */
export const HistoryCommandExecutedCommand = new IpcCommand('core', 'history/commandExecuted');

/**
 * HistoryUndoNotification: Extension 通知 Webview 执行撤销操作。
 *
 * 触发场景：
 *  1. VSCode Edit 菜单"撤销" / Ctrl+Z（CustomDocumentEditEvent.undo() 回调）
 *  2. 通过 `${webviewId}.history.undo` 命令主动调用（非 CustomEditor 面板）
 *
 * Webview 端在 `useHistory({ vscodeUndoRedo: true })` 时会自动监听此通知。
 */
export const HistoryUndoNotification = new IpcNotification('core', 'history/undo');

/**
 * HistoryRedoNotification: Extension 通知 Webview 执行重做操作。
 *
 * 触发场景：
 *  1. VSCode Edit 菜单"恢复" / Ctrl+Y（CustomDocumentEditEvent.redo() 回调）
 *  2. 通过 `${webviewId}.history.redo` 命令主动调用（非 CustomEditor 面板）
 *
 * Webview 端在 `useHistory({ vscodeUndoRedo: true })` 时会自动监听此通知。
 */
export const HistoryRedoNotification = new IpcNotification('core', 'history/redo');
