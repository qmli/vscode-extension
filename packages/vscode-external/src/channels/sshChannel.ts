import { existsSync } from 'fs';
import type { Disposable } from 'vscode';
import { Logger } from '@orientais/vscode-core/logger';
import { getLogScope } from '@orientais/vscode-core/logger.scope';
import type { RunOptions, RunResult } from '@orientais/vscode-core/shell';
import { runSpawn } from '@orientais/vscode-core/shell';
import type { SSHClientInfo } from '../_utils/sshClientDetector';
import { SSHClientDetector } from '../_utils/sshClientDetector';
import { SSHCommandBuilder } from '../_utils/sshCommandBuilder';
import {
  CommunicationError,
  ExecutableTimeoutError,
  SSHAuthenticationError,
  SSHCommandExecutionError,
  SSHConfigurationError,
  SSHConnectionError,
  SSHExecutableNotFoundError,
  SSHKeyNotFoundError
} from '../errors';
import type {
  CommunicationChannel,
  ExternalExecutableRequest,
  ExternalExecutableResponse,
  SSHConfig
} from '../types/protocol';

/**
 * SSH通信通道
 * 通过SSH连接到远程服务器执行命令
 */
export class SSHChannel implements CommunicationChannel, Disposable {
  private _disposed = false;
  private _connectionTested = false;
  private _lastConnectionTest: Date | undefined;
  private _consecutiveFailures = 0;
  private readonly _maxRetries: number;
  private _sshClient: SSHClientInfo | null = null;

  constructor(
    private readonly _sshConfig: SSHConfig,
    private readonly _executablePath: string,
    private readonly _args: string[] = [],
    private readonly _options: RunOptions = {},
    private readonly _requestTimeout: number = 30000
  ) {
    this._maxRetries = this._sshConfig.retryAttempts || 3;
    this.validateSSHConfig();
    // 异步初始化SSH客户端
    void this.initializeSSHClient();
  }

  dispose(): void {
    this._disposed = true;
  }

  /**
   * 初始化SSH客户端
   */
  private async initializeSSHClient(): Promise<void> {
    const scope = getLogScope();

    try {
      this._sshClient = await SSHClientDetector.getBestSSHClient();

      if (!this._sshClient) {
        Logger.warn(scope, '未找到可用的SSH客户端');
        throw new SSHConfigurationError('未找到可用的SSH客户端，请安装OpenSSH或PuTTY');
      }

      Logger.debug(scope, `使用SSH客户端: ${this._sshClient.type} at ${this._sshClient.path}`);

      // 验证跨平台配置
      const validation = SSHCommandBuilder.validateCrossPlatformConfig(this._sshConfig, this._sshClient.type);

      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          Logger.warn(scope, `SSH配置警告: ${warning}`);
        }
      }

      if (validation.suggestions.length > 0) {
        for (const suggestion of validation.suggestions) {
          Logger.debug(scope, `SSH配置建议: ${suggestion}`);
        }
      }
    } catch (ex) {
      Logger.error(ex, scope, 'SSH客户端初始化失败');
      throw ex;
    }
  }

  async send(request: ExternalExecutableRequest): Promise<ExternalExecutableResponse> {
    if (this._disposed) {
      throw new CommunicationError('SSH通道已被释放');
    }

    // 确保SSH客户端已初始化
    if (!this._sshClient) {
      await this.initializeSSHClient();
    }

    return this.executeWithRetry(request, 0);
  }

  /**
   * 带重试机制的执行方法
   * @param request 执行请求
   * @param attemptCount 当前尝试次数
   * @returns 执行结果
   */
  private async executeWithRetry(
    request: ExternalExecutableRequest,
    attemptCount: number
  ): Promise<ExternalExecutableResponse> {
    const scope = getLogScope();

    try {
      // 确保SSH客户端已初始化
      if (!this._sshClient) {
        throw new SSHConfigurationError('SSH客户端未初始化');
      }

      // 构建跨平台SSH命令参数
      const remoteCommand = this.buildRemoteCommand(request);
      const sshArgs = SSHCommandBuilder.buildSSHArgs({
        client: this._sshClient,
        config: this._sshConfig,
        remoteCommand: remoteCommand,
        batchMode: true
      });

      const runOptions: RunOptions = {
        ...this._options,
        timeout: request.options?.timeout ?? this._requestTimeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB 缓冲区
        // 设置工作目录（如果指定）
        cwd: request.options?.cwd || this._options.cwd,
        // 合并环境变量
        env: { ...this._options.env, ...request.options?.env }
      };

      Logger.debug(
        scope,
        `执行SSH命令 (尝试 ${attemptCount + 1}/${this._maxRetries + 1}): ${this._sshClient.path} ${sshArgs.join(' ')}，请求ID: ${request.id}`
      );

      // 使用检测到的SSH客户端执行命令
      const result: RunResult<string> = await runSpawn(this._sshClient.path, sshArgs, 'utf8', runOptions);

      // 解析响应
      const response = this.parseResponse(result.stdout, request.id);

      if (result.stderr?.trim()) {
        Logger.warn(scope, `SSH命令标准错误输出: ${result.stderr}`);
      }

      // 重置连续失败计数
      this._consecutiveFailures = 0;

      Logger.debug(scope, `SSH命令完成: ${request.id} - 成功: ${response.success}`);
      return response;
    } catch (ex) {
      this._consecutiveFailures++;
      Logger.error(ex, scope, `SSH命令执行失败 (尝试 ${attemptCount + 1}/${this._maxRetries + 1}): ${request.id}`);

      // 判断是否应该重试
      if (attemptCount < this._maxRetries && this.shouldRetry(ex)) {
        const retryDelay = this._sshConfig.retryDelay || 1000;
        Logger.debug(scope, `${retryDelay}ms 后重试SSH命令: ${request.id}`);

        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return this.executeWithRetry(request, attemptCount + 1);
      }

      // 处理特定错误类型
      throw this.categorizeError(ex, request.command);
    }
  }

  /**
   * 判断错误是否应该重试
   * @param error 错误对象
   * @returns 是否应该重试
   */
  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const errorMsg = error.message.toLowerCase();

    // 网络相关错误应该重试
    if (
      errorMsg.includes('connection refused') ||
      errorMsg.includes('no route to host') ||
      errorMsg.includes('network is unreachable') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('timed out')
    ) {
      return true;
    }

    // 认证错误不应该重试
    if (
      errorMsg.includes('permission denied') ||
      errorMsg.includes('authentication failed') ||
      errorMsg.includes('publickey') ||
      errorMsg.includes('password')
    ) {
      return false;
    }

    // 可执行文件不存在错误不应该重试
    if (errorMsg.includes('no such file or directory') && errorMsg.includes(this._executablePath)) {
      return false;
    }

    // 其他错误可以重试
    return true;
  }

  /**
   * 将错误分类为特定的错误类型
   * @param error 原始错误
   * @param command 执行的命令
   * @returns 分类后的错误
   */
  private categorizeError(error: unknown, command: string): Error {
    if (!(error instanceof Error)) {
      return new CommunicationError(`SSH命令执行失败: ${String(error)}`, error as Error);
    }

    const errorMsg = error.message.toLowerCase();

    if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
      return new ExecutableTimeoutError(this._requestTimeout, command);
    }

    if (
      errorMsg.includes('connection refused') ||
      errorMsg.includes('no route to host') ||
      errorMsg.includes('network is unreachable') ||
      errorMsg.includes('host key verification failed')
    ) {
      return new SSHConnectionError(this._sshConfig.host, this._sshConfig.port || 22, error);
    }

    if (
      errorMsg.includes('permission denied') ||
      errorMsg.includes('authentication failed') ||
      errorMsg.includes('publickey') ||
      errorMsg.includes('password')
    ) {
      return new SSHAuthenticationError(this._sshConfig.host, this._sshConfig.username, error);
    }

    // 区分可执行文件不存在和命令不存在
    if (errorMsg.includes('no such file or directory') && errorMsg.includes(this._executablePath)) {
      return new SSHExecutableNotFoundError(this._executablePath, this._sshConfig.host);
    }

    if (errorMsg.includes('command not found') || errorMsg.includes('not found')) {
      return new SSHCommandExecutionError(command, this._sshConfig.host, error);
    }

    return new CommunicationError(`SSH命令执行失败: ${error.message}`, error);
  }

  close(): Promise<void> {
    const scope = getLogScope();
    Logger.debug(scope, '关闭SSH通道');
    this.dispose();
    return Promise.resolve();
  }

  isActive(): boolean {
    return !this._disposed;
  }

  /**
   * 获取SSH连接状态信息
   * @returns 连接状态信息
   */
  getConnectionStatus(): {
    isConnected: boolean;
    lastTest?: Date;
    consecutiveFailures: number;
    host: string;
    port: number;
    username: string;
    sshClient?: {
      type: string;
      path: string;
      version?: string;
    };
    platform: string;
  } {
    return {
      isConnected: this._connectionTested,
      lastTest: this._lastConnectionTest,
      consecutiveFailures: this._consecutiveFailures,
      host: this._sshConfig.host,
      port: this._sshConfig.port || 22,
      username: this._sshConfig.username,
      sshClient: this._sshClient
        ? {
            type: this._sshClient.type,
            path: this._sshClient.path,
            version: this._sshClient.version
          }
        : undefined,
      platform: 'cross-platform'
    };
  }

  /**
   * 验证SSH连接
   * 测试SSH连接是否可用
   */
  async testConnection(): Promise<boolean> {
    const scope = getLogScope();

    // 如果最近测试过且成功，直接返回
    if (this._connectionTested && this._lastConnectionTest) {
      const timeSinceLastTest = Date.now() - this._lastConnectionTest.getTime();
      if (timeSinceLastTest < 60000) {
        // 1分钟内不重复测试
        return true;
      }
    }

    try {
      // 确保SSH客户端已初始化
      if (!this._sshClient) {
        await this.initializeSSHClient();
      }

      if (!this._sshClient) {
        throw new SSHConfigurationError('SSH客户端未初始化');
      }

      Logger.debug(
        scope,
        `测试SSH连接到 ${this._sshConfig.username}@${this._sshConfig.host}:${this._sshConfig.port || 22}`
      );

      // 构建测试命令
      const testRequest = {
        id: 'connection-test',
        command: 'echo',
        args: ['SSH连接测试成功']
      };

      const remoteCommand = this.buildRemoteCommand(testRequest);
      const testArgs = SSHCommandBuilder.buildSSHArgs({
        client: this._sshClient,
        config: this._sshConfig,
        remoteCommand: remoteCommand,
        batchMode: true
      });

      const runOptions: RunOptions = {
        timeout: this._sshConfig.connectTimeout || 30000,
        maxBuffer: 1024
      };

      const result: RunResult<string> = await runSpawn(this._sshClient.path, testArgs, 'utf8', runOptions);

      if (result.stdout.includes('SSH连接测试成功')) {
        this._connectionTested = true;
        this._lastConnectionTest = new Date();
        this._consecutiveFailures = 0;
        Logger.debug(scope, 'SSH连接测试成功');
        return true;
      }
      Logger.warn(scope, 'SSH连接测试失败：未收到预期响应');
      this._connectionTested = false;
      return false;
    } catch (ex) {
      Logger.error(ex, scope, 'SSH连接测试失败');
      throw new SSHConnectionError(this._sshConfig.host, this._sshConfig.port || 22, ex as Error);
    }
  }

  /**
   * 构建远程执行命令
   * @param request 执行请求
   * @returns 远程命令字符串
   */
  private buildRemoteCommand(request: ExternalExecutableRequest): string {
    const cmdParts: string[] = [this._executablePath];

    // 添加主命令
    if (request.command) {
      cmdParts.push(this.escapeShellArg(request.command));
    }

    // 添加参数
    if (request.args && request.args.length > 0) {
      cmdParts.push(...request.args.map((arg) => this.escapeShellArg(arg)));
    }

    // 添加启动参数
    if (this._args && this._args.length > 0) {
      cmdParts.push(...this._args.map((arg) => this.escapeShellArg(arg)));
    }

    return cmdParts.join(' ');
  }

  /**
   * 转义shell参数
   * @param arg 参数
   * @returns 转义后的参数
   */
  private escapeShellArg(arg: string): string {
    // 如果参数包含空格、特殊字符，则用单引号包围
    if (/[\s'"\\$`!*?[\]{}();|&<>]/.test(arg)) {
      return `'${arg.replace(/'/g, "'\"'\"'")}'`;
    }
    return arg;
  }

  /**
   * 验证SSH配置
   */
  private validateSSHConfig(): void {
    if (!this._sshConfig.host || this._sshConfig.host.trim() === '') {
      throw new SSHConfigurationError('SSH主机地址不能为空');
    }

    if (!this._sshConfig.username || this._sshConfig.username.trim() === '') {
      throw new SSHConfigurationError('SSH用户名不能为空');
    }

    if (this._sshConfig.port && (this._sshConfig.port < 1 || this._sshConfig.port > 65535)) {
      throw new SSHConfigurationError('SSH端口必须在1-65535范围内');
    }

    // 验证主机地址格式
    if (!/^[a-zA-Z0-9.-]+$/.test(this._sshConfig.host)) {
      throw new SSHConfigurationError('SSH主机地址格式无效');
    }

    // 验证私钥文件
    if (this._sshConfig.privateKey) {
      // 处理用户主目录路径
      const expandedKeyPath = SSHCommandBuilder.expandUserPath(this._sshConfig.privateKey);

      if (!existsSync(expandedKeyPath)) {
        throw new SSHKeyNotFoundError(this._sshConfig.privateKey);
      }

      // 注意：在生产环境中应检查私钥文件权限（建议设置为600）
      Logger.debug(getLogScope(), `SSH私钥文件路径: ${expandedKeyPath}`);
    }

    if (!this._sshConfig.privateKey && !this._sshConfig.password) {
      throw new SSHConfigurationError('必须提供SSH私钥或密码');
    }

    // 验证超时设置
    if (this._sshConfig.connectTimeout && this._sshConfig.connectTimeout < 1000) {
      throw new SSHConfigurationError('SSH连接超时时间不能少于1秒');
    }

    if (this._sshConfig.keepAlive && this._sshConfig.keepAlive < 10000) {
      throw new SSHConfigurationError('SSH保持连接时间不能少于10秒');
    }
  }

  /**
   * 解析SSH命令响应
   * @param stdout 标准输出
   * @param requestId 请求ID
   * @returns 解析后的响应
   */
  private parseResponse(stdout: string, requestId: string): ExternalExecutableResponse {
    const scope = getLogScope();

    try {
      // 尝试解析为JSON响应
      const lines = stdout.split('\n').filter((line) => line.trim());

      // 查找看起来像JSON响应的行
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === requestId) {
            return parsed as ExternalExecutableResponse;
          }
        } catch {
          // 继续查找
        }
      }

      // 如果没有找到JSON响应，将输出作为数据处理
      Logger.warn(scope, `未找到请求 ${requestId} 的JSON响应，将stdout视为数据`);

      return {
        id: requestId,
        success: true,
        data: stdout.trim() || undefined
      };
    } catch (ex) {
      Logger.error(scope, `解析请求 ${requestId} 的响应失败:`, stdout, ex);

      return {
        id: requestId,
        success: false,
        error: {
          code: 500,
          message: `解析响应失败: ${ex instanceof Error ? ex.message : String(ex)}`
        }
      };
    }
  }
}
