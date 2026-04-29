/**
 * 查询选项接口
 */
export interface QueryOptions {
  /** 查询字段 */
  columns?: string[] | string;
  /** 查询条件 */
  conditions?: { [key: string]: unknown };
  /** 排序规则 */
  order?: { name: string; value: 'ASC' | 'DESC' };
  /**
   * 是否包含已软删除的记录。
   * 仅对启用了 softDelete 配置的实体类生效，默认 false（即只查未删除数据）。
   * 设为 true 可绕过软删除过滤，查询全部记录。
   */
  withDeleted?: boolean;
}

/**
 * 插入选项接口
 */
export interface InsertOptions<T = Record<string, unknown>> {
  /** 插入数据 */
  data: Partial<T>;
}

/**
 * 更新选项接口
 */
export interface UpdateOptions<T = Record<string, unknown>> {
  /** 更新数据 */
  data: Partial<T>;
  /** 更新条件 */
  conditions: { [key: string]: unknown };
}

/**
 * 批量操作实体接口
 */
export interface BatchEntity {
  /** SQL语句 */
  sql: string;
  /** SQL参数 */
  params?: unknown[];
}

/**
 * 数据库连接配置
 */
export interface ConnectionConfig {
  /** 存储路径 */
  storage: string;
  /** 数据库文件名 */
  database: string;
  /** 数据库密码 */
  password?: string;
  /** 是否启用WAL模式 */
  enableWAL?: boolean;
  /** 连接池配置 */
  pool?: {
    /** 最大连接数 */
    maxConnections?: number;
    /** 读连接数 */
    readerConnections?: number;
  };
}

/**
 * 查询结果接口
 */

export interface QueryResult<T> {
  /** 查询结果数据 */
  data: T[];
  /** 总记录数 */
  total?: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

export interface ExecuteResult<T> {
  /** 查询结果数据 */
  data: T[];
  /** 总记录数 */
  total?: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /**
   *  影响的行数
   */
  changes?: number;
}

/**
 * 操作结果接口
 */
export interface OperationResult {
  /** 操作ID */
  id?: string;
  /** 是否成功 */
  success: boolean;
  /** 影响的行数 */
  changes?: number;
  /** 最后插入的ID */
  lastInsertRowid?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 数据库基础操作接口
 */
export interface IDatabase {
  /** 插入数据 */
  insert<T extends new () => unknown>(
    entityClass: T,
    options: InsertOptions<InstanceType<T>>
  ): Promise<OperationResult>;

  /** 更新数据 */
  update<T extends new () => unknown>(
    entityClass: T,
    options: UpdateOptions<InstanceType<T>>
  ): Promise<OperationResult>;

  /** 删除数据 */
  delete<T extends new () => unknown>(entityClass: T, conditions: { [key: string]: unknown }): Promise<OperationResult>;

  /** 查询单条记录 */
  findOne<T extends new () => unknown>(entityClass: T, options?: QueryOptions): Promise<InstanceType<T> | null>;

  /** 查询多条记录 */
  findMany<T extends new () => unknown>(entityClass: T, options?: QueryOptions): Promise<InstanceType<T>[]>;

  /** 分页查询 */
  findPage<T extends new () => unknown>(
    entityClass: T,
    page: number,
    size: number,
    options?: QueryOptions
  ): Promise<QueryResult<InstanceType<T>>>;

  /** 统计记录数 */
  count<T extends new () => unknown>(
    entityClass: T,
    conditions?: { [key: string]: unknown },
    withDeleted?: boolean
  ): Promise<number>;

  /** 执行原始SQL查询 */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /** 执行原始SQL命令 */
  execute(sql: string, params?: unknown[]): Promise<OperationResult>;

  /** 批量操作 */
  batch(entities: BatchEntity[]): Promise<OperationResult>;

  /** 事务操作 */
  transaction(operations: () => Promise<void>): Promise<OperationResult>;

  /** 清空表 */
  truncate(tableName: string): Promise<OperationResult>;

  /** 关闭连接 */
  close(): Promise<void>;
}

/**
 * 分页参数
 */
export interface PaginationOptions {
  page: number;
  size: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * 条件操作符
 */
export type ConditionOperator =
  | 'eq' // 等于
  | 'ne' // 不等于
  | 'gt' // 大于
  | 'gte' // 大于等于
  | 'lt' // 小于
  | 'lte' // 小于等于
  | 'like' // 模糊匹配
  | 'in' // 在...中
  | 'nin' // 不在...中
  | 'between' // 在...之间
  | 'isNull' // 为空
  | 'isNotNull'; // 不为空

/**
 * 高级查询条件
 */
export interface AdvancedCondition {
  [field: string]: {
    [operator in ConditionOperator]?: unknown;
  };
}
