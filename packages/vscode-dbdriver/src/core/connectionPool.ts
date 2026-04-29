import { Database } from '@journeyapps/sqlcipher';
import path from 'path';
import * as fs from 'fs';
import { ConnectionConfig } from '../types';
import { formatError, retry } from '../utils';

/**
 * 数据库连接包装器
 * 封装数据库连接实例，提供连接状态管理和生命周期控制
 */
class DatabaseConnection {
  /** 数据库连接实例 */
  private _db: Database;
  /** 是否为只读连接 */
  private _isReadOnly: boolean;
  /** 最后使用时间戳（毫秒） */
  private _lastUsed: number;
  /** 连接是否正在使用中 */
  private _inUse: boolean = false;

  /**
   * 构造函数
   * @param db 数据库连接实例
   * @param isReadOnly 是否为只读连接，默认为 false
   */
  constructor(db: Database, isReadOnly: boolean = false) {
    this._db = db;
    this._isReadOnly = isReadOnly;
    this._lastUsed = Date.now();
  }

  /**
   * 获取数据库连接实例
   * 访问时会自动更新最后使用时间
   * @returns 数据库连接实例
   */
  get database(): Database {
    this._lastUsed = Date.now();
    return this._db;
  }

  /**
   * 获取连接是否为只读
   * @returns 是否为只读连接
   */
  get isReadOnly(): boolean {
    return this._isReadOnly;
  }

  /**
   * 获取最后使用时间戳
   * @returns 最后使用时间戳（毫秒）
   */
  get lastUsed(): number {
    return this._lastUsed;
  }

  /**
   * 获取连接使用状态
   * @returns 连接是否正在使用中
   */
  get inUse(): boolean {
    return this._inUse;
  }

  /**
   * 设置连接使用状态
   * 当设置为使用中时，会自动更新最后使用时间
   * @param value 连接使用状态
   */
  set inUse(value: boolean) {
    this._inUse = value;
    if (value) {
      this._lastUsed = Date.now();
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    try {
      this._db.close((err) => {
        if (err) {
          console.error('Failed to close database connection:', err);
        }
      });
    } catch (err) {
      console.error('Failed to close database connection:', err);
    }
  }

  /**
   * 验证连接是否有效
   * 通过执行简单的查询语句来检测连接状态
   * @returns 连接是否有效
   */
  isValid(): boolean {
    try {
      // 简单的心跳检测
      this._db.prepare('SELECT 1').get().finalize();
      return true;
    } catch (error) {
      console.error(`Connection validation failed: ${formatError(error)}`);
      return false;
    }
  }
}

/**
 * 数据库连接池
 * 实现读写分离，支持连接复用和自动清理
 *
 * 特性：
 * - 读写分离：写操作使用专用写连接，读操作使用读连接池
 * - 连接复用：多个读操作可以并发使用不同的读连接
 * - 自动清理：定期清理无效或空闲的连接
 * - 连接验证：自动检测并重建无效连接
 */
export class ConnectionPool {
  /** 连接池配置信息 */
  private _config: Required<ConnectionConfig>;
  /** 写连接（单例，用于所有写操作） */
  private _writeConnection: DatabaseConnection | null = null;
  /** 读连接池（多个读连接，支持并发读取） */
  private _readConnections: DatabaseConnection[] = [];
  /** 连接池唯一标识符 */
  private _connectionKey: string;
  /** 连接池是否正在关闭中 */
  private _isClosing = false;
  // 添加一个标志，记录数据库是否已初始化
  //private _databaseInitialized = false;

  /**
   * 构造函数
   * @param config 数据库连接配置
   * @param connectionKey 可选的连接池唯一标识，如果不提供则根据存储路径和数据库名自动生成
   */
  constructor(config: ConnectionConfig, connectionKey?: string) {
    this._config = {
      storage: config.storage,
      database: config.database,
      password: config.password || '',
      enableWAL: config.enableWAL ?? true,
      pool: {
        maxConnections: config.pool?.maxConnections ?? 10,
        readerConnections: config.pool?.readerConnections ?? 5,
        ...config.pool
      }
    };

    this._connectionKey =
      connectionKey || Buffer.from(`${this._config.storage}:${this._config.database}`).toString('base64');

    this._initializeConnections();
    this._startCleanupTimer();
  }

  /**
   * 获取连接池唯一标识
   */
  public get connectionKey(): string {
    return this._connectionKey;
  }

  /**
   * 获取数据库文件完整路径
   */
  private get _dbPath(): string {
    return path.resolve(this._config.storage, this._config.database);
  }

  /**
   * 初始化连接
   * 创建写连接和读连接池
   * @throws 如果初始化失败会抛出错误
   */
  private _initializeConnections(): void {
    try {
      // 确保存储目录存在
      fs.mkdirSync(this._config.storage, { recursive: true });

      // 创建写连接
      this._writeConnection = this._createConnection(false);

      // 创建读连接池
      const readerConnections = this._config.pool?.readerConnections ?? 5;
      for (let i = 0; i < readerConnections; i++) {
        const readConnection = this._createConnection(true);
        this._readConnections.push(readConnection);
      }
    } catch (err) {
      throw new Error(`Failed to initialize database connections: ${formatError(err)}`);
    }
  }

  /**
   * 创建单个数据库连接
   * @param isReadOnly 是否为只读连接，默认为 false
   * @returns 数据库连接包装器实例
   * @throws 如果创建连接失败会抛出错误
   */
  private _createConnection(isReadOnly: boolean = false): DatabaseConnection {
    try {
      const options: { readonly?: boolean } = {};
      if (isReadOnly) {
        options.readonly = true;
      }

      const db = new Database(this._dbPath, (err) => {
        if (err) {
          console.error('Failed to open database:', err);
        } else {
          console.log('Database opened or created at', this._dbPath);
        }
      });
      const connection = new DatabaseConnection(db, isReadOnly);

      // 配置连接
      this._configureConnection(connection.database, isReadOnly);

      return connection;
    } catch (err) {
      throw new Error(`Failed to create database connection: ${formatError(err)}`);
    }
  }

  /**
   * 配置数据库连接参数
   * 安全地设置 SQLite 的 PRAGMA 参数，包括加密、WAL 模式等
   *
   * 注意：
   * - PRAGMA 语句不需要事务包装，直接执行即可
   * - 某些 PRAGMA（如 page_size）只能在数据库为空时设置
   * - 使用 prepare 语句减少 exec 调用，提高性能
   *
   * @param db 数据库连接实例
   * @param isReadOnly 是否为只读连接
   * @throws 如果配置失败会抛出错误
   */

  private _configureConnection(db: Database, isReadOnly: boolean = false): void {
    try {
      db.serialize(() => {
        const dbExists = this._databaseFileExists();

        // ========== 加密配置（每个连接都必须设置）==========
        if (this._config.password && !isReadOnly) {
          // 只有在数据库为空或者是新数据库时才设置加密
          // 如果数据库已存在，先尝试验证是否已加密
          if (!dbExists) {
            // 新数据库或空数据库，设置加密
            db.prepare('PRAGMA cipher_compatibility = 3').run().finalize();
            /* 有内存溢出，后面排查
            const escapedPassword = this._config.password.replace(/'/g, "''");
            db.prepare(`PRAGMA key = '${escapedPassword}'`).run();*/
            db.prepare('PRAGMA kdf_iter = 4000').run().finalize();
          } else {
            // 数据库已存在，尝试使用密码打开（如果已加密）
            try {
              // const escapedPassword = this._config.password.replace(/'/g, "''");
              // db.prepare(`PRAGMA key = '${escapedPassword}'`).run();
            } catch (encryptError) {
              // 如果设置密码失败，可能是数据库未加密或密码错误
              console.warn(`Failed to set encryption key: ${formatError(encryptError)}`);
              // 如果数据库未加密，可以选择不设置密码或抛出错误
              // 这里选择不设置，避免损坏现有数据库
            }
          }
        }

        // 只读连接跳过写相关配置
        if (isReadOnly) {
          return;
        }

        // ========== 连接级别的配置（每个连接都需要）==========
        if (this._config.enableWAL) {
          db.prepare('PRAGMA journal_mode = WAL').run().finalize();
          db.prepare('PRAGMA synchronous = NORMAL').run().finalize();
          db.prepare('PRAGMA cache_size = -20000').run().finalize();
          db.prepare('PRAGMA temp_store = MEMORY').run().finalize();
          db.prepare('PRAGMA mmap_size = 268435456').run().finalize();
        } else {
          this._configureNonWALMode(db);
        }

        // PRAGMA optimize 可以定期执行，但不需要每个连接都执行
        // 可以考虑移除或改为定期执行
      });
    } catch (err) {
      throw new Error(`Failed to configure database: ${formatError(err)}`);
    }
  }
  /**
   * 检查数据库文件是否存在
   * @returns 数据库文件是否存在
   */
  private _databaseFileExists(): boolean {
    try {
      return fs.existsSync(this._dbPath);
    } catch {
      return false;
    }
  }

  /**
   * 配置非 WAL 模式的数据库参数
   * @param db 数据库连接实例
   * @param isDatabaseEmpty 数据库是否为空
   */
  private _configureNonWALMode(db: Database): void {
    // PRAGMA synchronous: 设置同步模式为 FULL
    // FULL 模式确保数据完全写入磁盘，提供最高数据安全性
    db.prepare('PRAGMA synchronous = FULL').run().finalize();

    // PRAGMA cache_size: 设置页面缓存大小（负值表示 KB）
    // -20000 表示 20MB 缓存，非 WAL 模式使用较小的缓存
    db.prepare('PRAGMA cache_size = -20000').run().finalize();

    // PRAGMA temp_store: 将临时数据存储在内存中
    // MEMORY 模式提高临时表操作性能
    db.prepare('PRAGMA temp_store = MEMORY').run().finalize();

    // PRAGMA page_size: 设置数据库页面大小（只能在数据库为空时设置）
    db.prepare('PRAGMA page_size = 8192').run().finalize();
  }

  /*
   * 检查数据库是否为空
   * 通过查询 sqlite_master 表来判断数据库是否包含任何表
   * @param db 数据库连接实例
   * @returns 数据库是否为空

  private _isDatabaseEmpty(db: Database): Promise<boolean> {
    try {
      const result = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");

      return new Promise((resolve, reject) => {
        result.get((err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve((row.count as number) >= 0);
          }
        });
      });
    } catch {
      // 如果查询失败，假设数据库不为空（更安全的默认值）
      return Promise.resolve(false);
    }
  } */

  /**
   * 获取写连接
   * 如果连接不存在或无效，会自动重新创建
   * @returns 数据库连接实例
   * @throws 如果连接池正在关闭会抛出错误
   */
  public getWriteConnection(): Database {
    if (this._isClosing) {
      throw new Error('Connection pool is closing');
    }

    if (!this._writeConnection || !this._writeConnection.isValid()) {
      this._writeConnection?.close();
      this._writeConnection = this._createConnection(false);
    }

    this._writeConnection.inUse = true;
    return this._writeConnection.database;
  }

  /**
   * 获取读连接
   * 优先返回空闲且有效的连接，如果没有则返回最久未使用的连接
   * 如果连接无效会自动重建
   * @returns 数据库连接实例
   * @throws 如果连接池正在关闭会抛出错误
   */
  public getReadConnection(): Database {
    if (this._isClosing) {
      throw new Error('Connection pool is closing');
    }

    // 寻找可用的读连接
    let availableConnection = this._readConnections.find((conn) => !conn.inUse && conn.isValid());

    if (!availableConnection) {
      // 如果没有可用连接，寻找最久未使用的连接
      availableConnection = this._readConnections.reduce((oldest, current) =>
        current.lastUsed < oldest.lastUsed ? current : oldest
      );

      // 如果连接无效，重新创建
      if (!availableConnection.isValid()) {
        availableConnection.close();
        const index = this._readConnections.indexOf(availableConnection);
        this._readConnections[index] = this._createConnection(true);
        availableConnection = this._readConnections[index];
      }
    }

    availableConnection.inUse = true;
    return availableConnection.database;
  }

  /**
   * 释放连接
   * 将连接标记为未使用状态，使其可以被其他操作复用
   * @param db 要释放的数据库连接实例
   */
  public releaseConnection(db: Database): void {
    // 释放写连接
    if (this._writeConnection && this._writeConnection.database === db) {
      this._writeConnection.inUse = false;
      return;
    }

    // 释放读连接
    const readConnection = this._readConnections.find((conn) => conn.database === db);
    if (readConnection) {
      readConnection.inUse = false;
    }
  }

  /**
   * 执行带重试的数据库操作
   * 自动处理连接获取和错误重试
   * @param operation 要执行的数据库操作函数
   * @param isWrite 是否为写操作，默认为 false（读操作）
   * @param maxRetries 最大重试次数，默认为 3
   * @returns 操作结果
   * @template T 操作返回值的类型
   */
  public async withRetry<T>(
    operation: (db: Database) => T | Promise<T>,
    isWrite: boolean = false,
    maxRetries: number = 3
  ): Promise<T> {
    return await retry<T>(async () => {
      const db = isWrite ? this.getWriteConnection() : this.getReadConnection();
      try {
        const result = await operation(db);
        // 如果是写操作，确保 WAL 文件被同步，以便读连接能看到最新数据
        if (isWrite && this._config.enableWAL) {
          // 执行检查点，确保 WAL 文件中的更改对读连接可见
          // 使用 PASSIVE 模式，不会阻塞其他连接
          try {
            db.prepare('PRAGMA wal_checkpoint(PASSIVE)').run().finalize();
          } catch (checkpointError) {
            // 检查点失败不应该影响主操作，只记录警告
            console.warn('WAL checkpoint failed:', formatError(checkpointError));
          }
        }
        return result;
      } finally {
        this.releaseConnection(db);
      }
    }, maxRetries);
  }

  /**
   * 执行事务
   * 自动处理事务的开始、提交和回滚
   * 使用写连接执行事务操作
   * @param operation 要在事务中执行的操作函数
   * @returns 操作结果
   * @template T 操作返回值的类型
   * @throws 如果操作失败会回滚事务并抛出错误
   */
  public async transaction<T>(operation: (db: Database) => Promise<T>): Promise<T> {
    const db = this.getWriteConnection();

    try {
      db.exec('BEGIN IMMEDIATE');
      const result = await operation(db);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    } finally {
      this.releaseConnection(db);
    }
  }

  /**
   * 清理空闲连接
   * 检查并重建空闲时间超过阈值的无效连接
   * 空闲超时时间：5分钟
   */
  private _cleanupIdleConnections(): void {
    const now = Date.now();
    const idleTimeout = 5 * 60 * 1000; // 5分钟

    // 清理空闲的读连接
    this._readConnections.forEach((conn, index) => {
      if (!conn.inUse && now - conn.lastUsed > idleTimeout) {
        if (!conn.isValid()) {
          conn.close();
          this._readConnections[index] = this._createConnection(true);
        }
      }
    });

    // 检查写连接
    if (this._writeConnection && !this._writeConnection.inUse && !this._writeConnection.isValid()) {
      this._writeConnection.close();
      this._writeConnection = this._createConnection(false);
    }
  }

  /**
   * 启动定期清理任务
   * 每60秒执行一次连接清理，检查并重建无效连接
   */
  private _startCleanupTimer(): void {
    setInterval(() => {
      if (!this._isClosing) {
        this._cleanupIdleConnections();
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取连接池状态
   * 返回连接池的详细状态信息，包括连接使用情况和配置信息
   * @returns 连接池状态对象，包含：
   *   - connectionKey: 连接池唯一标识
   *   - writeConnection: 写连接状态（是否使用中、是否有效）
   *   - readConnections: 读连接状态数组（每个连接的使用状态、有效性、最后使用时间）
   *   - config: 连接池配置信息
   */
  public getStatus(): {
    connectionKey: string;
    writeConnection: { inUse: boolean; valid: boolean };
    readConnections: Array<{ inUse: boolean; valid: boolean; lastUsed: number }>;
    config: Required<ConnectionConfig>;
  } {
    return {
      connectionKey: this._connectionKey,
      writeConnection: {
        inUse: this._writeConnection?.inUse ?? false,
        valid: this._writeConnection?.isValid() ?? false
      },
      readConnections: this._readConnections.map((conn) => ({
        inUse: conn.inUse,
        valid: conn.isValid(),
        lastUsed: conn.lastUsed
      })),
      config: this._config
    };
  }

  /**
   * 关闭连接池
   * 等待所有连接释放后关闭所有连接
   * 如果10秒内连接仍未释放，会强制关闭
   */
  public async close(): Promise<void> {
    this._isClosing = true;

    // 等待所有连接释放或超时
    const timeout = 10000; // 10秒超时
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const allFree = !this._writeConnection?.inUse && this._readConnections.every((conn) => !conn.inUse);

      if (allFree) break;

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 关闭所有连接
    this._writeConnection?.close();
    this._readConnections.forEach((conn) => conn.close());

    this._writeConnection = null;
    this._readConnections = [];
  }
}
