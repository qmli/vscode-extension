// =============================================================================
// WebviewController 实现（具体控制器）
// =============================================================================
import type {
  CancellationToken,
  CustomDocumentBackup,
  CustomDocumentBackupContext,
  CustomDocumentEditEvent,
  Disposable,
  Event,
  Uri,
  ViewBadge,
  Webview,
  WebviewPanel,
  WebviewView
} from 'vscode';
import { commands, CancellationTokenSource, EventEmitter, ViewColumn, window, WindowState } from 'vscode';
// import { executeCommand, executeCoreCommand } from '@/common/commands/command';
import { Logger, pauseOnCancelOrTimeout } from '@orientais/vscode-core';
import type {
  IpcCallMessageType,
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcMessage,
  IpcNotification,
  IpcPromise,
  IpcRequest,
  WebviewFocusChangedParams,
  WebviewState
} from '@orientais/shared';
import {
  ApplicableRequest,
  DidChangeHostWindowFocusNotification,
  DidChangeWebviewFocusNotification,
  DidChangeWebviewVisibilityNotification,
  DidChangeDirtyStateNotification,
  DidRevertDocumentNotification,
  DidSaveDocumentNotification,
  HistoryCommandExecutedCommand,
  HistoryRedoNotification,
  HistoryUndoNotification,
  ipcPromiseSettled,
  isIpcPromise,
  WebviewReadyCommand,
  WebviewReloadCommand,
  WebviewRequestSaveCommand,
  WebviewSetDirtyCommand
} from '@orientais/shared';

import { isCancellationError } from '@orientais/vscode-core';
import { getViewFocusCommand } from './vscode.views';
import { debug } from '@orientais/vscode-core';
import type { IWebviewContainer } from './types';
import type { WebviewContext } from './webview';
import type { WebviewDocument } from './webviewDocument';
import type { WebviewCommandCallback, WebviewCommandRegistrar } from './webviewCommandRegistrar';
import type { WebviewHost, WebviewShowOptions } from './webviewHost';
import type { WebviewProvider, WebviewShowingArgs } from './webviewProvider';
import type { WebviewPanelDescriptor, WebviewViewDescriptor } from './webviewsController';
import { getScopedCounter } from '@orientais/shared';
import { ExecuteCommand } from './ptotocol';

const ipcSequencer = getScopedCounter();

type GetWebviewDescriptor<T extends string> = WebviewPanelDescriptor<T> | WebviewViewDescriptor<T>;

type GetWebviewParent = WebviewPanel | WebviewView;

type Container<T> = T extends IWebviewContainer ? T : never;

export class WebviewController<
    ID extends string,
    State,
    SerializedState = State,
    ShowingArgs extends unknown[] = unknown[]
  >
  implements WebviewHost<ID>, Disposable
{
  canReuseInstance(
    options?: WebviewShowOptions,
    ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
  ): boolean | undefined {
    if (!this.is('editor')) return undefined;

    // 只有明确指定了具体列（排除 Active / Beside 占位值）时才按列过滤，
    // 避免占位值与真实 viewColumn 比较时意外短路 provider 的 appId 复用判断。
    const column = options?.column;
    const hasConcreteColumn = column != null && column !== ViewColumn.Active && column !== ViewColumn.Beside;

    if (hasConcreteColumn && column !== this.parent.viewColumn) {
      return false;
    }

    return this.provider.canReuseInstance?.(...args);
  }
  private disposables: Disposable[] = [];
  private _readyPromise?: Promise<void>;
  private _isInEditor: boolean;
  private _readyResolve?: () => void;
  private _readyReject?: (error: Error) => void;
  private provider!: WebviewProvider<State, SerializedState, ShowingArgs>;
  private readonly webview: Webview;
  private disposable: Disposable | undefined;
  private cancellation: CancellationTokenSource | undefined;
  readonly id: ID;
  readonly extensionUri: Uri;
  static create<ID extends string, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    container: Container<IWebviewContainer>,
    commandRegistrar: WebviewCommandRegistrar,
    descriptor: WebviewPanelDescriptor<ID>,
    instanceId: string | undefined,
    parent: WebviewPanel,
    resolveProvider: (
      container: Container<IWebviewContainer>,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): Promise<WebviewController<ID, State, SerializedState, ShowingArgs>>;
  static create<ID extends string, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    container: Container<IWebviewContainer>,
    commandRegistrar: WebviewCommandRegistrar,
    descriptor: WebviewViewDescriptor<ID>,
    instanceId: string | undefined,
    parent: WebviewView,
    resolveProvider: (
      container: Container<IWebviewContainer>,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): Promise<WebviewController<ID, State, SerializedState, ShowingArgs>>;
  static async create<ID extends string, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    container: Container<IWebviewContainer>,
    commandRegistrar: WebviewCommandRegistrar,
    descriptor: GetWebviewDescriptor<ID>,
    instanceId: string | undefined,
    parent: GetWebviewParent,
    resolveProvider: (
      container: Container<IWebviewContainer>,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): Promise<WebviewController<ID, State, SerializedState, ShowingArgs>> {
    const controller = new WebviewController<ID, State, SerializedState, ShowingArgs>(
      container,
      commandRegistrar,
      descriptor,
      instanceId,
      parent,
      resolveProvider
    );

    // 等待异步初始化完成
    await controller.waitForReady();
    return controller;
  }
  private constructor(
    private readonly container: Container<IWebviewContainer>,
    private readonly _commandRegistrar: WebviewCommandRegistrar,
    private readonly descriptor: GetWebviewDescriptor<ID>,
    public readonly instanceId: string | undefined,
    public readonly parent: GetWebviewParent,
    resolveProvider: (
      container: Container<IWebviewContainer>,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ) {
    // 注册到通知管理器
    this.id = descriptor.id as ID;
    this.container.notificationManager.registerWebviewHost(this.id, this);

    this.extensionUri = this.container.context.extensionUri;
    this.webview = parent.webview;

    const isInEditor = 'onDidChangeViewState' in parent; // 判断是否在编辑器中鸭子类型检查
    this._isInEditor = isInEditor;
    // 创建初始化 Promise
    this._readyPromise = new Promise<void>((resolve, reject) => {
      this._readyResolve = resolve;
      this._readyReject = reject;
    });

    // 开始异步初始化
    void this.initialize(this, resolveProvider);
  }

  registerWebviewCommand<T extends Partial<WebviewContext>>(
    command: string,
    callback: WebviewCommandCallback<T>
  ): Disposable {
    return this._commandRegistrar.registerCommand(this.provider, this.id, this.instanceId, command, callback);
  }

  /**
   * 等待控制器初始化完成
   */
  waitForReady(): Promise<void> {
    return this._readyPromise || Promise.resolve();
  }

  async initialize(
    webctl: WebviewController<ID, State, SerializedState, ShowingArgs>,
    resolveProvider: (
      container: Container<IWebviewContainer>,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): Promise<void> {
    try {
      // 创建 provider
      this.provider = await resolveProvider(this.container, webctl);

      // 设置 webview 配置
      this.parent.webview.options = {
        enableScripts: true,
        localResourceRoots: [this.extensionUri]
      };

      // 监听消息
      this.disposables.push(
        this.parent.webview.onDidReceiveMessage(this.onMessageReceived.bind(this)),
        this.provider,
        window.onDidChangeWindowState(this.onWindowStateChanged, this)
      );

      // 监听生命周期事件
      if ('onDidChangeViewState' in this.parent) {
        this.disposables.push(
          this.parent.onDidChangeViewState(({ webviewPanel }) => {
            const { visible, active, viewColumn } = webviewPanel;
            this.onParentVisibilityChanged(visible, active, this.viewColumn != null && this.viewColumn !== viewColumn);
            this._viewColumn = viewColumn;
          }),
          this.parent.onDidDispose(() => {
            if (!this._disposed) {
              this.dispose();
            }
          })
        );
      } else {
        this.disposables.push(
          this.parent.onDidChangeVisibility(() => {
            this.onParentVisibilityChanged(this.visible, this.active);
            // this.provider?.onVisibilityChanged?.(this.visible);
          })
        );
      }

      // 注册命令
      const commands = this.provider.registerCommands?.() ?? [];
      this.disposables.push(...commands);
      // await this.provider.onReady?.(); // 注意：不应该在这里调用 onReady，因为 provider 可能需要等到 show 时才准备好（尤其是视图），我们应该在收到 WebviewReadyCommand 时调用 onReady

      // 标记初始化完成
      this._readyResolve?.();
    } catch (error) {
      console.error('Failed to initialize webview controller:', error);
      // 标记初始化失败
      this._readyReject?.(error instanceof Error ? error : new Error('Unknown initialization error'));
    }
  }

  get baseWebviewState(): WebviewState {
    return {
      webviewId: this.id,
      webviewInstanceId: this.instanceId,
      timestamp: Date.now()
    };
  }

  private readonly _onDidDispose = new EventEmitter<void>();
  get onDidDispose(): Event<void> {
    return this._onDidDispose.event;
  }

  get title(): string {
    return this.parent.title ?? '';
  }

  set title(value: string) {
    this.parent.title = value;
  }

  private _ready: boolean = false;
  get ready(): boolean {
    return this._ready;
  }

  // ---------------------------------------------------------------------------
  // Dirty（未保存）状态 — 仅 CustomEditorProvider 模式
  // ---------------------------------------------------------------------------

  private _dirty: boolean = false;

  // --- CustomEditorProvider 模式专用字段 ---

  /**
   * 关联的 `CustomDocument`，由 `attachCustomEditor` 赋值。
   * 非 null 表示当前处于 CustomEditorProvider 模式。
   */
  private _customDocument: WebviewDocument | undefined;

  /**
   * VS Code 原生 dirty 事件发射器，由 `WebviewsController` 创建并共享给所有实例。
   * 当 `dirty = true` 时触发，通知 VS Code 在标题显示 "●" 并接管关闭确认流程。
   */
  private _onDidChangeCustomDocument: EventEmitter<CustomDocumentEditEvent<WebviewDocument>> | undefined;

  /**
   * 是否处于"History 驱动"的撤销栈模式。
   * 一旦收到首个 `HistoryCommandExecutedCommand`（webview 使用 useHistory + vscodeUndoRedo），
   * 撤销栈条目改由每条 History 命令逐条注册；此时 `set dirty` 不再额外注册条目，避免重复入栈。
   */
  private _historyEditsActive: boolean = false;

  /**
   * 将此控制器与 `CustomDocument` 关联，进入 CustomEditorProvider 模式。
   * 由 `WebviewsController.resolveCustomEditor` 在控制器创建后立即调用。
   *
   * 关联后：
   * - `dirty = true`  → 触发 VS Code 原生 `onDidChangeCustomDocument` 事件（出现 `●`）
   * - `dirty = false` → 仅更新内部状态（VS Code 在 save/revert 回调成功后自动清除 dirty）
   * - 关闭确认对话框由 VS Code 原生接管（Save / Don't Save / Cancel）
   */
  attachCustomEditor(
    document: WebviewDocument,
    onDidChangeCustomDocument: EventEmitter<CustomDocumentEditEvent<WebviewDocument>>
  ): void {
    this._customDocument = document;
    this._onDidChangeCustomDocument = onDidChangeCustomDocument;
  }

  /** 是否处于 CustomEditorProvider 模式 */
  get isCustomEditor(): boolean {
    return this._customDocument != null;
  }

  /**
   * 当前是否有未保存更改（仅 CustomEditorProvider 模式有效）。
   *
   * `dirty = true` → 触发 `onDidChangeCustomDocument` 事件 → VS Code 在标签页显示 `●`
   *                   并接管关闭确认（Save / Don't Save / Cancel）和 Ctrl+S 保存流程。
   * `dirty = false` → 仅更新内部状态；VS Code 在 `saveCustomDocument` /
   *                   `revertCustomDocument` 成功后自动清除 dirty 标记。
   */
  get dirty(): boolean {
    return this._dirty;
  }

  set dirty(value: boolean) {
    if (this._dirty === value) return;
    this._dirty = value;

    // 仅"纯 dirty 驱动"模式（未接入 History 集成）才借助一次编辑事件让 VS Code 显示 ●。
    // History 驱动模式下撤销栈条目按命令逐条注册（见 onHistoryCommandExecuted），
    // 此处不再触发，否则首条变更会重复入栈，导致撤销次数与历史条目数错位。
    if (value && !this._historyEditsActive && this._onDidChangeCustomDocument != null && this._customDocument != null) {
      this.fireUndoableCustomDocumentEdit();
    }

    void this.notify(DidChangeDirtyStateNotification, { dirty: value });
  }

  /**
   * 收到 webview 的 `HistoryCommandExecutedCommand`：为该条 History 命令向 VS Code
   * 原生撤销栈注册一个对应的可撤销编辑条目（携带 undo/redo 回调）。
   *
   * 每条新建的 History 命令都会触发一次，从而保证 Ctrl+Z / Ctrl+Y 可连续撤销/重做，
   * 而非"执行一次便失效"。编辑事件本身会让 VS Code 标记文档为脏（●），因此一并同步内部
   * dirty 状态并通知 webview。
   */
  private onHistoryCommandExecuted(): void {
    if (this._onDidChangeCustomDocument == null || this._customDocument == null) {
      return;
    }

    this._historyEditsActive = true;

    if (!this._dirty) {
      this._dirty = true;
      void this.notify(DidChangeDirtyStateNotification, { dirty: true });
    }

    this.fireUndoableCustomDocumentEdit();
  }

  /**
   * 发出一个可撤销的 CustomDocument 编辑事件，使 VS Code“编辑 -> 撤销/重做”
   * 可以回调到扩展侧，并在这里统一接收与打印。
   */
  private fireUndoableCustomDocumentEdit(): void {
    if (this._onDidChangeCustomDocument == null || this._customDocument == null) return;

    this._onDidChangeCustomDocument.fire({
      document: this._customDocument,
      undo: async () => {
        Logger.debug(
          `[WebviewController] receive undo from VS Code Edit menu: webviewId=${this.id}, instanceId=${
            this.instanceId ?? 'default'
          }`
        );
        await this.notify(HistoryUndoNotification, undefined);
      },
      redo: async () => {
        Logger.debug(
          `[WebviewController] receive redo from VS Code Edit menu: webviewId=${this.id}, instanceId=${
            this.instanceId ?? 'default'
          }`
        );
        await this.notify(HistoryRedoNotification, undefined);
      }
    });
  }
  /** 标记为"有未保存更改"，等价于 `dirty = true` */
  markDirty(): void {
    this.dirty = true;
  }

  /** 清除"未保存更改"标记，等价于 `dirty = false` */
  clearDirty(): void {
    this.dirty = false;
  }

  // ---------------------------------------------------------------------------
  // CustomEditorProvider 回调方法（由 WebviewsController 在对应回调中调用）
  // ---------------------------------------------------------------------------

  /**
   * 保存文档（对应 `CustomEditorProvider.saveCustomDocument`）。
   *
   * 调用 `provider.saveDocument()`，成功后：
   * - 更新内部 `_dirty = false`（VS Code 在回调成功后自动清除 dirty，两者保持一致）
   * - 向 Webview 推送 `DidSaveDocumentNotification` 和 `DidChangeDirtyStateNotification`
   *
   * 若 `provider.saveDocument()` 抛出异常，异常向上传播给 VS Code，
   * VS Code 将显示错误提示并**保持文档 dirty 状态不关闭面板**。
   */
  async saveDocument(cancellation: CancellationToken): Promise<void> {
    await this.provider.saveDocument?.(cancellation);
    this._dirty = false;
    void this.notify(DidChangeDirtyStateNotification, { dirty: false });
    void this.notify(DidSaveDocumentNotification, { success: true });
  }

  /**
   * 另存为（对应 `CustomEditorProvider.saveCustomDocumentAs`）。
   * 仅推送保存成功通知；dirty 状态由 VS Code 根据目标 URI 与原 URI 是否相同决定。
   */
  async saveDocumentAs(destination: Uri, cancellation: CancellationToken): Promise<void> {
    await this.provider.saveDocumentAs?.(destination, cancellation);
    void this.notify(DidSaveDocumentNotification, { success: true });
  }

  /**
   * 还原文档（对应 `CustomEditorProvider.revertCustomDocument`）。
   *
   * 调用 `provider.revertDocument()`，成功后更新内部状态并通知 Webview 重新加载数据。
   */
  async revertDocument(cancellation: CancellationToken): Promise<void> {
    await this.provider.revertDocument?.(cancellation);
    this._dirty = false;
    void this.notify(DidChangeDirtyStateNotification, { dirty: false });
    void this.notify(DidRevertDocumentNotification, undefined);
  }

  /**
   * 备份文档（对应 `CustomEditorProvider.backupCustomDocument`）。
   * 若 Provider 未实现 `backupDocument`，返回一个空备份（无热重启恢复能力）。
   */
  async backupDocument(
    context: CustomDocumentBackupContext,
    cancellation: CancellationToken
  ): Promise<CustomDocumentBackup> {
    if (this.provider.backupDocument != null) {
      return this.provider.backupDocument(context, cancellation);
    }
    return { id: context.destination.toString(), delete: async () => {} };
  }

  get description(): string | undefined {
    return 'description' in this.parent ? this.parent.description : undefined;
  }

  set description(value: string | undefined) {
    if ('description' in this.parent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.parent as any).description = value;
    }
  }

  get badge(): ViewBadge | undefined {
    return 'badge' in this.parent ? this.parent.badge : undefined;
  }

  set badge(value: ViewBadge | undefined) {
    if ('badge' in this.parent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.parent as any).badge = value;
    }
  }

  get visible(): boolean {
    return this.parent.visible;
  }

  get active(): boolean | undefined {
    return 'active' in this.parent ? this.parent.active : undefined;
  }

  private _viewColumn: ViewColumn | undefined;
  get viewColumn(): ViewColumn | undefined {
    return this._viewColumn;
  }

  @debug<WebviewController<ID, State>['onViewFocusChanged']>({
    args: { 0: (e) => `focused=${e.focused}, inputFocused=${e.inputFocused}` }
  })
  onViewFocusChanged(e: WebviewFocusChangedParams): void {
    // setContextKeys(this.descriptor.contextKeyPrefix); 后面要加让 package.json 中的 when 条件、命令、菜单项、快捷键等能根据 webview 是否可见做启用/禁用或显示/隐藏判断
    this.handleFocusChanged(e.focused);
  }

  @debug()
  private onParentVisibilityChanged(visible: boolean, active?: boolean, forceReload?: boolean) {
    if (this.descriptor.webviewHostOptions?.retainContextWhenHidden !== true) {
      if (visible) {
        if (this._ready) {
          this.sendPendingIpcNotifications();
        } else if (this.provider.onReloaded != null) {
          this.clearPendingIpcNotifications();
          this.provider.onReloaded();
        } else {
          void this.refresh();
        }
      } else {
        this._ready = false;
      }
    } else if (forceReload) {
      void this.refresh();
    }

    if (visible) {
      //setContextKeys(this.descriptor.contextKeyPrefix);
      if (active != null) {
        this._ready = true;
        this.provider.onActiveChanged?.(active);
        if (!active) {
          this.handleFocusChanged(false);
        }
      }
    } else {
      // resetContextKeys(this.descriptor.contextKeyPrefix);

      if (active != null) {
        this.provider.onActiveChanged?.(false);
      }
      this.handleFocusChanged(false);
    }

    void this.notify(DidChangeWebviewVisibilityNotification, { visible: visible });
    this.provider.onVisibilityChanged?.(visible);
  }

  private onWindowStateChanged(e: WindowState) {
    if (!this.visible) return;

    // 处理 notify
    this.handleNotify(e);

    // 处理 provider
    this.handleProviderFocus(e);
  }

  private async handleNotify(e: WindowState) {
    try {
      await this.notify(DidChangeHostWindowFocusNotification, { focused: e.focused });
    } catch (err) {
      console.error('[onWindowStateChanged] notify failed', err);
    }
  }

  private handleProviderFocus(e: WindowState) {
    try {
      this.provider.onWindowFocusChanged?.(e.focused);
    } catch (err) {
      console.error('[onWindowStateChanged] provider.onWindowFocusChanged failed', err);
    }
  }

  private handleFocusChanged(focused: boolean) {
    void this.notify(DidChangeWebviewFocusNotification, { focused: focused });
    this.provider.onFocusChanged?.(focused);
  }

  asWebviewUri(uri: Uri): Uri {
    return this.parent.webview.asWebviewUri(uri);
  }

  getWebRoot(): string {
    return this.asWebviewUri(this.extensionUri).toString();
  }

  is(type: 'editor'): this is this & { parent: WebviewPanel };
  is(type: 'view'): this is this & { parent: WebviewView };
  is(type: 'editor' | 'view'): this is (this & { parent: WebviewPanel }) | (this & { parent: WebviewView }) {
    return type === 'editor' ? this._isInEditor : !this._isInEditor;
  }

  public async notify<T extends IpcNotification<unknown>>(
    notificationType: T,
    params: IpcCallParamsType<T>,
    completionId?: string
  ): Promise<boolean> {
    this.replacePromisesWithIpcPromises(params);

    const msg: IpcMessage<IpcCallParamsType<T> | Uint8Array> = {
      id: this.nextIpcId(),
      scope: notificationType.scope,
      method: notificationType.method,
      completionId: completionId,
      params: params
    };

    const success = await this.postMessage(msg);
    if (success) {
      this._pendingIpcNotifications.clear();
    } else if (notificationType === ipcPromiseSettled) {
      this._pendingIpcPromiseNotifications.add({ msg: msg, timestamp: Date.now() });
    } else {
      this.addPendingIpcNotificationCore(notificationType, msg);
    }
    return success;
  }

  private replacePromisesWithIpcPromises(data: unknown) {
    const pendingPromises: IpcPromise[] = [];
    this.replacePromisesWithIpcPromisesCore(data, pendingPromises);
    if (!pendingPromises.length) return;

    const cancellation = this.cancellation?.token;
    queueMicrotask(() => {
      for (const ipcPromise of pendingPromises) {
        ipcPromise.__promise.then(
          (r) => {
            if (cancellation?.isCancellationRequested) {
              return;
            }
            return this.notify(ipcPromiseSettled, { status: 'fulfilled', value: r }, ipcPromise.id);
          },
          (ex: unknown) => {
            if (cancellation?.isCancellationRequested) {
              return;
            }
            return this.notify(ipcPromiseSettled, { status: 'rejected', reason: ex }, ipcPromise.id);
          }
        );
      }
    });
  }

  private replacePromisesWithIpcPromisesCore(data: unknown, pendingPromises: IpcPromise[]) {
    if (data == null || typeof data !== 'object') return;

    for (const key in data) {
      if (key === '__promise') continue;

      const value = (data as Record<string, unknown>)[key];
      if (value instanceof Promise) {
        const ipcPromise: IpcPromise = {
          __ipc: 'promise',
          __promise: value,
          id: this.nextIpcId(),
          method: ipcPromiseSettled.method
        };
        (data as Record<string, unknown>)[key] = ipcPromise;
        pendingPromises.push(ipcPromise);
      } else if (isIpcPromise(value)) {
        value.id = this.nextIpcId();
        pendingPromises.push(value);
      } else {
        this.replacePromisesWithIpcPromisesCore(value, pendingPromises);
      }
    }
  }

  private addPendingIpcNotificationCore(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: IpcNotification<any>,
    msgOrFn: IpcMessage | (() => Promise<boolean>) | undefined
  ) {
    if (type.reset) {
      this._pendingIpcNotifications.clear();
    }

    if (msgOrFn == null) {
      return;
    }
    this._pendingIpcNotifications.set(type, { msg: msgOrFn, timestamp: Date.now() });
  }

  private _pendingIpcNotifications = new Map<
    IpcNotification,
    { msg: IpcMessage | (() => Promise<boolean>); timestamp: number }
  >();
  private _pendingIpcPromiseNotifications = new Set<{ msg: IpcMessage; timestamp: number }>();

  private async postMessage(message: IpcMessage): Promise<boolean> {
    if (!this._ready) return Promise.resolve(false);

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const promise = Promise.race<boolean>([
      this.webview.postMessage(message).then(
        (s) => {
          clearTimeout(timeout);
          return s;
        },
        (ex: unknown) => {
          clearTimeout(timeout);
          console.error('Failed to post message:', ex);
          return false;
        }
      ),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          resolve(false);
        }, 30000);
      })
    ]);

    let success;

    if (this.is('view')) {
      // 如果我们在视图中，如果等待时间过长则显示进度
      const result = await pauseOnCancelOrTimeout(promise, undefined, 100);
      if (result.paused) {
        success = await window.withProgress({ location: { viewId: this.id } }, () => result.value);
      } else {
        success = result.value;
      }
    } else {
      success = await promise;
    }

    return success;
  }

  nextIpcId(): string {
    return `host:${ipcSequencer.next()}`;
  }

  /**
   * 获取带有 bootstrap 数据注入的 HTML 字符串。
   * 调用 provider.includeBootstrap() 并将序列化结果以 window.bootstrap 的形式
   * 注入到 </head> 之前，供前端在初始化时同步读取。
   */
  private async getHtmlWithBootstrap(): Promise<string> {
    let html = this.provider.html;
    const bootstrap = await this.provider.includeBootstrap?.();
    if (bootstrap != null) {
      // 提取 CSP nonce（dev 模式下由 generateWebviewHtml 写入 <meta name="csp-nonce">）
      const nonceMatch = html.match(/<meta name="csp-nonce" content="([^"]+)"/);
      const nonce = nonceMatch ? ` nonce="${nonceMatch[1]}"` : '';
      const script = `<script${nonce} >window.bootstrap=${JSON.stringify(bootstrap)};</script>`;
      html = html.replace(/<script/i, `${script}<script`);
    }
    return html;
  }

  async refresh(force?: boolean): Promise<void> {
    this.cancellation?.cancel();
    this.cancellation = new CancellationTokenSource();

    if (force) {
      /**
       * Webview 销毁时 - 当 webview 即将被释放时，清空所有未发送的通知，因为接收方将不再存在
       * 重置或刷新操作 - 在 webview 重新初始化过程中，清除旧的待处理消息以避免过时数据的发送
       * 错误恢复 - 当通信出现异常时，清空队列防止积累过多无效消息
       */
      this.clearPendingIpcNotifications();
    }
    this.provider.onRefresh?.(force);

    // 标记 webview 为未就绪状态，直到我们知道是否要更改 html
    const wasReady = this._ready;
    this._ready = false;

    let html;
    try {
      html = await this.getHtmlWithBootstrap();
    } catch (ex) {
      if (isCancellationError(ex)) {
        this.cancellation.cancel();
        return;
      }

      throw ex;
    }

    if (force) {
      // 重置 html 以使 webview 重新加载
      this.webview.html = '';
    }

    // 如果我们没有改变 html，再次标记 webview 为就绪状态
    if (this.webview.html === html) {
      if (wasReady) {
        this._ready = true;
      }
      return;
    }

    this.webview.html = html;
  }
  clearPendingIpcNotifications(): void {
    this._pendingIpcNotifications.clear();
  }

  sendPendingIpcNotifications(): void {
    if (!this._ready || (this._pendingIpcNotifications.size === 0 && this._pendingIpcPromiseNotifications.size === 0)) {
      return;
    }

    const ipcs = [...this._pendingIpcNotifications.values(), ...this._pendingIpcPromiseNotifications.values()].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    this._pendingIpcNotifications.clear();
    this._pendingIpcPromiseNotifications.clear();

    for (const { msg } of ipcs.values()) {
      if (typeof msg === 'function') {
        void msg();
      } else {
        void this.postMessage(msg);
      }
    }
  }

  async show(
    loading: boolean,
    options?: WebviewShowOptions,
    ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
  ): Promise<void> {
    options ??= {};

    // let context;
    // const result = await this.provider.onShowing?.(loading, options, ...args);
    // if (result != null) {
    //   let show;
    //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //   [show, context] = result;
    // }
    await this.provider.onShowing?.(loading, options, ...args);
    if (loading) {
      this.cancellation ??= new CancellationTokenSource();
      try {
        this.webview.html = await this.getHtmlWithBootstrap();
      } catch (ex) {
        if (isCancellationError(ex)) {
          this.cancellation.cancel();
          return;
        }
        throw ex;
      }
    }

    if (this.is('editor')) {
      if (!loading) {
        // WebviewPanel 有直接的显示控制 API
        this.parent.reveal(
          options.column ?? (this.parent as WebviewPanel).viewColumn ?? this.descriptor.column ?? ViewColumn.Beside,
          options.preserveFocus ?? false
        );
      }
    } else if (this.is('view')) {
      // WebviewView 需要通过 VS Code 的命令系统来获得焦点
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await commands.executeCommand(getViewFocusCommand(this.id as any), options);
      if (loading) {
        this.provider.onVisibilityChanged?.(true);
      }
    }
  }

  private async onMessageReceived(message: IpcMessage): Promise<void> {
    try {
      // 处理系统消息
      switch (true) {
        case WebviewReadyCommand.is(message):
          this._ready = true;
          this.sendPendingIpcNotifications();
          await this.provider?.onReady?.();
          break;
        case ExecuteCommand.is(message):
          if (message.params.args != null) {
            void commands.executeCommand(message.params.command, ...message.params.args);
          } else {
            void commands.executeCommand(message.params.command);
          }
          break;
        case ApplicableRequest.is(message): {
          void this.respond(ApplicableRequest, message, { autoKeys: message.params.key });
          break;
        }
        case WebviewReloadCommand.is(message):
          void this.refresh(true);
          break;
        case WebviewSetDirtyCommand.is(message):
          // Webview 主动上报 dirty 状态，控制器同步更新标题与内部状态
          this.dirty = message.params.dirty;
          break;
        case HistoryCommandExecutedCommand.is(message):
          // Webview 每执行一条新的 History 命令，便为其注册一个 VS Code 原生撤销栈条目
          this.onHistoryCommandExecuted();
          break;
        case WebviewRequestSaveCommand.is(message):
          // Webview 请求保存（等效于 Ctrl+S）
          // CustomEditor 模式：触发 VS Code 原生保存命令，进而调用 saveCustomDocument
          // 普通模式：同上，workbench.action.files.save 对无 URI 的面板通常无效，Provider 可自行处理
          void commands.executeCommand('workbench.action.files.save');
          break;
        default:
          this.provider?.onMessageReceived?.(message);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  respond<T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    msg: IpcCallMessageType<T>,
    params: IpcCallResponseParamsType<T>
  ): Promise<boolean> {
    return this.notify(requestType.response, params, msg.completionId);
  }

  private _disposed: boolean = false;
  /**
   * WebviewPanel 关闭时的处理逻辑，在 `parent.onDidDispose` 触发时调用。
   *
   * ## CustomEditorProvider 模式
   * VS Code 在触发 `onDidDispose` 之前已经完成了"保存/不保存/取消"的原生对话框流程
   * （若用户选择了 Cancel，面板不会关闭，`onDidDispose` 不会被触发）。
   * 因此在此模式下无需再弹出任何对话框，直接释放资源即可。
   *
   * CustomEditorProvider 模式下 VS Code 在面板关闭前已完成原生确认流程
   * （Save / Don't Save / Cancel），此处直接释放资源。
   */
  private _handlePanelClose(): void {
    if (!this._disposed) {
      this.dispose();
    }
  }

  dispose(): void {
    // // 从通知管理器注销
    // this.container.notificationManager.unregisterWebviewHost(this.id);

    // this.disposables.forEach((d: Disposable) => {
    //   d.dispose();
    // });
    // // 取消所有正在进行的操作
    // this.cancellation?.cancel();
    // this.cancellation?.dispose();

    // this.disposables = [];

    this._disposed = true;
    // 取消所有正在进行的操作
    this.cancellation?.cancel();
    this.cancellation?.dispose();
    //resetContextKeys(this.descriptor.contextKeyPrefix);

    this.provider?.onFocusChanged?.(false);
    this.provider?.onVisibilityChanged?.(false);

    this._ready = false;

    this._onDidDispose.fire();
    this.disposable?.dispose();
    this.disposables.forEach((d: Disposable) => {
      d.dispose();
    });
  }
  async maximize(): Promise<void> {
    if (this.provider && 'maximize' in this.provider && typeof this.provider.maximize === 'function') {
      await this.provider.maximize();
    }
  }
}
