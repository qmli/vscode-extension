/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// WebviewsController 实现（总控制器）
// =============================================================================
import type {
  CancellationToken,
  CustomDocumentEditEvent,
  CustomEditorProvider,
  WebviewOptions,
  WebviewPanel,
  WebviewPanelOptions,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext
} from 'vscode';
import { commands, Disposable, EventEmitter, Uri, ViewColumn, window, workspace } from 'vscode';
import { uuid } from '@orientais/vscode-core';
import { first } from '@orientais/vscode-core';
import { getViewFocusCommand } from './vscode.views';
import type { IWebviewContainer } from './types';
import { WebviewCommandRegistrar } from './webviewCommandRegistrar';
import { WebviewController } from './webviewController';
import type { WebviewHost } from './webviewHost';
import type { WebviewProvider, WebviewShowingArgs } from './webviewProvider';
import {
  buildCustomEditorUri,
  getInstanceIdFromUri,
  WebviewDocument,
  WebviewPanelFileSystemProvider
} from './webviewDocument';

//#region Webview相关类型定义
export interface WebviewViewDescriptor<ID extends string> {
  id: ID;
  title?: string;
  readonly contextKeyPrefix: string;
  iconPath: string;
  column: ViewColumn;
  readonly type: string;
  readonly webviewOptions?: WebviewOptions;
  readonly webviewHostOptions?: {
    /**
     * 是否在隐藏时保留 webview 上下文
     *
     * - true: 隐藏时保留 DOM、JS 运行时和内存状态，显示时快速恢复
     *   适用于需要保持复杂客户端状态的场景（如交互式图表、编辑器等）
     *
     * - false: 隐藏时销毁 webview，显示时重新创建和加载
     *   适用于内容可以安全重建的场景，有助于节省内存
     *
     * @default false
     */
    readonly retainContextWhenHidden?: boolean;
  };
}

export interface WebviewViewShowOptions {
  column?: never;
  preserveFocus?: boolean;
  preserveVisibility?: boolean;
}
export interface WebviewViewProxy<ID extends string, ShowingArgs extends unknown[], SerializedState = unknown>
  extends Disposable {
  readonly id: ID;
  readonly ready: boolean;
  readonly visible: boolean;
  refresh(force?: boolean): Promise<void>;
  show(options?: WebviewViewShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>): Promise<void>;
}

interface WebviewViewRegistration<
  ID extends string,
  State,
  SerializedState = State,
  ShowingArgs extends unknown[] = unknown[]
> {
  readonly descriptor: WebviewViewDescriptor<ID>;
  controller?: WebviewController<ID, State, SerializedState, ShowingArgs>;
  pendingShowArgs?: [WebviewViewShowOptions | undefined, WebviewShowingArgs<ShowingArgs, SerializedState>] | undefined;
}
//#endregion
export interface WebviewPanelDescriptor<ID extends string> {
  id: ID;
  readonly iconPath: string;
  title: string;
  readonly contextKeyPrefix: string;
  readonly type: string;
  readonly column?: ViewColumn;
  readonly webviewOptions?: WebviewOptions;
  readonly webviewHostOptions?: WebviewPanelOptions;
  readonly allowMultipleInstances?: boolean; //配置中用于控制是否允许同一个 webview 类型打开多个实例的标志位
}
interface WebviewPanelRegistration<
  ID extends string,
  State,
  SerializedState = State,
  ShowingArgs extends unknown[] = unknown[]
> {
  readonly descriptor: WebviewPanelDescriptor<ID>;
  controllers?: Map<string | undefined, WebviewController<ID, State, SerializedState, ShowingArgs>> | undefined;
  /** CustomEditor 模式：每次 show() 调用时缓存的参数，resolveCustomEditor 中消费 */
  pendingShowArgs?: Map<
    string,
    [WebviewPanelsShowOptions | undefined, WebviewShowingArgs<ShowingArgs, SerializedState>]
  >;
  /** CustomEditor 模式：Provider 工厂函数 */
  resolveProvider?: (
    container: IWebviewContainer,
    host: WebviewHost<ID>
  ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>;
}

export interface WebviewPanelShowOptions {
  /**
   * 指定显示 webview 面板的列。仅当 column 具有明确值（非 Active / Beside）时才会强制按列复用，否则会优先考虑 appId 等复用条件。
   */
  column?: ViewColumn;
  /**
   * 是否在显示 webview 面板时保留当前编辑器的焦点。
   */
  preserveFocus?: boolean;
  /**
   * 是否在显示 webview 面板时保留其可见性状态。
   */
  preserveVisibility?: boolean;
}

interface WebviewPanelsShowOptions extends WebviewPanelShowOptions {
  /**
   * 控制是否保留 WebviewPanel 实例以供复用：
   * - true: 如果已存在符合条件的 WebviewPanel 实例，将重用该实例而不是创建新实例。
   * - false: 每次调用都会创建新的 WebviewPanel 实例，不考虑现有实例。
   * - string: 可以设置为特定的字符串标识要保留的实例，只有当实例的标识与该字符串匹配时才会被复用。
   * @default false
   */
  preserveInstance?: string | boolean;
  /**
   * 动态覆盖 WebviewPanel 的标题，不传则使用 descriptor.title。
   */
  title?: string;
}

export interface WebviewPanelProxy<
  ID extends string,
  ShowingArgs extends unknown[] = unknown[],
  SerializedState = unknown
> extends Disposable {
  readonly id: ID;
  readonly instanceId: string | undefined;
  readonly ready: boolean;
  readonly active: boolean;
  readonly visible: boolean;
  canReuseInstance(
    options?: WebviewPanelShowOptions,
    ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
  ): boolean | undefined;
  close(): void;
  refresh(force?: boolean): Promise<void>;
  show(options?: WebviewPanelShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>): Promise<void>;
  maximize(): Promise<void>;
}

export interface WebviewPanelsProxy<
  ID extends string,
  ShowingArgs extends unknown[] = unknown[],
  SerializedState = unknown
> extends Disposable {
  readonly id: ID;
  readonly instances: Iterable<WebviewPanelProxy<ID, ShowingArgs, SerializedState>>;
  getActiveInstance(): WebviewPanelProxy<ID, ShowingArgs, SerializedState> | undefined;
  getBestInstance(
    options?: WebviewPanelShowOptions,
    ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
  ): WebviewPanelProxy<ID, ShowingArgs, SerializedState> | undefined;
  /**
   * 注意：独立调用这个方法不会触发复用逻辑，只有在 show 方法中传入 preserveInstance 选项时才会启用复用机制。
   * @param options 下列选项会覆盖 show 方法中传入的同名选项（如 preserveFocus），但不会覆盖 preserveInstance 选项，因为 preserveInstance 只在 show 方法中生效。
   * @param args 下列参数会传递给 show 方法，但不会传递给 canReuseInstance 方法，因此不会影响复用判断逻辑
   */
  show(options?: WebviewPanelsShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>): Promise<void>;
  splitActiveInstance(options?: WebviewPanelsShowOptions): Promise<void>;
}

/** 所有 registerCustomEditorPanel 面板共享的 viewType（对应 package.json contributes.customEditors）*/
const webviewPanelViewType = 'autosar.webviewPanel';
export class WebviewsController<
  TContainer extends IWebviewContainer = IWebviewContainer,
  TPanelId extends string = string,
  TViewId extends string = string
> implements Disposable
{
  private disposables: Disposable[] = [];

  private readonly panels = new Map<string, WebviewPanelRegistration<string, any>>();
  private _views = new Map<string, WebviewController<string, any>>();
  private readonly _commandRegistrar: WebviewCommandRegistrar;
  /** 共享 CustomEditorProvider 的 EditEvent Emitter（所有 registerCustomEditorPanel 面板共用）
   *
   * 使用 CustomDocumentEditEvent（而非 ContentChangeEvent）以支持 VSCode 原生撤销/重做栈：
   * 每次触发时可携带 undo/redo 回调，VSCode Edit 菜单会直接调用这些回调完成撤销/重做。
   */
  private _sharedOnDidChangeCustomDocument: EventEmitter<CustomDocumentEditEvent<WebviewDocument>> | undefined;

  // ── 面包屑动态控制 ────────────────────────────────────────────────────────────
  /** 本插件注册的所有 WebviewPanel ID（registerWebviewPanel 使用，TabInputWebview 类型） */
  private readonly _ourPanelIds = new Set<string>();
  /** 面包屑监听器是否已初始化 */
  private _breadcrumbSyncReady = false;
  /** 禁用面包屑前保存的原始值，用于恢复 */
  private _savedBreadcrumbs: boolean | undefined;
  // ────────────────────────────────────────────────────────────────────────────
  constructor(private readonly container: TContainer) {
    this.disposables.push((this._commandRegistrar = new WebviewCommandRegistrar()));
  }

  /**
   * 检查当前活动 Tab 的 input 是否属于本插件的 Webview 面板。
   *
   * 使用鸭子类型而非 `instanceof`，避免 VS Code 扩展宿主跨代理对象的
   * `instanceof` 失效问题：
   * - `TabInputCustom`：有 `uri` + `viewType`，viewType 为 WEBVIEW_PANEL_VIEW_TYPE
   * - `TabInputWebview`：只有 `viewType`（无 `uri`），viewType 在 _ourPanelIds 中
   */
  private _isOurActiveTab(): boolean {
    const input = window.tabGroups.activeTabGroup?.activeTab?.input;
    if (input == null || typeof input !== 'object') return false;

    const viewType = (input as { viewType?: string }).viewType;
    if (!viewType) return false;

    // registerCustomEditorPanel → TabInputCustom（有 uri 字段）
    if (viewType === webviewPanelViewType) return true;

    // registerWebviewPanel → TabInputWebview（无 uri 字段）
    if ('uri' in input) return false;
    return this._ourPanelIds.has(viewType);
  }

  /**
   * 根据当前活动 Tab 开关面包屑：
   * - 本插件面板激活 → 隐藏面包屑栏（breadcrumbs.enabled = false）
   * - 其他编辑器激活 → 恢复 breadcrumbs.enabled 原始值
   *
   * 只写入 Global 用户设置，不修改 workspace/.vscode/settings.json。
   */
  private _syncBreadcrumbs(): void {
    const bcCfg = workspace.getConfiguration('breadcrumbs');
    if (this._isOurActiveTab()) {
      if (bcCfg.get<boolean>('enabled') !== false) {
        this._savedBreadcrumbs = bcCfg.get<boolean>('enabled') ?? true;
        void bcCfg.update('enabled', false, true /* global */);
      }
    } else if (this._savedBreadcrumbs !== undefined) {
      void bcCfg.update('enabled', this._savedBreadcrumbs, true);
      this._savedBreadcrumbs = undefined;
    }
  }

  /**
   * 首次调用时注册 Tab 切换监听器（懒初始化，由两种注册方法共同触发）。
   *
   * 同时清理旧版本遗留的 `breadcrumbs.filePath: "off"` 全局设置，恢复
   * JSON/代码文件的完整面包屑导航。
   */
  private _ensureBreadcrumbSync(): void {
    if (this._breadcrumbSyncReady) return;
    this._breadcrumbSyncReady = true;

    // 清理旧版本遗留的 breadcrumbs.filePath: "off" 全局设置
    const bcCfg = workspace.getConfiguration('breadcrumbs');
    const filePathInspect = bcCfg.inspect<string>('filePath');
    if (filePathInspect?.globalValue === 'off') {
      void bcCfg.update('filePath', undefined, true /* 删除 global 覆盖，恢复默认值 */);
    }

    this.disposables.push(
      // Tab 激活切换（含 webview ↔ webview 之间）
      window.tabGroups.onDidChangeTabs(() => this._syncBreadcrumbs()),
      // Tab 组激活切换（分屏时不同组之间切换）
      window.tabGroups.onDidChangeTabGroups(() => this._syncBreadcrumbs()),
      // 文本编辑器激活（webview → 代码文件，补充覆盖）
      window.onDidChangeActiveTextEditor(() => this._syncBreadcrumbs())
    );
    // 立即同步一次，处理插件激活时已有面板打开的情况
    this._syncBreadcrumbs();
  }

  /**
   * 首次调用时执行（懒初始化）：
   * 1. 注册 `webview-panel://` FileSystemProvider（VS Code 需能 stat 虚拟 URI）
   * 2. 注册共享 CustomEditorProvider（viewType = `autosar.webviewPanel`）
   *    按 URI authority（panelId）路由到具体面板的 WebviewController
   */
  private _ensureSharedCustomEditorProvider(): EventEmitter<CustomDocumentEditEvent<WebviewDocument>> {
    if (this._sharedOnDidChangeCustomDocument != null) {
      return this._sharedOnDidChangeCustomDocument;
    }

    // ← 新增：在注册 Provider 前，先清理上次会话遗留的 webview-panel:// 标签
    // 此时还没有任何 pendingShowArgs，所有 webview-panel:// 标签都是遗留的
    const staleTabs = window.tabGroups.all.flatMap((group) =>
      group.tabs.filter((tab) => {
        const input = tab.input as { viewType?: string; uri?: Uri } | null;
        return input?.viewType === webviewPanelViewType && input?.uri?.scheme === 'webview-panel';
      })
    );
    if (staleTabs.length > 0) {
      void window.tabGroups.close(staleTabs);
    }

    const fsp = new WebviewPanelFileSystemProvider();
    this.disposables.push(
      workspace.registerFileSystemProvider('webview-panel', fsp, {
        isCaseSensitive: true,
        isReadonly: false
      }),
      fsp
    );

    // 初始化面包屑动态控制（registerCustomEditorPanel 会触发此方法）
    this._ensureBreadcrumbSync();

    const emitter = new EventEmitter<CustomDocumentEditEvent<WebviewDocument>>();
    this._sharedOnDidChangeCustomDocument = emitter;
    this.disposables.push(emitter);

    const sharedProvider: CustomEditorProvider<WebviewDocument> = {
      openCustomDocument: (uri) => {
        return new WebviewDocument(uri);
      },

      resolveCustomEditor: async (document, webviewPanel, token) => {
        if (token.isCancellationRequested) return;

        const panelId = document.uri.authority;

        const reg = this.panels.get(panelId) as WebviewPanelRegistration<string, any, any, any> | undefined;
        if (reg?.resolveProvider == null) {
          console.error(`[WebviewsController] resolveCustomEditor: unknown panelId='${panelId}'`);
          return;
        }

        // 将标签页标题设置为面板描述符标题，避免显示 UUID 文件名
        webviewPanel.title = reg.descriptor.title;

        const instanceId = getInstanceIdFromUri(document.uri);
        const uriKey = document.uri.toString();
        // // ← 新增：会话恢复时没有 pendingShowArgs，直接关闭，不恢复上次的面板
        // if (!reg.pendingShowArgs?.has(uriKey)) {
        //   webviewPanel.dispose();
        //   return;
        // }
        const [pendingOpts, pendingArgs] = reg.pendingShowArgs?.get(uriKey) ?? [undefined, []];
        reg.pendingShowArgs?.delete(uriKey);

        const ctrl = await WebviewController.create(
          this.container,
          this._commandRegistrar,
          reg.descriptor,
          instanceId,
          webviewPanel,
          reg.resolveProvider
        );

        ctrl.attachCustomEditor(document, emitter);

        reg.controllers ??= new Map();
        reg.controllers.set(ctrl.instanceId, ctrl);

        this.disposables.push(
          ctrl.onDidDispose(() => reg.controllers?.delete(ctrl.instanceId)),
          ctrl
        );

        await ctrl.show(true, pendingOpts, ...(pendingArgs ?? []));
      },

      saveCustomDocument: async (document: WebviewDocument, cancellation) => {
        const ctrl = findCtrlByDoc(document, this.panels);
        if (!ctrl) throw new Error(`[saveCustomDocument] no controller for ${document.uri.toString()}`);
        await ctrl.saveDocument(cancellation);
      },

      saveCustomDocumentAs: async (document: WebviewDocument, destination: Uri, cancellation) => {
        const ctrl = findCtrlByDoc(document, this.panels);
        if (!ctrl) throw new Error(`[saveCustomDocumentAs] no controller for ${document.uri.toString()}`);
        await ctrl.saveDocumentAs(destination, cancellation);
      },

      revertCustomDocument: async (document: WebviewDocument, cancellation) => {
        const ctrl = findCtrlByDoc(document, this.panels);
        if (!ctrl) throw new Error(`[revertCustomDocument] no controller for ${document.uri.toString()}`);
        await ctrl.revertDocument(cancellation);
      },

      backupCustomDocument: async (document: WebviewDocument, context, cancellation) => {
        const ctrl = findCtrlByDoc(document, this.panels);
        if (!ctrl) return { id: context.destination.toString(), delete: async () => {} };
        return ctrl.backupDocument(context, cancellation);
      },

      onDidChangeCustomDocument: emitter.event
    };

    this.disposables.push(
      window.registerCustomEditorProvider(webviewPanelViewType, sharedProvider, {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: true
      })
    );

    return emitter;
  }
  // 注册 WebviewPanel（编辑器面板）
  registerWebviewPanel<ID extends TPanelId, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    descriptor: WebviewPanelDescriptor<ID>,
    resolveProvider: (
      container: TContainer,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): WebviewPanelsProxy<ID, ShowingArgs, SerializedState> {
    const registration: WebviewPanelRegistration<ID, State, SerializedState, ShowingArgs> = {
      descriptor: descriptor
    };

    this.panels.set(descriptor.id, registration as WebviewPanelRegistration<string, any>);
    const disposables: Disposable[] = [];
    const { container, _commandRegistrar: commandRegistrar } = this;

    const proxy: WebviewPanelsProxy<ID, ShowingArgs, SerializedState> = {
      id: descriptor.id,
      instances: [],
      getActiveInstance: () => {
        // 检查是否有注册的控制器实例
        if (!registration.controllers?.size) return undefined;

        // 查找活动状态的控制器
        //const controller = find(registration.controllers.values(), (c) => c.active ?? false);
      },
      getBestInstance: function (
        options?: WebviewPanelShowOptions,
        ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
      ) {
        const controller = getBestController(registration, options, ...args);
        return controller != null ? convertToWebviewPanelProxy(controller) : undefined;
      },
      show: async (options?: WebviewPanelsShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>) => {
        let column = options?.column ?? descriptor.column ?? ViewColumn.Beside;
        // 仅当存在活动标签页时才尝试在旁边打开
        if (column === ViewColumn.Active) {
          column = ViewColumn.Active;
        }

        // 检查是否已存在
        let controller = getBestController(registration, options, ...args);

        if (!controller) {
          descriptor.title = options?.title ?? descriptor.title;
          // 创建新的面板
          const panel = window.createWebviewPanel(descriptor.id, descriptor.title, column, {
            enableScripts: true,
            localResourceRoots: [Uri.file(container.context.extensionPath)],
            retainContextWhenHidden: true
          });

          // 设置图标
          if (descriptor.iconPath) {
            const iconUri = Uri.joinPath(this.container.context.extensionUri, descriptor.iconPath);
            panel.iconPath = iconUri;
          }

          // 若调用方通过 preserveInstance 传入了字符串标识（如 appId），则以该字符串作为
          // instanceId，保证下次同标识的 show 调用能通过 Map.get 直接命中，实现精确复用。
          const instanceId = descriptor.allowMultipleInstances
            ? typeof options?.preserveInstance === 'string'
              ? options.preserveInstance
              : uuid()
            : undefined;
          controller = await WebviewController.create<ID, State, SerializedState, ShowingArgs>(
            this.container,
            commandRegistrar,
            descriptor,
            instanceId,
            panel,
            resolveProvider as (
              container: IWebviewContainer,
              host: WebviewHost<ID>
            ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
          );

          registration.controllers ??= new Map();
          registration.controllers.set(controller.instanceId, controller);

          disposables.push(
            controller.onDidDispose(() => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              registration.controllers?.delete(controller!.instanceId);
            }),
            controller
          );
          await controller.show(true, options, ...args);
        } else {
          if (options?.title != null) {
            controller.title = options.title;
          }
          await controller.show(false, options, ...args);
        }
      },
      splitActiveInstance: async () => {},
      dispose: () => {}
    };
    return proxy;
  }

  // 注册 CustomEditor 面板（原生 dirty 状态 + Ctrl+S 支持）
  /**
   * 注册一个基于 `CustomEditorProvider` 的 Webview 面板。
   *
   * 与 `registerWebviewPanel` 的核心区别：
   * - VS Code 原生管理 dirty 状态（标题 `●`、关闭确认对话框、全局保存参与）
   * - Ctrl+S 触发 `provider.saveDocument()`；保存失败时面板不关闭
   * - 关闭时有 Save / Don't Save / **Cancel**（真正阻止关闭）三个选项
   * - Provider 需实现 `saveDocument` 和 `revertDocument`
   *
   * 面板通过虚拟 URI `webview-panel://<viewType>/<instanceId>` 标识，
   * 调用 `show()` 时内部使用 `vscode.openWith` 命令打开。
   */
  /**
   * 注册支持原生 Dirty State（● 标记、保存/撤销对话框）的编辑器面板。
   *
   * 所有通过此方法注册的面板共享 viewType `autosar.webviewPanel`，
   * 并由唯一的 `CustomEditorProvider` 按 URI authority（panelId）内部路由。
   * URI 格式：`webview-panel://<panelId>/<instanceId>.webview-panel`
   */
  registerCustomEditorPanel<
    ID extends TPanelId,
    State,
    SerializedState = State,
    ShowingArgs extends unknown[] = unknown[]
  >(
    descriptor: WebviewPanelDescriptor<ID>,
    resolveProvider: (
      container: TContainer,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): WebviewPanelsProxy<ID, ShowingArgs, SerializedState> {
    // 确保共享 Provider 和 FSP 已注册（懒初始化）
    this._ensureSharedCustomEditorProvider();

    const registration: WebviewPanelRegistration<ID, State, SerializedState, ShowingArgs> = {
      descriptor: descriptor,
      resolveProvider: resolveProvider as (
        container: IWebviewContainer,
        host: WebviewHost<ID>
      ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>,
      pendingShowArgs: new Map()
    };

    this.panels.set(descriptor.id, registration as WebviewPanelRegistration<string, any>);

    const proxy: WebviewPanelsProxy<ID, ShowingArgs, SerializedState> = {
      id: descriptor.id,
      instances: [],
      getActiveInstance: () => undefined,
      getBestInstance: function (
        options?: WebviewPanelShowOptions,
        ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
      ) {
        const controller = getBestController(registration, options, ...args);
        return controller != null ? convertToWebviewPanelProxy(controller) : undefined;
      },
      show: async (options?: WebviewPanelsShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>) => {
        // 已有可复用实例时直接 reveal
        const existing = getBestController(registration, options, ...args);
        if (existing) {
          if (options?.title != null) {
            existing.title = options.title;
          }
          await existing.show(false, options, ...args);
          return;
        }

        const instanceId = descriptor.allowMultipleInstances
          ? typeof options?.preserveInstance === 'string'
            ? options.preserveInstance
            : uuid()
          : undefined;
        descriptor.title = options?.title ?? descriptor.title;
        const uri = buildCustomEditorUri(descriptor.id, instanceId, descriptor.title);

        // 缓存 show 参数，resolveCustomEditor 中消费
        registration.pendingShowArgs?.set(uri.toString(), [options, args]);

        const column = options?.column ?? descriptor.column ?? ViewColumn.Beside;

        // 使用共享 viewType 打开，VS Code 路由到 sharedProvider
        await commands.executeCommand('vscode.openWith', uri, webviewPanelViewType, {
          viewColumn: column,
          preserveFocus: options?.preserveFocus ?? false,
          label: descriptor.title // 直接用正确标题，无需等 resolveCustomEditor
        });
      },
      splitActiveInstance: async () => {},
      dispose: () => {}
    };

    return proxy;
  }

  // 注册 WebviewView（侧边栏视图）
  registerWebviewView<ID extends TViewId, State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>(
    descriptor: WebviewViewDescriptor<ID>,
    resolveProvider: (
      container: TContainer,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>,
    onBeforeShow?: (...args: WebviewShowingArgs<ShowingArgs, SerializedState>) => void | Promise<void>
  ): WebviewViewProxy<ID, ShowingArgs, SerializedState> {
    const registration: WebviewViewRegistration<ID, State, SerializedState, ShowingArgs> = {
      descriptor: descriptor
    };

    const provider: WebviewViewProvider = {
      resolveWebviewView: async (
        webviewView: WebviewView,
        _context: WebviewViewResolveContext<SerializedState>,
        token: CancellationToken
      ) => {
        if (token.isCancellationRequested) return;

        webviewView.title = descriptor.title;
        const controller = await WebviewController.create<ID, State, SerializedState, ShowingArgs>(
          this.container,
          this._commandRegistrar,
          descriptor,
          undefined,
          webviewView,
          resolveProvider as (
            container: IWebviewContainer,
            host: WebviewHost<ID>
          ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
        );
        registration.controller = controller;

        this._views.set(descriptor.id, controller as any);

        webviewView.webview.options = {
          enableCommandUris: true,
          enableScripts: true,
          localResourceRoots: [Uri.file(this.container.context.extensionPath)],
          ...descriptor.webviewOptions
        };
        // eslint-disable-next-line prefer-const
        let [options, args] = registration.pendingShowArgs ?? [];
        registration.pendingShowArgs = undefined;
        if (args == null && isSerializedState<State>(_context)) {
          args = [{ state: _context.state }];
        }
        await controller.show(true, options, ...(args ?? []));
        // 清理
        webviewView.onDidDispose(() => {
          this._views.delete(descriptor.id);
          controller.dispose();
        });
      }
    };

    const disposables: Disposable[] = [];
    // const registrationDisposable = window.registerWebviewViewProvider(descriptor.id, provider);
    const registrationDisposable = window.registerWebviewViewProvider(descriptor.id, provider, {
      webviewOptions: { retainContextWhenHidden: descriptor.webviewHostOptions?.retainContextWhenHidden }
    });
    disposables.push(registrationDisposable);
    const disposable = Disposable.from(...disposables);
    this.disposables.push(disposable);
    return {
      id: descriptor.id,
      get ready() {
        return registration.controller?.ready ?? false;
      },
      get visible() {
        return registration.controller?.visible ?? false;
      },
      refresh: async () => {
        return registration.controller?.refresh() ?? Promise.resolve();
      },
      show: async (options?: WebviewViewShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>) => {
        if (registration.controller != null) {
          return registration.controller.show(false, options, ...args);
        }
        registration.pendingShowArgs = [options, args];
        if (onBeforeShow != null) {
          await onBeforeShow?.(...args);
        }

        return void commands.executeCommand(getViewFocusCommand(descriptor.id as any), options);
      },
      dispose: function () {
        disposable.dispose();
      }
    };
  }

  dispose(): void {
    this.disposables.forEach((d) => {
      d.dispose();
    });
    this.panels.forEach((registration) => {
      registration.controllers?.forEach((controller) => controller.dispose());
    });
    this._views.forEach((v) => v.dispose());
  }
}

function getBestController<ID extends string, State, SerializedState, ShowingArgs extends unknown[]>(
  registration: WebviewPanelRegistration<ID, State, SerializedState, ShowingArgs>,
  options: WebviewPanelsShowOptions | undefined,
  ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
) {
  let controller;
  if (registration.controllers?.size) {
    if (registration.descriptor.allowMultipleInstances) {
      if (options?.preserveInstance !== false) {
        if (options?.preserveInstance != null && typeof options.preserveInstance === 'string') {
          controller = registration.controllers.get(options.preserveInstance);
        }

        if (controller == null) {
          let active;
          let first;

          //先对活跃的控制器进行排序
          const sortedControllers = [...registration.controllers.values()].sort(
            (a, b) => (a.active ? -1 : 1) - (b.active ? -1 : 1)
          );

          for (const c of sortedControllers) {
            first ??= c;
            if (c.active) {
              active = c;
            }

            const canReuse = c.canReuseInstance(options, ...args);
            if (canReuse === true) {
              // 如果 webview 表示它应该被重用，则使用它
              controller = c;
              break;
            } else if (canReuse === false) {
              // 如果 webview 表示它不应该被重用，则不要重用，并从 first/active 中清除它
              if (first === c) {
                first = undefined;
              }
              if (active === c) {
                active = undefined;
              }
            }
          }

          if (controller == null && options?.preserveInstance === true) {
            controller = active ?? first;
          }
        }
      }
    } else {
      controller = first(registration.controllers)?.[1];
    }
  }

  return controller;
}

function convertToWebviewPanelProxy<
  ID extends string,
  State,
  SerializedState,
  ShowingArgs extends unknown[] = unknown[]
>(
  controller: WebviewController<ID, State, SerializedState, ShowingArgs>
): WebviewPanelProxy<ID, ShowingArgs, SerializedState> {
  return {
    id: controller.id,
    instanceId: controller.instanceId,
    ready: controller.ready,
    active: controller.active ?? false,
    visible: controller.visible,
    canReuseInstance: function (
      options?: WebviewPanelShowOptions,
      ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
    ) {
      return controller.canReuseInstance(options, ...args);
    },
    close: function () {
      (controller.parent as WebviewPanel).dispose();
    },
    dispose: function () {
      controller.dispose();
    },
    refresh: function (force?: boolean) {
      return controller.refresh(force);
    },
    show: function (options?: WebviewPanelShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>) {
      return controller.show(false, options, ...args);
    },
    maximize: function () {
      return controller.maximize();
    }
  };
}

/**
 * 在所有 CustomEditor 面板中按 document URI 找到对应的 WebviewController。
 * URI authority = panelId，URI path basename（去后缀）= instanceId。
 */
function findCtrlByDoc(
  document: WebviewDocument,

  panels: Map<string, WebviewPanelRegistration<string, any>>
): WebviewController<string, any, any, any> | undefined {
  const panelId = document.uri.authority;
  const instanceId = getInstanceIdFromUri(document.uri);
  return panels.get(panelId)?.controllers?.get(instanceId);
}

export function isSerializedState<State>(o: unknown): o is { state: Partial<State> } {
  return o != null && typeof o === 'object' && 'state' in o && o.state != null && typeof o.state === 'object';
}
