import { existsSync } from 'node:fs';
import type { Disposable } from 'vscode';
import type { RunOptions } from '@/core/shell';
import { findExecutable, runSpawn } from '@/core/shell';
import { Platform, PlatformUtils } from '@/utils/platform';
import { ExecutableNotFoundError, ExternalExecutableError } from '../errors';
import {
  appendExternalRuntimeChunk,
  flushExternalRuntimeChunks,
  logExternalDebug,
  logExternalError,
  logExternalInfo
} from '../externalOutputChannel';
import type {
  ExecutableConfig,
  ExecutableProvider,
  ExecutableStatusInfo,
  ExternalExecutableResponse
} from '../types/protocol';
import { ExecutableStatus } from '../types/protocol';

/**
 * 本地可执行程序 Provider 基类。
 * 提供统一的初始化、状态管理与命令执行能力。
 */
export abstract class LocalExecutableProviderBase implements ExecutableProvider, Disposable {
  private _config: ExecutableConfig | undefined;
  private _status: ExecutableStatus = ExecutableStatus.Stopped;
  private _lastActivity: Date | undefined;

  abstract readonly name: string;
  abstract readonly version?: string;

  /**
   * 判断当前 Provider 是否支持运行。
   *
   * @returns 是否支持当前环境
   */
  get supported(): boolean {
    if (PlatformUtils.getCurrentPlatform() !== Platform.Windows) {
      return false;
    }
    return this._config?.path != null && existsSync(this._config.path);
  }

  /**
   * 获取当前 Provider 运行状态。
   *
   * @returns 状态信息
   */
  get status(): ExecutableStatusInfo {
    return {
      status: this._status,
      lastActivity: this._lastActivity
    };
  }

  /**
   * 初始化 Provider 配置。
   *
   * @param config 可执行程序配置
   */
  initialize(config: ExecutableConfig): void {
    if (!existsSync(config.path)) {
      throw new ExecutableNotFoundError(config.path);
    }

    this._config = { ...config };
    this._status = this._config.enabled ? ExecutableStatus.Running : ExecutableStatus.Stopped;
  }

  /**
   * 释放 Provider 资源。
   */
  dispose(): void {
    this._status = ExecutableStatus.Stopped;
  }

  /**
   * 执行外部命令。
   *
   * @param command 命令名称
   * @param args 命令参数
   * @param options 运行选项
   * @returns 命令执行结果
   */
  async execute(command: string, args?: string[], options?: RunOptions): Promise<ExternalExecutableResponse> {
    if (!this._config) {
      throw new ExternalExecutableError('提供者未初始化');
    }

    if (this._status !== ExecutableStatus.Running) {
      throw new ExternalExecutableError('提供者未运行');
    }

    const startedAt = Date.now();
    this._lastActivity = new Date();
    const finalArgs = [...(command ? [command] : []), ...(args ?? [])];

    logExternalDebug(`准备执行外部命令: ${this.name}`, {
      command: command,
      args: finalArgs,
      cwd: this._config.cwd
    });

    try {
      const { cmd, args: resolvedArgs } = findExecutable(this._config.path, finalArgs);
      const encoding = this._config.encoding ?? 'utf8';
      const result = await runSpawn(cmd, resolvedArgs, encoding, {
        cwd: options?.cwd ?? this._config.cwd,
        env: { ...this._config.env, ...(options?.env ?? {}) },
        timeout: options?.timeout ?? this._config.timeout ?? 120000,
        onStdoutData: (data) => {
          appendExternalRuntimeChunk(this.name, 'stdout', this.decodeOutputChunk(data, encoding));
        },
        onStderrData: (data) => {
          appendExternalRuntimeChunk(this.name, 'stderr', this.decodeOutputChunk(data, encoding));
        }
      });

      logExternalInfo(`外部命令执行完成: ${this.name}`, {
        command: command,
        executionTime: Date.now() - startedAt
      });

      return {
        id: this.generateId(),
        success: true,
        data: typeof result.stdout === 'string' ? result.stdout : result.stdout.toString(),
        executionTime: Date.now() - startedAt
      };
    } catch (ex) {
      logExternalError(`外部命令执行失败: ${this.name}`, { command: command, error: ex });
      throw new ExternalExecutableError(
        `执行外部程序失败: ${ex instanceof Error ? ex.message : String(ex)}`,
        'EXTERNAL_PROCESS_EXECUTE_FAILED',
        ex as Error
      );
    } finally {
      flushExternalRuntimeChunks(this.name);
    }
  }

  /**
   * 生成请求 ID。
   *
   * @returns 请求 ID
   */
  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * 将运行输出分片转换为字符串。
   *
   * @param chunk 原始输出分片
   * @param encoding 目标编码
   * @returns 解码后的字符串
   */
  private decodeOutputChunk(chunk: Buffer, encoding: string): string {
    if (encoding === 'utf8' || encoding === 'binary') {
      return chunk.toString(encoding);
    }
    return chunk.toString('utf8');
  }
}
