import { Database } from './core/database';
import { ConnectionConfig } from './types';

// 导出核心类
export { Database } from './core/database';
export { ConnectionPool } from './core/connectionPool';

// 导出类型定义
export type {
  IDatabase,
  BatchEntity,
  ConnectionConfig,
  QueryResult,
  OperationResult,
  PaginationOptions,
  AdvancedCondition,
  ConditionOperator,
  QueryOptions,
  InsertOptions,
  UpdateOptions
} from './types';

// 导出装饰器
export { Table, getTableName, hasTableName } from './decorators/table';

// 导出工具函数
export {
  generateUUID,
  isEmpty,
  isJSON,
  safeJSONParse,
  buildWhereClause,
  buildOrderClause,
  buildLimitClause,
  processRowData,
  processInputData,
  validateIdentifier,
  escapeIdentifier,
  formatError,
  delay,
  retry
} from './utils';

// 创建数据库实例的工厂函数
export function createDatabase(config: ConnectionConfig, defaultTableName?: string): Database {
  return new Database(config, defaultTableName);
}

// 默认导出
export default Database;
