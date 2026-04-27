import { Logger } from '@orientais/vscode-core/logger';
import { getLogScope } from '@orientais/vscode-core/logger.scope';
import type { RunOptions } from '@orientais/vscode-core/shell';
import type { SSHConfig } from '../types/protocol';
import { SSHChannel } from './sshChannel';

/**
 * SSH连接池配置
 */
interface SSHConnectionPoolConfig {
  /** 最大连接数 */
  maxConnections?: number;
  /** 连接空闲超时时间（毫秒） */
  idleTimeout?: number;
  /** 连接最大生存时间（毫秒） */
  maxLifetime?: number;
}

/**
 * 连接池中的连接信息
 */
interface PooledConnection {
  /** SSH通道 */
  channel: SSHChannel;
  /** 创建时间 */
  createdAt: Date;
  /** 最后使用时间 */
  lastUsedAt: Date;
  /** 是否正在使用 */
  inUse: boolean;
  /** 连接ID */
  id: string;
}

/**
 * SSH连接池
 * 管理和复用SSH连接，提高性能
 */
export class SSHConnectionPool {
  private readonly _connections = new Map<string, PooledConnection>();
  private readonly _config: SSHConnectionPoolConfig;
  private _disposed = false;
  private _cleanupTimer: NodeJS.Timeout | undefined;

  constructor(config: SSHConnectionPoolConfig = {}) {
    this._config = {
      maxConnections: config.maxConnections || 5,
      idleTimeout: config.idleTimeout || 300000, // 5分钟
      maxLifetime: config.maxLifetime || 3600000 // 1小时
    };

    // 启动清理定时器
    this._cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取或创建SSH连接
   * @param sshConfig SSH配置
   * @param executablePath 可执行文件路径
   * @param args 参数
   * @param options 运行选项
   * @param requestTimeout 请求超时
   * @returns SSH通道
   */
  async getConnection(
    sshConfig: SSHConfig,
    executablePath: string,
    args: string[] = [],
    options: RunOptions = {},
    requestTimeout: number = 30000
  ): Promise<SSHChannel> {
    const scope = getLogScope();

    if (this._disposed) {
      throw new Error('SSH连接池已被释放');
    }

    const connectionKey = this.generateConnectionKey(sshConfig, executablePath);

    // 查找可用的现有连接
    const existingConnection = this._connections.get(connectionKey);
    if (existingConnection && !existingConnection.inUse && this.isConnectionValid(existingConnection)) {
      existingConnection.inUse = true;
      existingConnection.lastUsedAt = new Date();
      Logger.debug(scope, `复用SSH连接: ${connectionKey}`);
      return existingConnection.channel;
    }

    // 检查连接数限制
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (this._connections.size >= this._config.maxConnections!) {
      // 尝试清理空闲连接
      await this.cleanup();

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (this._connections.size >= this._config.maxConnections!) {
        throw new Error(`SSH连接池已满，最大连接数: ${this._config.maxConnections}`);
      }
    }

    // 创建新连接
    Logger.debug(scope, `创建新SSH连接: ${connectionKey}`);
    const channel = new SSHChannel(sshConfig, executablePath, args, options, requestTimeout);

    const connection: PooledConnection = {
      channel: channel,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      inUse: true,
      id: this.generateConnectionId()
    };

    this._connections.set(connectionKey, connection);
    return channel;
  }

  /**
   * 释放SSH连接
   * @param sshConfig SSH配置
   * @param executablePath 可执行文件路径
   */
  releaseConnection(sshConfig: SSHConfig, executablePath: string): void {
    const connectionKey = this.generateConnectionKey(sshConfig, executablePath);
    const connection = this._connections.get(connectionKey);

    if (connection) {
      connection.inUse = false;
      connection.lastUsedAt = new Date();
      Logger.debug(getLogScope(), `释放SSH连接: ${connectionKey}`);
    }
  }

  /**
   * 获取连接池状态
   * @returns 连接池状态信息
   */
  getPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
    connections: Array<{
      id: string;
      host: string;
      inUse: boolean;
      createdAt: Date;
      lastUsedAt: Date;
    }>;
  } {
    const connections = Array.from(this._connections.values());
    const activeConnections = connections.filter((conn) => conn.inUse).length;
    const idleConnections = connections.filter((conn) => !conn.inUse).length;

    return {
      totalConnections: this._connections.size,
      activeConnections: activeConnections,
      idleConnections: idleConnections,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      maxConnections: this._config.maxConnections!,
      connections: connections.map((conn) => {
        const status = conn.channel.getConnectionStatus();
        return {
          id: conn.id,
          host: status.host,
          inUse: conn.inUse,
          createdAt: conn.createdAt,
          lastUsedAt: conn.lastUsedAt
        };
      })
    };
  }

  /**
   * 清理过期和空闲的连接
   */
  private async cleanup(): Promise<void> {
    const scope = getLogScope();
    const now = new Date();
    const connectionsToRemove: string[] = [];

    for (const [key, connection] of this._connections.entries()) {
      const age = now.getTime() - connection.createdAt.getTime();
      const idleTime = now.getTime() - connection.lastUsedAt.getTime();

      // 检查是否超过最大生存时间
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (age > this._config.maxLifetime!) {
        connectionsToRemove.push(key);
        Logger.debug(scope, `SSH连接超过最大生存时间，将被清理: ${key}`);
        continue;
      }

      // 检查是否空闲超时
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (!connection.inUse && idleTime > this._config.idleTimeout!) {
        connectionsToRemove.push(key);
        Logger.debug(scope, `SSH连接空闲超时，将被清理: ${key}`);
        continue;
      }
    }

    // 清理过期连接
    for (const key of connectionsToRemove) {
      const connection = this._connections.get(key);
      if (connection) {
        try {
          await connection.channel.close();
        } catch (ex) {
          Logger.warn(scope, `关闭SSH连接时出错: ${key}`, ex);
        }
        this._connections.delete(key);
      }
    }

    if (connectionsToRemove.length > 0) {
      Logger.debug(scope, `SSH连接池清理完成，清理了 ${connectionsToRemove.length} 个连接`);
    }
  }

  /**
   * 检查连接是否有效
   * @param connection 连接信息
   * @returns 连接是否有效
   */
  private isConnectionValid(connection: PooledConnection): boolean {
    const now = new Date();
    const age = now.getTime() - connection.createdAt.getTime();
    const idleTime = now.getTime() - connection.lastUsedAt.getTime();

    // 检查连接是否过期
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (age > this._config.maxLifetime!) {
      return false;
    }

    // 检查是否空闲太久
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (idleTime > this._config.idleTimeout!) {
      return false;
    }

    // 检查通道是否活跃
    return connection.channel.isActive();
  }

  /**
   * 生成连接键
   * @param sshConfig SSH配置
   * @param executablePath 可执行文件路径
   * @returns 连接键
   */
  private generateConnectionKey(sshConfig: SSHConfig, executablePath: string): string {
    const host = sshConfig.host;
    const port = sshConfig.port || 22;
    const username = sshConfig.username;
    return `${username}@${host}:${port}#${executablePath}`;
  }

  /**
   * 生成连接ID
   * @returns 唯一连接ID
   */
  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  /**
   * 释放连接池资源
   */
  async dispose(): Promise<void> {
    const scope = getLogScope();
    this._disposed = true;

    // 清理定时器
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = undefined;
    }

    // 关闭所有连接
    const closePromises: Promise<void>[] = [];
    for (const connection of this._connections.values()) {
      closePromises.push(connection.channel.close());
    }

    try {
      await Promise.all(closePromises);
      Logger.debug(scope, `SSH连接池已释放，关闭了 ${this._connections.size} 个连接`);
    } catch (ex) {
      Logger.warn(scope, 'SSH连接池释放时出现错误:', ex);
    }

    this._connections.clear();
  }
}
