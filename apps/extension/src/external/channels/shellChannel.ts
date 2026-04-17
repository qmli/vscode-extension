import type { Disposable } from 'vscode';
import { Logger } from '@/core/logger';
import { getLogScope } from '@/core/logger.scope';
import type { RunOptions, RunResult } from '@/core/shell';
import { findExecutable, runSpawn } from '@/core/shell';
import { CommunicationError, ExecutableTimeoutError } from '../errors';
import type { CommunicationChannel, ExternalExecutableRequest, ExternalExecutableResponse } from '../types/protocol';

/**
 * 使用  shell 工具进行更好可执行文件处理的通信通道
 * 这种方法使用一次性命令执行而不是维护持久连接
 */
export class ShellChannel implements CommunicationChannel, Disposable {
  private _disposed = false;

  constructor(
    private readonly _executablePath: string,
    private readonly _args: string[] = [],
    private readonly _options: RunOptions = {},
    private readonly _requestTimeout: number = 30000
  ) {}

  dispose(): void {
    this._disposed = true;
  }

  async send(request: ExternalExecutableRequest): Promise<ExternalExecutableResponse> {
    const scope = getLogScope();

    if (this._disposed) {
      throw new CommunicationError('通道已被释放');
    }

    try {
      // 使用  shell 工具查找并执行命令
      const { cmd, args: resolvedArgs } = findExecutable(this._executablePath, [
        request.command,
        ...(request.args || []),
        ...this._args
      ]);

      // 准备命令参数 - 将请求作为 JSON 包含
      const requestJson = JSON.stringify(request);
      const commandArgs = [...resolvedArgs, requestJson];

      const runOptions: RunOptions = {
        ...this._options,
        timeout: request.options?.timeout ?? this._requestTimeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB 缓冲区
      };

      Logger.debug(scope, `执行 shell 命令: ${cmd}，请求 ID: ${request.id}`);

      // 使用 shell 工具执行命令
      const result: RunResult<string> = await runSpawn(cmd, commandArgs, 'utf8', runOptions);

      // 从 stdout 解析响应
      const response = this.parseResponse(result.stdout, request.id);

      if (result.stderr?.trim()) {
        Logger.warn(scope, `命令标准错误输出: ${result.stderr}`);
      }

      Logger.debug(scope, `命令完成: ${request.id} - 成功: ${response.success}`);
      return response;
    } catch (ex) {
      Logger.error(ex, scope, `命令执行失败: ${request.id}`);

      // 处理特定错误类型
      if (ex instanceof Error && ex.message.includes('timeout')) {
        throw new ExecutableTimeoutError(this._requestTimeout, request.command);
      }

      throw new CommunicationError(`命令执行失败: ${ex instanceof Error ? ex.message : String(ex)}`, ex as Error);
    }
  }

  close(): Promise<void> {
    const scope = getLogScope();
    Logger.debug(scope, '关闭基于 shell 的通道');
    this.dispose();
    return Promise.resolve();
  }

  isActive(): boolean {
    return !this._disposed;
  }

  private parseResponse(stdout: string, requestId: string): ExternalExecutableResponse {
    const scope = getLogScope();

    try {
      // 尝试解析为 JSON 响应
      const lines = stdout.split('\n').filter((line) => line.trim());

      // 查找看起来像 JSON 响应的行
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

      // 如果没有找到 JSON 响应，将输出作为数据处理
      Logger.warn(scope, `未找到请求 ${requestId} 的 JSON 响应，将 stdout 视为数据`);

      return {
        id: requestId,
        success: true,
        data: stdout.trim() || null
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
