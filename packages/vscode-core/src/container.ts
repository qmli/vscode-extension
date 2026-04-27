import type { Disposable, Event, ExtensionContext } from 'vscode';
import { EventEmitter } from 'vscode';
import { getSingletonServiceDescriptors } from './instantiation/extensions';
import { InstantiationService } from './instantiation/instantiationService';
import { ServiceCollection } from './instantiation/serviceCollection';
import type { Storage } from './storage';

/**
 * 通用扩展容器基类
 *
 * 职责：
 * - 生命周期管理（disposables、ready/onReady）
 * - ExtensionContext 与版本信息持有
 * - 依赖注入服务（InstantiationService）初始化
 * - Storage 持有
 *
 * 不包含任何 app 特定逻辑（EventBus、Views、Keyboard 等），
 * 由子类通过构造函数扩展。
 *
 * @template TStorage 具体 Storage 子类类型
 */
export abstract class CoreContainer<TStorage extends Storage = Storage> {
  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  protected readonly _disposables: Disposable[] = [];

  private _ready = false;
  private readonly _onReady = new EventEmitter<void>();

  ready(): void {
    if (this._ready) throw new Error('Container is already ready');
    this._ready = true;
    queueMicrotask(() => this._onReady.fire());
  }

  get onReady(): Event<void> {
    if (this._ready) {
      const emitter = new EventEmitter<void>();
      setTimeout(() => emitter.fire(), 0);
      return emitter.event;
    }
    return this._onReady.event;
  }

  // ─── Core properties ─────────────────────────────────────────────────────────
  private readonly _context: ExtensionContext;
  get context(): ExtensionContext {
    return this._context;
  }

  private readonly _version: string;
  get version(): string {
    return this._version;
  }

  private readonly _storage: TStorage;
  get storage(): TStorage {
    return this._storage;
  }

  // ─── Dependency Injection ─────────────────────────────────────────────────────
  public readonly instantiationService: InstantiationService;

  constructor(context: ExtensionContext, storage: TStorage, version: string) {
    this._context = context;
    this._version = version;
    this._disposables.push((this._storage = storage));

    this.registerSingletons();

    const services = this.initServices(context);
    this.instantiationService = new InstantiationService(services, true);

    context.subscriptions.push({
      dispose: () => this._disposables.reverse().forEach((d) => void d.dispose())
    });
  }

  /**
   * 在 InstantiationService 创建之前调用，子类可覆写以提前注册单例。
   */
  protected registerSingletons(): void {}

  /**
   * 构建初始 ServiceCollection。
   * 默认收集所有通过 @registerSingleton 注册的描述符，子类可覆写以追加额外服务。
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected initServices(_context: ExtensionContext): ServiceCollection {
    const services = new ServiceCollection();
    for (const [id, descriptor] of getSingletonServiceDescriptors()) {
      services.set(id, descriptor);
    }
    return services;
  }
}

export function isCoreContainer(value: unknown): value is CoreContainer {
  return value instanceof CoreContainer;
}
