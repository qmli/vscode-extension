/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Disposable } from 'vscode';
import { Logger } from '@orientais/vscode-core/logger';
import { getLogScope } from '@orientais/vscode-core/logger.scope';
import type { RunOptions } from '@orientais/vscode-core/shell';
import { SSHChannel } from '../channels/sshChannel';
import {
  ExecutableStartupError,
  ExecutableTimeoutError,
  ExternalExecutableError,
  SSHConfigurationError
} from '../errors';
import type {
  CommunicationChannel,
  ExecutableConfig,
  ExecutableProvider,
  ExecutableStatusInfo,
  ExternalExecutableResponse,
  SSHConfig
} from '../types/protocol';
import { ExecutableStatus } from '../types/protocol';

/**
 * 基于SSH的可执行程序提供者抽象类
 * 通过SSH连接到远程服务器执行命令
 */
export abstract class SSHBasedExecutableProvider implements ExecutableProvider, Disposable {
  private _config: ExecutableConfig | undefined;
  private _status: ExecutableStatus = ExecutableStatus.Stopped;
  private _channel: CommunicationChannel | undefined;
  private _lastActivity: Date | undefined;

  abstract readonly name: string;
  abstract readonly version?: string;

  /**
   * 检查提供者是否受支持
   * 通过验证SSH配置来判断
   */
  get supported(): boolean {
    return this._config?.ssh ? this.validateSSHConfig(this._config.ssh) : false;
  }

  /**
   * 获取当前状态信息
   * 包括状态和最后活动时间
   */
  get status(): ExecutableStatusInfo {
    const baseStatus: ExecutableStatusInfo = {
      status: this._status,
      lastActivity: this._lastActivity
    };

    // 如果有SSH通道，添加连接状态信息
    if (this._channel && 'getConnectionStatus' in this._channel) {
      const connectionStatus = (this._channel as any).getConnectionStatus();
      return {
        ...baseStatus,
        // 可以在这里添加SSH特定的状态信息
        error:
          connectionStatus.consecutiveFailures > 0
            ? new Error(`SSH连接失败次数: ${connectionStatus.consecutiveFailures}`)
            : undefined
      };
    }

    return baseStatus;
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

    // 检查连接类型
    if (config.connectionType !== 'remote') {
      throw new SSHConfigurationError('SSH提供者需要设置connectionType为remote');
    }

    // 检查SSH配置
    if (!config.ssh) {
      throw new SSHConfigurationError('SSH配置不能为空');
    }

    this.validateSSHConfig(config.ssh);

    this._config = { ...config };

    Logger.debug(
      scope,
      `已使用SSH配置初始化 ${this.name} 提供者: ${config.ssh.username}@${config.ssh.host}:${config.ssh.port || 22}`
    );
  }

  /**
   * 启动提供者
   * 创建SSH通信通道并执行健康检查
   */
  async start(): Promise<void> {
    const scope = getLogScope();

    if (!this._config?.ssh) {
      throw new ExternalExecutableError('SSH提供者未初始化');
    }

    if (this._status === ExecutableStatus.Running) {
      Logger.debug(scope, `${this.name} 已经在运行`);
      return;
    }

    this._status = ExecutableStatus.Starting;
    Logger.debug(
      scope,
      `启动SSH连接: ${this._config.ssh.username}@${this._config.ssh.host}:${this._config.ssh.port || 22}`
    );

    try {
      // 创建SSH通道
      this._channel = new SSHChannel(
        this._config.ssh,
        this._config.path,
        this._config.startupArgs || [],
        {
          cwd: this._config.cwd,
          env: { ...this._config.env }
        },
        this._config.timeout
      );

      // 测试SSH连接
      await this.waitForStartup();

      // 更新状态为运行中
      this._status = ExecutableStatus.Running;
      Logger.debug(scope, `${this.name} SSH连接启动成功`);
    } catch (ex) {
      this._status = ExecutableStatus.Error;
      this.cleanup();
      throw new ExecutableStartupError(`${this._config.ssh.host}:${this._config.ssh.port || 22}`, ex as Error);
    }
  }

  /**
   * 停止提供者
   * 关闭SSH通信通道并清理资源
   */
  async stop(): Promise<void> {
    const scope = getLogScope();

    if (this._status === ExecutableStatus.Stopped) {
      return;
    }

    this._status = ExecutableStatus.Stopping;
    Logger.debug(scope, `正在停止 ${this.name} SSH连接`);

    try {
      if (this._channel) {
        await this._channel.close();
      }
    } finally {
      this.cleanup();
      this._status = ExecutableStatus.Stopped;
      Logger.debug(scope, `${this.name} SSH连接已停止`);
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
      throw new ExternalExecutableError('SSH提供者未运行');
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
        throw new ExternalExecutableError(response.error.message, `SSH_COMMAND_ERROR_${response.error.code}`);
      }

      return response;
    } catch (ex) {
      if (ex instanceof ExecutableTimeoutError) {
        Logger.warn(scope, `SSH命令超时: ${command}`);
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
    Logger.log(scope, `正在重启 ${this.name} SSH连接`);

    await this.stop();
    await this.start();
  }

  /**
   * 等待启动完成，测试SSH连接确保其工作正常
   * 子类应该重写此方法以执行适当的健康检查
   */
  protected async waitForStartup(): Promise<void> {
    const scope = getLogScope();

    if (!this._channel) {
      throw new ExternalExecutableError('SSH通道未创建');
    }

    try {
      // 测试SSH连接
      if ('testConnection' in this._channel) {
        await (this._channel as any).testConnection();
      }

      // 尝试执行简单命令验证远程可执行文件
      await this.execute('--version');
    } catch (ex) {
      // 如果--version失败，尝试--help
      try {
        await this.execute('--help');
      } catch {
        // 如果都失败，只记录日志并继续 - 远程可执行文件可能有不同的约定
        Logger.debug(scope, `${this.name} SSH启动验证失败，但继续执行:`, ex);
      }
    }
  }

  /**
   * 验证SSH配置
   * @param sshConfig SSH配置
   * @returns 配置是否有效
   */
  private validateSSHConfig(sshConfig: SSHConfig): boolean {
    try {
      if (!sshConfig.host) {
        throw new SSHConfigurationError('SSH主机地址不能为空');
      }

      if (!sshConfig.username) {
        throw new SSHConfigurationError('SSH用户名不能为空');
      }

      if (sshConfig.port && (sshConfig.port < 1 || sshConfig.port > 65535)) {
        throw new SSHConfigurationError('SSH端口必须在1-65535范围内');
      }

      if (!sshConfig.privateKey && !sshConfig.password) {
        throw new SSHConfigurationError('必须提供SSH私钥或密码');
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理资源
   * 关闭SSH通信通道
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
