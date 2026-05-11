import { ExternalExecutableService, ProviderName } from '@orientais/vscode-external';
import type { IWebviewContainer } from '@orientais/vscode-webview';
import { CoreContainer } from '@orientais/vscode-webview';
import { WebviewsController } from '@orientais/vscode-webview/webviewsController';
import { EventBus } from '@shared/utils/eventBus';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
import type { ExtensionContext } from 'vscode';
import type { Storage } from '@/core/storage';
import { Keyboard } from './core/keyboard';
import { NotificationManager } from './core/notification';
import { ApNModelUpdateProvider } from './external/providers/apNModelUpdateProvider';
import { CpConvertorProvider } from './external/providers/cpConvertorProvider';
import { CpGeneratorProvider } from './external/providers/cpGeneratorProvider';
import { CpImporterProvider } from './external/providers/cpImporterProvider';
import { CpValidatorProvider } from './external/providers/cpValidatorProvider';
import { GitShellBasedProvider } from './external/providers/gitShellBasedProvider';
import { ProjectUpdateProvider } from './external/providers/projectUpdateProvider';
import { Views } from './views';

export class Container extends CoreContainer<Storage> implements IWebviewContainer {
  // ─── 单例（不可下沉：static 不参与继承多态）──────────────────────────────────
  static #instance: Container | undefined;
  static #proxy = new Proxy<Container>({} as Container, {
    get: function (_target, prop) {
      if (Container.#instance != null) return (Container.#instance as any)[prop];
      throw new Error('Container is not initialized');
    }
  });

  static create(context: ExtensionContext, storage: Storage, version: string): Container {
    if (Container.#instance != null) throw new Error('Container is already initialized');
    Container.#instance = new Container(context, storage, version);
    return Container.#instance;
  }

  static get instance(): Container {
    return Container.#instance ?? Container.#proxy;
  }

  // ─── App 专属属性 ──────────────────────────────────────────────────────────
  private readonly _eventBus: EventBus;
  get events(): EventBus {
    return this._eventBus;
  }

  private readonly _keyboard: Keyboard;
  get keyboard(): Keyboard {
    return this._keyboard;
  }

  private readonly _views: Views;
  get views(): Views {
    return this._views;
  }

  private readonly _notificationManager: NotificationManager;
  get notificationManager(): NotificationManager {
    return this._notificationManager;
  }

  private _external: ExternalExecutableService | undefined;
  get external(): ExternalExecutableService {
    if (this._external == null) {
      this._disposables.push((this._external = new ExternalExecutableService()));
    }
    return this._external;
  }

  private constructor(context: ExtensionContext, storage: Storage, version: string) {
    super(context, storage, version);

    const webviews = this.instantiationService.createInstance(
      WebviewsController<Container, WebviewIds, WebviewViewIds>,
      this
    );
    this._disposables.push(webviews);

    this._disposables.push((this._notificationManager = new NotificationManager(this, webviews)));
    this._disposables.push((this._views = new Views(this, webviews)));
    this._disposables.push((this._eventBus = new EventBus()));
    this._disposables.push((this._keyboard = new Keyboard()));
  }

  public async initializeDatabase(): Promise<void> {}

  public async initializeDefaultWorkspace(): Promise<boolean> {
    return true;
  }

  public async initializeTemplate(): Promise<void> {}

  public async initializeMonitor(): Promise<void> {}

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
}

export function isContainer(container: any): container is Container {
  return container instanceof Container;
}
