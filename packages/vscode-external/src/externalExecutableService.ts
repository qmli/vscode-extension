import type { Disposable } from 'vscode';
import { Logger } from '@orientais/vscode-core/logger';
import { getLogScope } from '@orientais/vscode-core/logger.scope';
import { showGenericErrorMessage } from '@/core/message';
import { ExternalExecutableError } from './errors';
import { logExternalDebug, logExternalError, logExternalInfo, logExternalWarn } from './externalOutputChannel';
import type {
  ExecutableConfig,
  ExecutableProvider,
  ExecutableStatusInfo,
  ExternalExecutableResponse
} from './types/protocol';

/**
 * 已知 Provider 名称常量，用于约束 providerName 字符串字面量类型
 */
export const ProviderName = {
  LocalGitTool: 'local-git-tool',
  SshGitTool: 'ssh-git-tool',
  LocalSshGit: 'local-ssh-git',
  GithubSshGit: 'github-ssh-git',
  /** CP 验证器 */
  CpValidator: 'cp.validator',
  /** CP 转换器 */
  CpConvertor: 'cp.convertor',
  /** CP 生成器 */
  CpGenerator: 'cp.generator',
  /** 项目升级 */
  ProjectUpdate: 'project.update',
  /** AP N模型升级 */
  ApNModelUpdate: 'ap.n.model.update',
  /** CP 导入器 */
  CpImporter: 'cp.importer'
} as const;

/** Provider 名称联合类型 */
export type ProviderName = (typeof ProviderName)[keyof typeof ProviderName];

export interface ExternalExecutableServiceConfig {
  providers: ExecutableConfig;
  globalTimeout?: number;
  maxConcurrentExecutions?: number;
  enableStatusBar?: boolean;
  enableNotifications?: boolean;
}

/**
 * 批量注册时单个 Provider 的注册描述
 */
export interface ProviderRegistration {
  /** Provider 名称，建议使用 {@link ProviderName} 常量 */
  name: string;
  /** Provider 构造函数 */
  providerClass: new () => ExecutableProvider;
  /** Provider 配置 */
  config: ExternalExecutableServiceConfig;
}

export class ExternalExecutableService implements Disposable {
  private readonly _providers = new Map<string, ExecutableProvider>();
  private readonly _disposables: Disposable[] = [];
  private _config: ExternalExecutableServiceConfig | undefined;

  dispose(): void {
    for (const provider of this._providers.values()) {
      if ('dispose' in provider) {
        (provider as Disposable).dispose();
      }
    }
    this._providers.clear();

    for (let i = this._disposables.length - 1; i >= 0; i--) {
      this._disposables[i].dispose();
    }
  }

  private async registerProvider(
    name: string,
    providerClass: new () => ExecutableProvider,
    config: ExternalExecutableServiceConfig
  ): Promise<void> {
    const scope = getLogScope();

    if (this._providers.has(name)) {
      throw new ExternalExecutableError(`提供者 '${name}' 已经注册`);
    }
    this._config = config;
    try {
      const provider = new providerClass();

      this._disposables.push(provider);

      provider.initialize(config.providers);

      if (!provider.supported) {
        throw new ExternalExecutableError(`提供者 '${name}' 不支持当前平台`);
      }

      if (config.providers.enabled && 'start' in provider) {
        await (provider as any).start();
      }

      this._providers.set(name, provider);
      Logger.debug(scope, `已注册提供者: ${name}`);
      logExternalInfo(`已注册外部工具提供者: ${name}`);
    } catch (ex) {
      Logger.error(scope, `注册提供者 ${name} 失败:`, ex);
      logExternalError(`注册外部工具提供者失败: ${name}`, ex);
      throw ex;
    }
  }

  /**
   * 批量注册多个 Provider，失败项记录日志但不中断其他项注册
   * @param registrations Provider 注册描述数组
   */
  async registerProviders(registrations: ProviderRegistration[]): Promise<void> {
    const scope = getLogScope();
    const results = await Promise.allSettled(
      registrations.map((reg) => this.registerProvider(reg.name, reg.providerClass, reg.config))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        Logger.error(scope, `批量注册提供者 '${registrations[i].name}' 失败:`, result.reason);
      }
    }
  }

  async executeCommand(
    providerName: string,
    command: string,
    args?: string[],
    options?: unknown
  ): Promise<ExternalExecutableResponse> {
    const scope = getLogScope();

    const provider = this._providers.get(providerName);
    if (!provider) {
      throw new ExternalExecutableError(`Provider '${providerName}' not found`);
    }

    Logger.debug(scope, `正在执行 ${providerName} 的命令: ${command}`);
    logExternalDebug(`正在执行命令: ${providerName} -> ${command}`, { args: args, options: options });

    try {
      const response = await provider.execute(command, args, options);
      Logger.debug(scope, `命令成功完成: ${command}`);
      logExternalInfo(`命令执行成功: ${providerName} -> ${command}`, { success: response.success });
      return response;
    } catch (ex) {
      Logger.error(scope, `命令执行失败: ${command}`, ex);
      logExternalError(`命令执行失败: ${providerName} -> ${command}`, ex);

      if (this._config?.enableNotifications) {
        void showGenericErrorMessage(`外部可执行文件命令失败: ${ex instanceof Error ? ex.message : String(ex)}`);
      }

      throw ex;
    }
  }

  getProviderStatus(providerName: ProviderName): ExecutableStatusInfo | undefined {
    const provider = this._providers.get(providerName);
    if (!provider || !('status' in provider)) {
      return undefined;
    }

    return (provider as { status: ExecutableStatusInfo }).status;
  }

  getAllProviderStatuses(): Record<string, ExecutableStatusInfo> {
    const statuses: Record<string, ExecutableStatusInfo> = {};

    for (const [name, provider] of this._providers.entries()) {
      if ('status' in provider) {
        statuses[name] = (provider as any).status;
      }
    }

    return statuses;
  }

  async startProvider(providerName: ProviderName): Promise<void> {
    const scope = getLogScope();
    const provider = this._providers.get(providerName);

    if (!provider) {
      throw new ExternalExecutableError(`未找到提供者 '${providerName}'`);
    }

    if ('start' in provider) {
      Logger.debug(scope, `正在启动提供者: ${providerName}`);
      await (provider as any).start();
      logExternalInfo(`外部工具提供者已启动: ${providerName}`);
    }
  }

  async stopProvider(providerName: ProviderName): Promise<void> {
    const scope = getLogScope();
    const provider = this._providers.get(providerName);

    if (!provider) {
      throw new ExternalExecutableError(`未找到提供者 '${providerName}'`);
    }

    if ('stop' in provider) {
      Logger.debug(scope, `正在停止提供者: ${providerName}`);
      await (provider as any).stop();
      logExternalWarn(`外部工具提供者已停止: ${providerName}`);
    }
  }

  async restartProvider(providerName: ProviderName): Promise<void> {
    const scope = getLogScope();
    const provider = this._providers.get(providerName);

    if (!provider) {
      throw new ExternalExecutableError(`未找到提供者 '${providerName}'`);
    }

    if ('restart' in provider) {
      Logger.debug(scope, `正在重启提供者: ${providerName}`);
      await (provider as any).restart();
      logExternalInfo(`外部工具提供者已重启: ${providerName}`);
    }
  }

  /**
   * 通过名称获取已注册的 Provider 实例，支持泛型以获得具体类型
   * @param providerName Provider 名称，建议使用 {@link ProviderName} 常量
   * @returns 指定类型的 Provider 实例，若未找到则返回 undefined
   * @example
   * const git = service.getProvider<GitShellBasedProvider>(ProviderName.LocalGitTool);
   * git?.getVersion();
   */
  getProvider<T extends ExecutableProvider = ExecutableProvider>(providerName: ProviderName): T | undefined {
    return this._providers.get(providerName) as T | undefined;
  }

  /**
   * 获取所有可用的提供者名称
   * @returns 可用提供者名称的数组
   */
  getAvailableProviders(): string[] {
    return Array.from(this._providers.keys());
  }

  isProviderRunning(providerName: ProviderName): boolean {
    const status = this.getProviderStatus(providerName);
    return status?.status === 'running';
  }
}
