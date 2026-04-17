// =============================================================================
// WebviewsController 实现（总控制器）
// =============================================================================
import type {
  CancellationToken,
  WebviewOptions,
  WebviewPanelOptions,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext
} from 'vscode';
import { Disposable, Uri, ViewColumn, window } from 'vscode';
import { executeCoreCommand } from '@/common/commands/command';
import { uuid } from '@/common/crypto';
import type {
  WebviewIds,
  WebviewTypes,
  WebviewViewIds,
  WebviewViewTypes
} from '@packages/common/webviews/constants/constants.views';
import { first } from '@packages/utils/iterable';
import type { Container } from './container';
import { getViewFocusCommand } from './core/vscode.views';
import { WebviewCommandRegistrar } from './webviewCommandRegistrar';
import { WebviewController } from './webviewController';
import type { WebviewHost } from './webviewHost';
import type { WebviewProvider, WebviewShowingArgs } from './webviewProvider';

//#region Webview相关类型定义
export interface WebviewViewDescriptor<ID extends WebviewViewIds> {
  id: ID;
  title?: string;
  readonly contextKeyPrefix: `autosar:webviewView:${WebviewViewTypes}`;
  iconPath: string;
  column: ViewColumn;
  readonly type: WebviewViewTypes;
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
export interface WebviewViewProxy<ID extends WebviewViewIds, ShowingArgs extends unknown[], SerializedState = unknown>
  extends Disposable {
  readonly id: ID;
  readonly ready: boolean;
  readonly visible: boolean;
  refresh(force?: boolean): Promise<void>;
  show(options?: WebviewViewShowOptions, ...args: WebviewShowingArgs<ShowingArgs, SerializedState>): Promise<void>;
}

interface WebviewViewRegistration<
  ID extends WebviewViewIds,
  State,
  SerializedState = State,
  ShowingArgs extends unknown[] = unknown[]
> {
  readonly descriptor: WebviewViewDescriptor<ID>;
  controller?: WebviewController<ID, State, SerializedState, ShowingArgs>;
  pendingShowArgs?: [WebviewViewShowOptions | undefined, WebviewShowingArgs<ShowingArgs, SerializedState>] | undefined;
}
//#endregion
export interface WebviewPanelDescriptor<ID extends WebviewIds> {
  id: ID;
  readonly iconPath: string;
  readonly title: string;
  readonly contextKeyPrefix: `autosar:webview:${WebviewTypes}`; // Context Keys 是 VS Code 的条件执行机制，contextKeyPrefix 为该 webview 的所有 context keys 提供统一前缀
  readonly type: WebviewTypes;
  readonly column?: ViewColumn;
  readonly webviewOptions?: WebviewOptions;
  readonly webviewHostOptions?: WebviewPanelOptions;
  readonly allowMultipleInstances?: boolean; //配置中用于控制是否允许同一个 webview 类型打开多个实例的标志位
}
interface WebviewPanelRegistration<
  ID extends WebviewIds,
  State,
  SerializedState = State,
  ShowingArgs extends unknown[] = unknown[]
> {
  readonly descriptor: WebviewPanelDescriptor<ID>;
  controllers?: Map<string | undefined, WebviewController<ID, State, SerializedState, ShowingArgs>> | undefined;
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
  ID extends WebviewIds,
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
  ID extends WebviewIds,
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

export class WebviewsController implements Disposable {
  private disposables: Disposable[] = [];
  private readonly panels = new Map<string, WebviewPanelRegistration<WebviewIds, any>>();
  private _views = new Map<string, WebviewController<WebviewViewIds, any>>();
  private readonly _commandRegistrar: WebviewCommandRegistrar;

  constructor(private readonly container: Container) {
    this.disposables.push((this._commandRegistrar = new WebviewCommandRegistrar()));
  }

  // 注册 WebviewPanel（编辑器面板）
  registerWebviewPanel<
    ID extends WebviewIds,
    State,
    SerializedState = State,
    ShowingArgs extends unknown[] = unknown[]
  >(
    descriptor: WebviewPanelDescriptor<ID>,
    resolveProvider: (
      container: Container,
      host: WebviewHost<ID>
    ) => Promise<WebviewProvider<State, SerializedState, ShowingArgs>>
  ): WebviewPanelsProxy<ID, ShowingArgs, SerializedState> {
    const registration: WebviewPanelRegistration<ID, State, SerializedState, ShowingArgs> = {
      descriptor: descriptor
    };
    this.panels.set(descriptor.id, registration);
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
          // 创建新的面板
          const panel = window.createWebviewPanel(descriptor.id, options?.title ?? descriptor.title, column, {
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
            resolveProvider
          );

          registration.controllers ??= new Map();
          registration.controllers.set(controller.instanceId, controller);

          disposables.push(
            controller.onDidDispose(() => {
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

  // 注册 WebviewView（侧边栏视图）
  registerWebviewView<
    ID extends WebviewViewIds,
    State,
    SerializedState = State,
    ShowingArgs extends unknown[] = unknown[]
  >(
    descriptor: WebviewViewDescriptor<ID>,
    resolveProvider: (
      container: Container,
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
          resolveProvider
        );
        registration.controller = controller;
        this._views.set(descriptor.id, controller as any);

        webviewView.webview.options = {
          enableCommandUris: true,
          enableScripts: true,
          localResourceRoots: [Uri.file(this.container.context.extensionPath)],
          ...descriptor.webviewOptions
        };
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

        return void executeCoreCommand(getViewFocusCommand(descriptor.id), options);
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

function getBestController<ID extends WebviewIds, State, SerializedState, ShowingArgs extends unknown[]>(
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
  ID extends WebviewIds,
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
      controller.parent.dispose();
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

export function isSerializedState<State>(o: unknown): o is { state: Partial<State> } {
  return o != null && typeof o === 'object' && 'state' in o && o.state != null && typeof o.state === 'object';
}
