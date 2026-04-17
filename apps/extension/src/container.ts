import type { Disposable, Event, ExtensionContext } from 'vscode';
import { EventEmitter } from 'vscode';
import type { Storage } from '@/core/storage';
import { getSingletonServiceDescriptors } from '@packages/common/instantiation/common/extensions';
import { InstantiationService } from '@packages/common/instantiation/common/instantiationService';
import { ServiceCollection } from '@packages/common/instantiation/common/serviceCollection';
import { EventBus } from './core/eventBus';
import { Keyboard } from './core/keyboard';
import { NotificationManager } from './core/notification';
import { ExternalExecutableService, ProviderName } from './external/externalExecutableService';
import { ApNModelUpdateProvider } from './external/providers/apNModelUpdateProvider';
import { CpConvertorProvider } from './external/providers/cpConvertorProvider';
import { CpGeneratorProvider } from './external/providers/cpGeneratorProvider';
import { CpImporterProvider } from './external/providers/cpImporterProvider';
import { CpValidatorProvider } from './external/providers/cpValidatorProvider';
import { GitShellBasedProvider } from './external/providers/gitShellBasedProvider';
import { ProjectUpdateProvider } from './external/providers/projectUpdateProvider';

import { Views } from './views';
import { WebviewsController } from './webviewsController';

export class Container {
  static #instance: Container | undefined;
  static #proxy = new Proxy<Container>({} as Container, {
    get: function (_target, prop) {
      // 如果有人缓存了这个实例
      if (Container.#instance != null) return (Container.#instance as any)[prop];

      // 允许在初始化之前访问 config
      // if (prop === 'config') return configuration.getAll();
      // debugger;
      throw new Error('Container is not initialized');
    }
  });
  private _disposables: Disposable[];
  private _storage: Storage;
  private _context: ExtensionContext;
  private _ready: boolean = false;
  public instantiationService: InstantiationService;

  // private _monitorNotificationService: MonitorNotificationService;
  // private _monitoringNotificationService: MonitoringNotificationService;

  static create(context: ExtensionContext, storage: Storage, version: string): Container {
    if (Container.#instance != null) throw new Error('Container is already initialized');
    Container.#instance = new Container(context, storage, version);
    return Container.#instance;
  }
  /**
   * 初始化依赖注入服务
   * @param context - VS Code 扩展上下文
   */
  private static initServices(_context: ExtensionContext): ServiceCollection {
    const services = new ServiceCollection();

    const singletonDescriptors = getSingletonServiceDescriptors();
    for (const [id, descriptor] of singletonDescriptors) {
      services.set(id, descriptor);
    }

    return services;
  }

  /**
   * 注册单例服务
   */
  private registerSingletons(): void {}
  private constructor(context: ExtensionContext, storage: Storage, version: string) {
    this._context = context;
    this._version = version;
    this._disposables = [(this._storage = storage)];
    this.registerSingletons();
    // 初始化依赖注入容器
    const services = Container.initServices(context);

    this.instantiationService = new InstantiationService(services, true);

    // 通过 DI 创建 WebviewsController
    const webviews = this.instantiationService.createInstance(WebviewsController, this);
    this._disposables.push(webviews);

    // 初始化通知系统
    this._disposables.push((this._notificationManager = new NotificationManager(this, webviews)));

    this._disposables.push((this._views = new Views(this, webviews)));

    this._disposables.push((this._eventBus = new EventBus()));

    this._disposables.push((this._keyboard = new Keyboard()));

    // 释放所有
    context.subscriptions.push({
      dispose: () => this._disposables.reverse().forEach((d) => void d.dispose())
    });
  }

  ready(): void {
    if (this._ready) throw new Error('Container is already ready');

    this._ready = true;
    queueMicrotask(() => this._onReady.fire());
  }

  private _onReady: EventEmitter<void> = new EventEmitter<void>();
  get onReady(): Event<void> {
    if (this._ready) {
      const emitter = new EventEmitter<void>();
      setTimeout(() => emitter.fire(), 0);
      return emitter.event;
    }

    return this._onReady.event;
  }

  private readonly _version: string;
  get version(): string {
    return this._version;
  }

  /**
   * EventBus 提供跨组件的状态通信机制
   */
  private readonly _eventBus: EventBus;
  get events(): EventBus {
    return this._eventBus;
  }

  public async initializeDatabase(): Promise<void> {}

  public async initializeDefaultWorkspace(): Promise<boolean> {
    return true;
  }

  public async initializeTemplate(): Promise<void> {}

  public async initializeMonitor(): Promise<void> {}

  private _external: ExternalExecutableService | undefined;
  get external(): ExternalExecutableService {
    if (this._external == null) {
      this._disposables.push((this._external = new ExternalExecutableService()));
    }
    return this._external;
  }

  /**
   * 批量注册内置 Provider（GitShellBasedProvider 等）
   * 在扩展激活完成后调用，失败项不会中断其他 Provider 的注册
   */
  public async initializeExternalProviders(): Promise<void> {
    await this.external.registerProviders([
      {
        name: ProviderName.LocalGitTool,
        providerClass: GitShellBasedProvider,
        config: {
          providers: {
            path: 'git',
            name: 'Local Git Tool',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            autoRestart: true,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      },
      {
        name: ProviderName.ApNModelUpdate,
        providerClass: ApNModelUpdateProvider,
        config: {
          providers: {
            path: 'isoft_update/model-upgrade.exe',
            name: 'AP N模型升级',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      },
      {
        name: ProviderName.CpImporter,
        providerClass: CpImporterProvider,
        config: {
          providers: {
            path: 'isoft_importer/python-importer.exe',
            name: 'CP 导入器',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      },
      {
        name: ProviderName.CpValidator,
        providerClass: CpValidatorProvider,
        config: {
          providers: {
            path: 'isoft_validator/ORIENTAISBswVal.exe',
            name: 'CP 验证器',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      },
      {
        name: ProviderName.CpConvertor,
        providerClass: CpConvertorProvider,
        config: {
          providers: {
            path: 'isoft_convertor/model-convert.exe',
            name: 'CP 转换器',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      },
      {
        name: ProviderName.CpGenerator,
        providerClass: CpGeneratorProvider,
        config: {
          providers: {
            path: 'isoft_generator/ORIENTAISBswGen.exe',
            name: 'CP 生成器',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      },
      {
        name: ProviderName.ProjectUpdate,
        providerClass: ProjectUpdateProvider,
        config: {
          providers: {
            path: 'isoft_update/update-project.exe',
            name: '项目升级',
            enabled: true,
            connectionType: 'local',
            timeout: 15000,
            startupArgs: []
          },
          globalTimeout: 30000,
          maxConcurrentExecutions: 5,
          enableStatusBar: true,
          enableNotifications: true
        }
      }
    ]);
  }

  private readonly _keyboard: Keyboard;
  get keyboard(): Keyboard {
    return this._keyboard;
  }

  get context(): ExtensionContext {
    return this._context;
  }

  static get instance(): Container {
    return Container.#instance ?? Container.#proxy;
  }

  private readonly _views: Views;
  get views(): Views {
    return this._views;
  }

  get storage(): Storage {
    return this._storage;
  }

  /**
   * 通知管理器 - 统一管理所有webview的通知发送
   */
  private readonly _notificationManager: NotificationManager;
  get notificationManager(): NotificationManager {
    return this._notificationManager;
  }
}

export function isContainer(container: any): container is Container {
  return container instanceof Container;
}
