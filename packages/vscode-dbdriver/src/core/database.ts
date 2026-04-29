import { existsSync, readFileSync } from 'fs';
import { ConnectionPool } from './connectionPool';
import {
  IDatabase,
  BatchEntity,
  OperationResult,
  QueryResult,
  ConnectionConfig,
  QueryOptions,
  InsertOptions,
  UpdateOptions,
  ExecuteResult
} from '../types';
import {
  buildWhereClause,
  buildOrderClause,
  buildLimitClause,
  processInputData,
  generateUUID,
  isEmpty,
  formatError,
  validateIdentifier,
  escapeIdentifier
} from '../utils';
import { getTableName, getSoftDeleteConfig } from '../decorators/table';
import { RunResult, Database as SQLiteDatabase, Statement } from '@journeyapps/sqlcipher';

/**
 * 优化的SQLite数据库操作类
 * 基于@journeyapps/sqlcipher，提供高性能的数据库操作API
 */
export class Database implements IDatabase {
  private _pool: ConnectionPool;
  private _defaultTableName?: string;

  constructor(config: ConnectionConfig, defaultTableName?: string) {
    this._pool = new ConnectionPool(config);
    this._defaultTableName = defaultTableName;
  }

  /**
   * 获取表名
   */
  private _getTableName<T extends new () => unknown>(entityClass: T): string {
    const tableName = getTableName(entityClass) || this._defaultTableName;
    if (!tableName) {
      throw new Error(
        `Table name is required. Please use @Table('tableName') decorator on class ${entityClass.name} or provide defaultTableName in constructor.`
      );
    }
    if (!validateIdentifier(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    return tableName;
  }

  /**
   * 将软删除条件合并到查询条件中。
   * 仅对启用了 softDelete 配置的实体类生效；withDeleted 为 true 时跳过注入。
   * @param entityClass 实体类构造函数
   * @param conditions 原始查询条件
   * @param withDeleted 是否查询包含已删除记录
   * @returns 合并后的查询条件
   */
  private _injectSoftDeleteCondition(
    entityClass: new () => unknown,
    conditions?: { [key: string]: unknown },
    withDeleted?: boolean
  ): { [key: string]: unknown } | undefined {
    if (withDeleted) return conditions;

    const softDeleteConfig = getSoftDeleteConfig(entityClass);
    if (!softDeleteConfig) return conditions;

    return {
      ...conditions,
      [softDeleteConfig.field]: softDeleteConfig.activeValue
    };
  }

  /**
   * 确保表存在
   */
  private async _ensureTable(tableName: string, sampleData?: unknown): Promise<void> {
    // 如果没有示例数据，不需要创建表
    if (!sampleData) return;

    // 确保 sampleData 是对象类型
    if (typeof sampleData !== 'object' || sampleData === null || Array.isArray(sampleData)) {
      return;
    }

    const db = this._pool.getWriteConnection();
    try {
      // 检查表是否存在
      const tableExists = await new Promise((resolve, reject) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      if (!tableExists) {
        // 如果表不存在，创建基础表结构
        await this._exec(
          db,
          `
          CREATE TABLE IF NOT EXISTS ${escapeIdentifier(tableName)} (
            id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
        );
      }

      // 获取现有列信息
      // 确保返回的是数组
      const columns = await this._prepareAndExecute<Record<string, unknown>>(
        db,
        `PRAGMA table_info(${escapeIdentifier(tableName)})`
      );
      const existingColumns = new Set(columns.data.map((col) => col.name));
      // 存储所有要执行的 ALTER TABLE 语句
      const alterTableStatements: string[] = [];
      // 遍历示例数据，添加缺失的列
      for (const [key, value] of Object.entries(sampleData)) {
        // 跳过 id 列（已存在）和已有列
        if (key === 'id' || existingColumns.has(key)) {
          continue;
        }

        // 根据值类型确定列类型
        let columnType = 'TEXT';
        if (typeof value === 'number') {
          columnType = Number.isInteger(value) ? 'INTEGER' : 'REAL';
        } else if (typeof value === 'boolean') {
          columnType = 'INTEGER';
        }
        // 生成 ALTER TABLE 语句并添加到数组中
        alterTableStatements.push(
          `ALTER TABLE ${escapeIdentifier(tableName)} ADD COLUMN ${escapeIdentifier(key)} ${columnType}`
        );
      }
      if (alterTableStatements.length) {
        const sqlStatements = alterTableStatements.join('; '); // 使用分号分隔每个 SQL 语句
        await this._exec(db, sqlStatements);
      }
    } catch (error) {
      throw new Error(`Ensure table ${tableName} failed: ${formatError(error)}`);
    } finally {
      this._pool.releaseConnection(db);
    }
  }

  /**
   * 封装 prepare 和 run，返回异步 RunResult
   */
  private async _prepareAndRun(db: SQLiteDatabase, sql: string, params?: unknown[]): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject) => {
      const stmt: Statement = db.prepare(sql);

      const finalizeAndResolve = (result: RunResult) => {
        stmt.finalize((finalizeError) => {
          if (finalizeError !== null && typeof finalizeError !== 'undefined') {
            console.warn('Statement finalize failed:', formatError(finalizeError));
          }
        });
        resolve(result);
      };

      const finalizeAndReject = (error: Error) => {
        stmt.finalize((finalizeError) => {
          if (finalizeError !== null && typeof finalizeError !== 'undefined') {
            console.warn('Statement finalize failed:', formatError(finalizeError));
          }
        });
        reject(error);
      };

      try {
        stmt.run(params || [], function (this: RunResult, error: Error | null) {
          if (error) {
            finalizeAndReject(new Error(`Execute SQL failed: ${formatError(error)}`));
          } else {
            finalizeAndResolve(this);
          }
        });
      } catch (error) {
        finalizeAndReject(new Error(`Execute SQL failed: ${formatError(error)}`));
      }
    });
  }

  /**
   * 执行无参数的查询
   * @param db 数据库实例 stmt.all
   * @param sql SQL 语句
   * @param params 查询参数（可选）
   */
  private async _prepareAndExecute<T>(db: SQLiteDatabase, sql: string, params?: unknown[]): Promise<ExecuteResult<T>> {
    return new Promise<ExecuteResult<T>>((resolve, reject) => {
      const stmt: Statement = db.prepare(sql);

      try {
        const finalizeAndResolve = (data: ExecuteResult<T>) => {
          stmt.finalize((finalizeError) => {
            if (finalizeError !== null && typeof finalizeError !== 'undefined') {
              console.warn('Statement finalize failed:', formatError(finalizeError));
            }
          });
          resolve(data);
        };

        const finalizeAndReject = (error: Error) => {
          stmt.finalize((finalizeError) => {
            if (finalizeError !== null && typeof finalizeError !== 'undefined') {
              console.warn('Statement finalize failed:', formatError(finalizeError));
            }
          });
          reject(error);
        };

        // 根据是否有参数，调用不同的 stmt 方法
        if (params !== undefined) {
          stmt.all(params, function (error: Error | null, rows: T[]) {
            if (error) {
              finalizeAndReject(new Error(`Execute SQL failed: ${formatError(error)}`));
            } else {
              finalizeAndResolve({ data: rows as T[], success: true, total: rows.length });
            }
          });
        } else {
          stmt.all(function (error: Error | null, rows: T[]) {
            if (error) {
              finalizeAndReject(new Error(`Execute SQL failed: ${formatError(error)}`));
            } else {
              finalizeAndResolve({ data: rows as T[], success: true, total: rows.length });
            }
          });
        }
      } catch (error) {
        stmt.finalize((finalizeError) => {
          if (finalizeError !== null && typeof finalizeError !== 'undefined') {
            console.warn('Statement finalize failed:', formatError(finalizeError));
          }
        });
        reject(new Error(`Execute SQL failed: ${formatError(error)}`));
      }
    });
  }
  /**
   * 执行SQL语句
   * @param db SQLiteDatabase
   * @param sql string
   * @returns Promise<Statement>
   */
  private async _exec(db: SQLiteDatabase, sql: string): Promise<Statement> {
    return await new Promise<Statement>((resolve, reject) => {
      db.exec(sql, function (this: Statement, error: Error | null) {
        if (error) {
          reject(new Error(`Execute SQL failed: ${formatError(error)}`));
        } else {
          resolve(this);
        }
      });
    });
  }

  /**
   * 插入数据
   */
  public async insert<T extends new () => unknown>(
    entityClass: T,
    options: InsertOptions<InstanceType<T>>
  ): Promise<OperationResult> {
    try {
      const tableName = this._getTableName(entityClass);
      const data = options.data;

      if (!data || Object.keys(data).length === 0) {
        throw new Error('Insert data cannot be empty');
      }

      // 处理数据
      const processedData = processInputData(data as { [key: string]: unknown });

      // 确保有ID
      if (!processedData.id || isEmpty(processedData.id)) {
        processedData.id = generateUUID();
      }

      // 确保表存在
      await this._ensureTable(tableName, processedData);

      return await this._pool.withRetry<OperationResult>(async (db) => {
        const keys = Object.keys(processedData);
        const values = Object.values(processedData);
        const placeholders = keys.map(() => '?').join(', ');

        const sql = `INSERT INTO ${escapeIdentifier(tableName)} (${keys.map(escapeIdentifier).join(', ')}) VALUES (${placeholders})`;

        const result = await this._prepareAndRun(db, sql, values);

        return {
          id: processedData.id as string,
          success: true,
          changes: result.changes,
          lastInsertRowid: result.lastID
        };
      }, true);
    } catch (error) {
      return {
        id: '',
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 更新数据
   */
  public async update<T extends new () => unknown>(
    entityClass: T,
    options: UpdateOptions<InstanceType<T>>
  ): Promise<OperationResult> {
    try {
      const tableName = this._getTableName(entityClass);
      const data = options.data;
      const conditions = options.conditions;

      if (!data || Object.keys(data).length === 0) {
        throw new Error('Update data cannot be empty');
      }

      if (!conditions || Object.keys(conditions).length === 0) {
        throw new Error('Update conditions cannot be empty');
      }

      // 处理数据
      const processedData = processInputData(data as { [key: string]: unknown });

      // 添加更新时间
      processedData.updated_at = new Date().toISOString();

      // 确保表存在
      await this._ensureTable(tableName, processedData);

      return await this._pool.withRetry(async (db) => {
        const keys = Object.keys(processedData);
        const values = Object.values(processedData);

        const { clause: whereClause, params: whereParams } = buildWhereClause(conditions);

        const setClause = keys.map((key) => `${escapeIdentifier(key)} = ?`).join(', ');
        const sql = `UPDATE ${escapeIdentifier(tableName)} SET ${setClause}${whereClause}`;

        const result = await this._prepareAndRun(db, sql, [...values, ...whereParams]);

        return {
          success: true,
          changes: result.changes
        };
      }, true);
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 删除数据
   */
  public async delete<T extends new () => unknown>(
    entityClass: T,
    conditions: { [key: string]: unknown }
  ): Promise<OperationResult> {
    try {
      const tableName = this._getTableName(entityClass);

      if (!conditions || Object.keys(conditions).length === 0) {
        throw new Error('Delete conditions cannot be empty');
      }

      return await this._pool.withRetry(async (db) => {
        const { clause: whereClause, params: whereParams } = buildWhereClause(conditions);
        const sql = `DELETE FROM ${escapeIdentifier(tableName)}${whereClause}`;

        const result = await this._prepareAndRun(db, sql, whereParams);

        return {
          success: true,
          changes: result.changes
        };
      }, true);
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 查询单条记录
   */
  public async findOne<T extends new () => unknown>(
    entityClass: T,
    options?: QueryOptions
  ): Promise<InstanceType<T> | null> {
    try {
      const tableName = this._getTableName(entityClass);
      const columns = options?.columns || '*';
      const conditions = this._injectSoftDeleteCondition(entityClass, options?.conditions, options?.withDeleted);

      return await this._pool.withRetry(async (db) => {
        const { clause: whereClause, params: whereParams } = buildWhereClause(conditions);
        const orderClause = buildOrderClause(options?.order);

        const columnStr = Array.isArray(columns)
          ? columns.map(escapeIdentifier).join(', ')
          : columns === '*'
            ? '*'
            : escapeIdentifier(columns as string);

        const sql = `SELECT ${columnStr} FROM ${escapeIdentifier(tableName)}${whereClause}${orderClause} LIMIT 1`;

        const row = await this._prepareAndExecute<InstanceType<T>>(db, sql, whereParams);

        return row.data.length > 0 ? row.data[0] : null;
      }, false);
    } catch (error) {
      throw new Error(`Find one failed: ${formatError(error)}`);
    }
  }

  /**
   * 查询多条记录
   */
  public async findMany<T extends new () => unknown>(
    entityClass: T,
    options?: QueryOptions
  ): Promise<InstanceType<T>[]> {
    try {
      const tableName = this._getTableName(entityClass);
      const columns = options?.columns || '*';
      const conditions = this._injectSoftDeleteCondition(entityClass, options?.conditions, options?.withDeleted);

      return await this._pool.withRetry(async (db) => {
        const { clause: whereClause, params: whereParams } = buildWhereClause(conditions);
        const orderClause = buildOrderClause(options?.order);

        const columnStr = Array.isArray(columns)
          ? columns.map(escapeIdentifier).join(', ')
          : columns === '*'
            ? '*'
            : escapeIdentifier(columns as string);

        const sql = `SELECT ${columnStr} FROM ${escapeIdentifier(tableName)}${whereClause}${orderClause}`;

        const rows = await this._prepareAndExecute<InstanceType<T>>(db, sql, whereParams);
        return rows.data;
      }, false);
    } catch (error) {
      throw new Error(`Find many failed: ${formatError(error)}`);
    }
  }

  /**
   * 分页查询
   */
  public async findPage<T extends new () => unknown>(
    entityClass: T,
    page: number,
    size: number,
    options?: QueryOptions
  ): Promise<QueryResult<InstanceType<T>>> {
    try {
      const tableName = this._getTableName(entityClass);
      const columns = options?.columns || '*';
      const conditions = this._injectSoftDeleteCondition(entityClass, options?.conditions, options?.withDeleted);

      if (page < 1 || size < 1) {
        throw new Error('Page and size must be greater than 0');
      }

      return await this._pool.withRetry(async (db) => {
        const { clause: whereClause, params: whereParams } = buildWhereClause(conditions);
        const orderClause = buildOrderClause(options?.order);
        const limitClause = buildLimitClause(page, size);

        const columnStr = Array.isArray(columns)
          ? columns.map(escapeIdentifier).join(', ')
          : columns === '*'
            ? '*'
            : escapeIdentifier(columns as string);

        // 查询数据
        const dataSql = `SELECT ${columnStr} FROM ${escapeIdentifier(tableName)}${whereClause}${orderClause}${limitClause}`;
        const rows = await this._prepareAndExecute<InstanceType<T>>(db, dataSql, whereParams);

        // 查询总数
        const countSql = `SELECT COUNT(*) as total FROM ${escapeIdentifier(tableName)}${whereClause}`;
        const countResult = await this._prepareAndExecute(db, countSql, whereParams);

        return {
          data: rows.data,
          total: countResult.data.length > 0 ? (countResult.data[0] as { total: number }).total : 0,
          success: rows.success
        };
      }, false);
    } catch (error) {
      return {
        data: [],
        total: 0,
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 统计记录数
   */
  public async count<T extends new () => unknown>(
    entityClass: T,
    conditions?: { [key: string]: unknown },
    withDeleted?: boolean
  ): Promise<number> {
    try {
      const tableName = this._getTableName(entityClass);
      const mergedConditions = this._injectSoftDeleteCondition(entityClass, conditions, withDeleted);

      return await this._pool.withRetry(async (db) => {
        const { clause: whereClause, params: whereParams } = buildWhereClause(mergedConditions);
        const sql = `SELECT COUNT(*) as count FROM ${escapeIdentifier(tableName)}${whereClause}`;

        const result = await this._prepareAndExecute(db, sql, whereParams);

        return result.data.length > 0 ? (result.data[0] as { count: number }).count : 0;
      }, false);
    } catch (error) {
      throw new Error(`Count failed: ${formatError(error)}`);
    }
  }

  /**
   * 执行原始SQL查询
   */
  public async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    try {
      return await this._pool.withRetry(async (db) => {
        const rows = await this._prepareAndExecute<T>(db, sql, params);
        return rows.data;
      }, false);
    } catch (error) {
      throw new Error(`Query failed: ${formatError(error)}`);
    }
  }

  /**
   * 执行原始SQL命令
   */
  public async execute(sql: string, params?: unknown[]): Promise<OperationResult> {
    try {
      return await this._pool.withRetry(async (db) => {
        const result = await this._prepareAndExecute(db, sql, params || []);

        return {
          success: result.success,
          changes: result.changes
        };
      }, true);
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 批量操作
   */
  public async batch(entities: BatchEntity[]): Promise<OperationResult> {
    if (!entities || entities.length === 0) {
      return { success: true, changes: 0 };
    }

    try {
      return await this._pool.transaction(async (db) => {
        let totalChanges = 0;
        for (const entity of entities) {
          const result = await this._prepareAndRun(db, entity.sql, entity.params || []);

          totalChanges += result.changes;
        }

        return {
          success: true,
          changes: totalChanges
        };
      });
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 生成批量更新模板属性的 SQL 语句
   *
   * @param entityClass - 实体类（用于动态获取表名）
   * @param whereField - WHERE 条件的字段名，必须是实体类的属性名（类型安全）
   * @param whereValues - WHERE 条件的值数组（用于 IN 查询）
   * @param updateData - 要更新的字段和值的对象
   * @returns 包含 SQL 和参数的 BatchEntity
   *
   * @example
   * // 更新 AppTemplateEntity 表的数据
   * generateUpdateSQL(
   *   AppTemplateEntity,
   *   'name',  // 类型安全：只能传入 AppTemplateEntity 的属性名
   *   ['type1', 'type2'],
   *   {
   *     alias: 'newAlias',
   *     lowerBound: '0',
   *     upperBound: '100'
   *   }
   * );
   *
   * @example
   * // 只更新别名
   * generateUpdateSQL(
   *   AppTemplateEntity,
   *   'id',  // IDE 会提供自动补全和类型检查
   *   ['uuid1', 'uuid2'],
   *   { alias: 'newAlias' }
   * );
   */
  generateUpdateSQL<T extends new () => unknown>(
    entityClass: T,
    whereField: keyof InstanceType<T>,
    whereValues: (string | number)[],
    updateData: Partial<InstanceType<T>>
  ): BatchEntity {
    // 从实体类动态获取表名
    const tableName = this._getTableName(entityClass);

    // 将 whereField 转换为字符串（keyof 类型可能是 symbol）
    const whereFieldStr = String(whereField);

    // 如果 whereValues 为空或 updateData 为空，返回空操作 SQL
    if (!whereValues || whereValues.length === 0 || !updateData || Object.keys(updateData).length === 0) {
      return {
        sql: `UPDATE ${tableName} SET id = ? WHERE 1 = 0`,
        params: []
      };
    }

    // 动态构建 SET 子句
    const setFields = Object.keys(updateData);
    const setClause = setFields.map((field) => `${field} = ?`).join(',\n                   ');

    // 构建 WHERE IN 子句的占位符
    const placeholders = whereValues.map(() => '?').join(', ');

    // 构建完整的 SQL
    const sql = `UPDATE ${tableName}
               SET ${setClause}
               WHERE ${whereFieldStr} IN (${placeholders})`;

    // 构建参数数组：先是 SET 的值，然后是 WHERE 的值
    const params = [...Object.values(updateData), ...whereValues];

    return { sql, params };
  }

  /**
   *
   * @param entityClass - 实体类（用于动态获取表名）
   * @param whereField - WHERE 条件的字段名，必须是实体类的属性名（类型安全）
   * @param whereValues - WHERE 条件的值数组（用于 IN 查询）
   * @returns 包含 SQL 和参数的 BatchEntity
   *
   * @example
   * // 删除 AppTemplateEntity 表的数据
   * generateDeleteSQL(
   *   AppTemplateEntity,
   *   'name',
   *   ['type1', 'type2']
   * );
   *
   * @example
   * // 只删除别名
   * generateDeleteSQL(
   *   AppTemplateEntity,
   *   'id',
   *   ['uuid1', 'uuid2']
   * );
   */
  generateDeleteSQL<T extends new () => unknown>(
    entityClass: T,
    whereField: keyof InstanceType<T>,
    whereValues: (string | number)[]
  ): BatchEntity {
    const tableName = this._getTableName(entityClass);
    const whereFieldStr = String(whereField);

    if (!whereValues || whereValues.length === 0) {
      return {
        sql: `DELETE FROM ${tableName} WHERE 1 = 0`,
        params: []
      };
    }

    const placeholders = whereValues.map(() => '?').join(', ');
    const sql = `DELETE FROM ${tableName} WHERE ${whereFieldStr} IN (${placeholders})`;
    const params = [...whereValues];
    return { sql, params };
  }

  /**
   *
   * @param entityClass - 实体类（用于动态获取表名）
   * @param data - 要插入的数据对象
   * @returns 包含 SQL 和参数的 BatchEntity
   *
   * @example
   * // 插入 AppTemplateEntity 表的数据
   * generateInsertSQL(
   *   AppTemplateEntity,
   *   { name: 'type1', alias: 'alias1', lowerBound: 0, upperBound: 100 }
   * );
   *
   * @example
   * // 只插入别名
   * generateInsertSQL(
   *   AppTemplateEntity,
   *   { id: 'uuid1', alias: 'alias1' }
   * );
   */
  generateInsertSQL<T extends new () => unknown>(entityClass: T, data: Partial<InstanceType<T>>): BatchEntity {
    const tableName = this._getTableName(entityClass);
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = [...values];
    return { sql, params };
  }

  /**
   * 事务操作
   */
  public async transaction(operations: () => Promise<void>): Promise<OperationResult> {
    try {
      await this._pool.transaction(async () => {
        await operations();
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 清空表
   */
  public async truncate(tableName: string): Promise<OperationResult> {
    try {
      if (!validateIdentifier(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      return this._pool.withRetry(async (db) => {
        const sql = `DELETE FROM ${escapeIdentifier(tableName)}`;
        const result = await this._prepareAndRun(db, sql, undefined);

        return {
          success: true,
          changes: result.changes
        };
      }, true);
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 检查表是否存在
   */
  public async tableExists(tableName: string): Promise<boolean> {
    try {
      if (!validateIdentifier(tableName)) {
        return false;
      }

      return await this._pool.withRetry(async (db) => {
        const sql = `
          SELECT name FROM sqlite_master
          WHERE type='table' AND name=?
        `;
        const result = await this._prepareAndExecute(db, sql, [tableName]);
        return result.data.length > 0;
      }, false);
    } catch (error) {
      console.error('检查表是否存在出现错误', error);
      return false;
    }
  }

  /**
   * 获取表结构信息
   */
  public async getTableInfo(tableName: string) {
    try {
      if (!validateIdentifier(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      return await this._pool.withRetry(async (db) => {
        const sql = `PRAGMA table_info(${escapeIdentifier(tableName)})`;
        return (await this._prepareAndExecute(db, sql)).data;
      }, false);
    } catch (error) {
      throw new Error(`Get table info failed: ${formatError(error)}`);
    }
  }

  /**
   * 优化数据库
   */
  public async optimize(): Promise<OperationResult> {
    try {
      return this._pool.withRetry((db) => {
        db.exec('VACUUM');
        return { success: true };
      }, true);
    } catch (error) {
      return {
        success: false,
        error: formatError(error)
      };
    }
  }

  /**
   * 获取数据库状态
   */
  public getStatus() {
    return this._pool.getStatus();
  }

  /**
   * 关闭数据库连接
   */
  public async close(): Promise<void> {
    await this._pool.close();
  }

  /**
   * 执行本地 SQL Script 脚本
   *
   * @param sqlScriptPath - 本地脚本文件路径（必须是 .sql 文件）
   * @returns Promise<void>
   *
   * @example
   * // 执行 SQL 脚本文件
   * await db.runSqlScript('./scripts/init.sql');
   *
   * @example
   * // 在初始化时执行多个脚本
   * await db.runSqlScript('./scripts/create_tables.sql');
   * await db.runSqlScript('./scripts/insert_data.sql');
   *
   * @throws 如果文件路径无效或文件不存在
   * @throws 如果 SQL 执行失败（会自动回滚事务）
   */
  public async runSqlScript(sqlScriptPath: string): Promise<void> {
    // 验证文件路径
    if (!sqlScriptPath || !sqlScriptPath.endsWith('.sql')) {
      throw new Error(`Invalid SQL script path: ${sqlScriptPath}. Path must end with .sql`);
    }

    // 检查文件是否存在
    if (!existsSync(sqlScriptPath)) {
      throw new Error(`SQL script file does not exist: ${sqlScriptPath}`);
    }

    try {
      // 读取 SQL 脚本内容
      const sqlContent = readFileSync(sqlScriptPath, 'utf-8');

      if (!sqlContent || sqlContent.trim().length === 0) {
        throw new Error(`SQL script file is empty: ${sqlScriptPath}`);
      }

      // 在事务中执行 SQL 脚本
      await this._pool.transaction(async (db) => {
        // 执行 SQL 脚本
        await this._exec(db, sqlContent);
      });
    } catch (error) {
      throw new Error(`Failed to execute SQL script ${sqlScriptPath}: ${formatError(error)}`);
    }
  }
}
