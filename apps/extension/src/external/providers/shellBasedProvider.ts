import { existsSync } from 'fs';
import type { Disposable } from 'vscode';
import { Logger } from '@/core/logger';
import { getLogScope } from '@/core/logger.scope';
import type { RunOptions } from '@/core/shell';
import { findExecutable, runSpawn } from '@/core/shell';
import { ShellChannel } from '../channels/shellChannel';
import {
  ExecutableNotFoundError,
  ExecutableStartupError,
  ExecutableTimeoutError,
  ExternalExecutableError
} from '../errors';
import type {
  CommunicationChannel,
  ExecutableConfig,
  ExecutableProvider,
  ExecutableStatusInfo,
  ExternalExecutableResponse
} from '../types/protocol';
import { ExecutableStatus } from '../types/protocol';

/**
 * 基于Shell的可执行程序提供者抽象类
 * 使用shell工具提供更好的跨平台支持
 * 该提供者使用一次性命令执行而不是维护持久连接
 */
export abstract class ShellBasedExecutableProvider implements ExecutableProvider, Disposable {
  private _config: ExecutableConfig | undefined;
  private _status: ExecutableStatus = ExecutableStatus.Stopped;
  private _channel: CommunicationChannel | undefined;
  private _lastActivity: Date | undefined;

  abstract readonly name: string;
  abstract readonly version?: string;

  /**
   * 检查提供者是否受支持
   * 通过验证可执行文件路径是否存在来判断
   */
  get supported(): boolean {
    return this._config?.path ? existsSync(this._config.path) : false;
  }

  /**
   * 获取当前状态信息
   * 包括状态和最后活动时间
   */
  get status(): ExecutableStatusInfo {
    return {
      status: this._status,
      lastActivity: this._lastActivity
    };
  }

  /**
   * 释放资源
   */
  dispose(): void {
    void this.stop();
  }

  /**
   * 初始化提供者
   * @param config 可执行程序配置
   */
  initialize(config: ExecutableConfig): void {
    const scope = getLogScope();

    // 检查可执行文件是否存在
    if (!existsSync(config.path)) {
      throw new ExecutableNotFoundError(config.path);
    }

    this._config = { ...config };

    // 验证可执行文件是否可以被找到且有效
    try {
      const { cmd } = findExecutable(config.path, []);
      Logger.debug(scope, `已使用可执行文件初始化 ${this.name} 提供者: ${cmd}`);
    } catch (ex) {
      throw new ExecutableStartupError(config.path, ex as Error);
    }
  }

  /**
   * 启动提供者
   * 创建通信通道并执行健康检查
   */
  async start(): Promise<void> {
    const scope = getLogScope();

    if (!this._config) {
      throw new ExternalExecutableError('提供者未初始化');
    }

    if (this._status === ExecutableStatus.Running) {
      Logger.debug(scope, `${this.name} 已经在运行`);
      return;
    }

    this._status = ExecutableStatus.Starting;
    Logger.debug(scope, `启动 ${this.name} 可执行文件: ${this._config.path}`);

    try {
      // 使用shell工具创建通道
      this._channel = new ShellChannel(
        this._config.path,
        this._config.startupArgs || [],
        {
          cwd: this._config.cwd,
          // eslint-disable-next-line no-restricted-globals
          env: { ...process.env, ...this._config.env } // 合并系统环境变量和配置环境变量
        },
        this._config.timeout
      );

      // 测试可执行文件，执行健康检查
      await this.waitForStartup();

      // 更新状态为运行中
      this._status = ExecutableStatus.Running;
      Logger.debug(scope, `${this.name} 启动成功`);
    } catch (ex) {
      this._status = ExecutableStatus.Error;
      this.cleanup();
      throw new ExecutableStartupError(this._config.path, ex as Error);
    }
  }

  /**
   * 停止提供者
   * 关闭通信通道并清理资源
   */
  async stop(): Promise<void> {
    const scope = getLogScope();

    if (this._status === ExecutableStatus.Stopped) {
      return;
    }

    this._status = ExecutableStatus.Stopping;
    Logger.debug(scope, `正在停止 ${this.name}`);

    try {
      if (this._channel) {
        await this._channel.close();
      }
    } finally {
      this.cleanup();
      this._status = ExecutableStatus.Stopped;
      Logger.debug(scope, `${this.name} 已停止`);
    }
  }

  /**
   * 执行命令
   * @param command 要执行的命令
   * @param args 命令参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(command: string, args?: string[], options?: RunOptions): Promise<ExternalExecutableResponse> {
    const scope = getLogScope();

    if (!this._channel || this._status !== ExecutableStatus.Running) {
      throw new ExternalExecutableError('提供者未运行');
    }

    this._lastActivity = new Date();

    const request = {
      id: this.generateId(),
      command: command,
      args: args,
      options: options
    };

    try {
      const response = await this._channel.send(request);

      if (!response.success && response.error) {
        throw new ExternalExecutableError(response.error.message, `EXTERNAL_COMMAND_ERROR_${response.error.code}`);
      }

      return response;
    } catch (ex) {
      if (ex instanceof ExecutableTimeoutError) {
        Logger.warn(scope, `命令超时: ${command}`);
      }
      throw ex;
    }
  }

  /**
   * 重启提供者
   * 先停止再启动
   */
  async restart(): Promise<void> {
    const scope = getLogScope();
    Logger.log(scope, `正在重启 ${this.name}`);

    await this.stop();
    await this.start();
  }

  /**
   * 等待启动完成，测试可执行文件确保其工作正常
   * 子类应该重写此方法以执行适当的健康检查
   */
  protected async waitForStartup(): Promise<void> {
    // 默认实现 - 尝试执行简单命令
    try {
      await this.execute('--version');
    } catch (ex) {
      // 如果--version失败，尝试--help
      try {
        await this.execute('--help');
      } catch {
        // 如果都失败，只记录日志并继续 - 可执行文件可能有不同的约定
        const scope = getLogScope();
        Logger.debug(scope, `${this.name} 启动验证失败，但继续执行:`, ex);
      }
    }
  }

  /**
   * 使用shell工具直接执行简单命令的便捷方法
   * 这会绕过通道系统，用于简单的一次性命令
   * @param command 要执行的命令
   * @param args 命令参数
   * @param options 执行选项
   * @returns 命令输出
   */
  protected async executeShellCommand(command: string, args: string[] = [], options?: RunOptions): Promise<string> {
    const scope = getLogScope();

    if (!this._config) {
      throw new ExternalExecutableError('提供者未初始化');
    }

    try {
      const { cmd, args: resolvedArgs } = findExecutable(this._config.path, [command, ...args]);

      const runOptions: RunOptions = {
        cwd: this._config.cwd,
        env: { ...this._config.env },
        timeout: this._config.timeout || 30000,
        ...options
      };

      Logger.debug(scope, `执行 shell 命令: ${cmd} ${resolvedArgs.join(' ')}`);

      const result = await runSpawn(cmd, resolvedArgs, 'utf8', runOptions);

      // 处理stderr输出，确保类型安全
      if (result.stderr) {
        const stderrStr = typeof result.stderr === 'string' ? result.stderr : result.stderr.toString();
        if (stderrStr.trim()) {
          Logger.warn(scope, `命令标准错误输出: ${stderrStr}`);
        }
      }

      // 处理stdout输出，确保返回字符串类型
      const stdoutStr = typeof result.stdout === 'string' ? result.stdout : result.stdout.toString();
      return stdoutStr;
    } catch (ex) {
      Logger.error(ex, scope, `Shell 命令执行失败: ${command}`);
      throw new ExternalExecutableError(
        `Shell 命令执行失败: ${ex instanceof Error ? ex.message : String(ex)}`,
        'SHELL_COMMAND_ERROR',
        ex as Error
      );
    }
  }

  /**
   * 清理资源
   * 关闭通信通道
   */
  private cleanup(): void {
    if (this._channel) {
      void this._channel.close();
      this._channel = undefined;
    }
  }

  /**
   * 生成唯一ID
   * 用于请求标识
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
