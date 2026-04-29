/**
 * 软删除字段配置（仅在字段名不为 'removed' 时需要显式传入）
 */
export interface SoftDeleteConfig {
  /** 软删除字段名 */
  field: string;
  /** 表示"未删除/活跃"记录的字段值，默认 0 */
  activeValue?: 0 | 1;
}

/**
 * @Table 装饰器配置选项
 */
export interface TableConfig {
  /**
   * 自定义软删除字段配置。
   * 仅在软删除字段名不是默认的 'removed' 时才需要传此项。
   * 若实体类已有 removed 属性，无需配置，会自动启用。
   *
   * @example
   * // 自定义字段名
   * @Table('tasks', { softDelete: { field: 'is_deleted' } })
   * class TaskEntity { id: string; is_deleted: number = 0; }
   */
  softDelete?: SoftDeleteConfig;
}

/**
 * 表元数据存储
 */
interface TableMeta {
  tableName: string;
  /** 自动检测到实体类含有 removed 属性 */
  hasRemovedField: boolean;
  config?: TableConfig;
}

const tableMetadata = new WeakMap<new () => unknown, TableMeta>();

/**
 * 表装饰器，用于标记实体类对应的数据库表名。
 * 会自动检测实体类是否含有 `removed` 属性：
 * - 有 → 查询时自动附加 `removed = 0` 条件
 * - 无 → 不附加任何软删除条件
 *
 * 若软删除字段名不是 `removed`，可通过 `config.softDelete` 显式指定。
 *
 * @param tableName 数据库表名
 * @param config 可选配置（仅用于自定义软删除字段名）
 *
 * @example
 * // 无 removed 属性 → 不启用软删除
 * @Table('logs')
 * class LogEntity { id: string = ''; }
 *
 * @example
 * // 有 removed 属性 → 自动启用软删除（removed = 0）
 * @Table('projects')
 * class ProjectEntity { id: string = ''; removed: number = 0; }
 *
 * @example
 * // 自定义软删除字段名
 * @Table('tasks', { softDelete: { field: 'is_deleted' } })
 * class TaskEntity { id: string = ''; is_deleted: number = 0; }
 */
export function Table(tableName: string, config?: TableConfig) {
  return function <T extends new () => unknown>(target: T): T {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}. Table name must match /^[a-zA-Z_][a-zA-Z0-9_]*$/`);
    }

    let hasRemovedField = false;
    try {
      const instance = new target() as Record<string, unknown>;
      hasRemovedField = 'removed' in instance;
    } catch {
      // 构造函数异常时跳过自动检测，依赖显式配置
    }

    tableMetadata.set(target, {
      tableName: tableName,
      hasRemovedField: hasRemovedField,
      config: config
    });
    return target;
  };
}

/**
 * 获取实体类对应的表名
 * @param entityClass 实体类构造函数
 * @returns 表名，如果未找到则返回 undefined
 */
export function getTableName<T extends new () => unknown>(entityClass: T): string | undefined {
  return tableMetadata.get(entityClass)?.tableName;
}

/**
 * 获取实体类的软删除配置（已规范化）。
 * 优先使用自动检测结果（实体含 removed 属性），其次使用显式配置。
 * 若均未启用，返回 undefined。
 * @param entityClass 实体类构造函数
 * @returns 规范化后的软删除配置，或 undefined
 */
export function getSoftDeleteConfig<T extends new () => unknown>(
  entityClass: T
): Required<SoftDeleteConfig> | undefined {
  const meta = tableMetadata.get(entityClass);
  if (!meta) return undefined;

  // 自动检测到 removed 属性，优先使用
  if (meta.hasRemovedField) {
    return { field: 'removed', activeValue: 0 };
  }

  // 显式配置了自定义字段名
  const softDelete = meta.config?.softDelete;
  if (!softDelete) return undefined;

  return {
    field: softDelete.field,
    activeValue: softDelete.activeValue ?? 0
  };
}

/**
 * 检查实体类是否已注册表名
 * @param entityClass 实体类构造函数
 * @returns 是否已注册
 */
export function hasTableName<T extends new () => unknown>(entityClass: T): boolean {
  return tableMetadata.has(entityClass);
}
