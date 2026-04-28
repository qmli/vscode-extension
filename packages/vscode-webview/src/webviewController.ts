// =============================================================================
// WebviewController 实现（具体控制器）
// =============================================================================
import type { Disposable, Event, Uri, ViewBadge, Webview, WebviewPanel, WebviewView } from 'vscode';
import { CancellationTokenSource, EventEmitter, ViewColumn, window, WindowState } from 'vscode';
import { executeCommand, executeCoreCommand } from '@/common/commands/command';
import { pauseOnCancelOrTimeout } from '@orientais/vscode-core';
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
} from '@shared/protocol';
import {
  ApplicableRequest,
  DidChangeHostWindowFocusNotification,
  DidChangeWebviewFocusNotification,
  DidChangeWebviewVisibilityNotification,
  ExecuteCommand,
  ipcPromiseSettled,
  isIpcPromise,
  WebviewReadyCommand,
  WebviewReloadCommand
} from '@shared/protocol';
import type { WebviewCommands, WebviewViewCommands } from '@shared/webviews/constants/constants.commands';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
import { getScopedCounter } from '@packages/utils/counter';
import { isCancellationError } from '@orientais/vscode-core/errors';
import { getViewFocusCommand } from '@orientais/vscode-core/vscode.views';
import { debug } from '@orientais/vscode-core/log';
import type { IWebviewContainer as Container } from './types';
import type { WebviewContext } from './webview';
import type { WebviewCommandCallback, WebviewCommandRegistrar } from './webviewCommandRegistrar';
import type { WebviewHost, WebviewShowOptions } from './webviewHost';
import type { WebviewProvider, WebviewShowingArgs } from './webviewProvider';
import type { WebviewPanelDescriptor, WebviewViewDescriptor } from './webviewsController';

const ipcSequencer = getScopedCounter();

type GetWebviewDescriptor<T extends WebviewIds | WebviewViewIds> = T extends WebviewIds
  ? WebviewPanelDescriptor<T>
  : T extends WebviewViewIds
    ? WebviewViewDescriptor<T>
    : never;

type GetWebviewParent<T extends WebviewIds | WebviewViewIds> = T extends WebviewIds
  ? WebviewPanel
  : T extends WebviewViewIds
    ? WebviewView
    : never;

type WebviewPanelController<
  ID extends WebviewIds,
  State,
  SerializedState = State,
  ShowingArgs extends unknown[] = unknown[]
> = WebviewController<ID, State, SerializedState, ShowingArgs>;
type WebviewViewController<
  ID extends WebviewViewIds,
  State,
  SerializedState = State,
  ShowingArgs extends unknown[] = unknown[]
> = WebviewController<ID, State, SerializedState, ShowingArgs>;
export class WebviewController<
    ID extends WebviewIds | WebviewViewIds,
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
  static create<ID extends WebviewIds, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    container: Container,
    commandRegistrar: WebviewCommandRegistrar,
    descriptor: WebviewPanelDescriptor<ID>,
    instanceId: string | undefined,
    parent: WebviewPanel,
    resolveProvider: (
      container: Container,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): Promise<WebviewController<ID, State, SerializedState, ShowingArgs>>;
  static create<ID extends WebviewViewIds, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    container: Container,
    commandRegistrar: WebviewCommandRegistrar,
    descriptor: WebviewViewDescriptor<ID>,
    instanceId: string | undefined,
    parent: WebviewView,
    resolveProvider: (
      container: Container,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): Promise<WebviewController<ID, State, SerializedState, ShowingArgs>>;
  static async create<
    ID extends WebviewIds | WebviewViewIds,
    State,
    SerializedState = State,
    ShowingArgs extends unknown[] = unknown[]
  >(
    container: Container,
    commandRegistrar: WebviewCommandRegistrar,
    descriptor: GetWebviewDescriptor<ID>,
    instanceId: string | undefined,
    parent: GetWebviewParent<ID>,
    resolveProvider: (
      container: Container,
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
    private readonly container: Container,
    private readonly _commandRegistrar: WebviewCommandRegistrar,
    private readonly descriptor: GetWebviewDescriptor<ID>,
    public readonly instanceId: string | undefined,
    public readonly parent: GetWebviewParent<ID>,
    resolveProvider: (
      container: Container,
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
    command: WebviewCommands | WebviewViewCommands,
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
      container: Container,
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

  is(
    type: 'editor'
  ): this is WebviewPanelController<ID extends WebviewIds ? ID : never, State, SerializedState, ShowingArgs>;
  is(
    type: 'view'
  ): this is WebviewViewController<ID extends WebviewViewIds ? ID : never, State, SerializedState, ShowingArgs>;
  is(
    type: 'editor' | 'view'
  ): this is
    | WebviewPanelController<ID extends WebviewIds ? ID : never, State, SerializedState, ShowingArgs>
    | WebviewViewController<ID extends WebviewViewIds ? ID : never, State, SerializedState, ShowingArgs> {
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
      const script = `<script${nonce} type="module">window.bootstrap=${JSON.stringify(bootstrap)};</script>`;
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
      await executeCoreCommand(getViewFocusCommand(this.id), options);
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
            void executeCommand(message.params.command, ...message.params.args);
          } else {
            void executeCommand(message.params.command);
          }
          break;
        case ApplicableRequest.is(message): {
          void this.respond(ApplicableRequest, message, { autoKeys: message.params.key });
          break;
        }
        case WebviewReloadCommand.is(message):
          void this.refresh(true);
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
