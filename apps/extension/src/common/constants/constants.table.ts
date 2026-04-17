/**
 * 数据库表名联合类型
 * 定义所有可用的表名字符串字面量 来源I_SOFT_GLOBAL.TABLE
 */
type TableName =
  | 'I_SOFT_LOONG_PROJECT'
  | 'I_SOFT_LOONG_PROJECT_APP'
  | 'I_SOFT_LOONG_PROJECT_APP_NODE'
  | 'I_SOFT_LOONG_PROJECT_APP_NODE_ATTR'
  | 'I_SOFT_LOONG_PROJECT_LINK'
  | 'I_SOFT_LOONG_PROJECT_VIEW'
  | 'I_SOFT_LOONG_PROJECT_FILE'
  | 'I_SOFT_LOONG_APP_TEMPLATE'
  | 'I_SOFT_LOONG_APP_TEMPLATE_CACHE';

/**
 * 数据库表名常量对象
 * 用于统一管理所有数据库表名，确保类型安全
 *
 * @example
 * ```ts
 * const tableName = tableNames.appTemplate; // 'I_SOFT_LOONG_APP_TEMPLATE'
 * ```
 */
export const tableNames = {
  appTemplate: 'I_SOFT_LOONG_APP_TEMPLATE',
  projectAppNodeAttr: 'I_SOFT_LOONG_PROJECT_APP_NODE_ATTR',
  projectAppNode: 'I_SOFT_LOONG_PROJECT_APP_NODE',
  projectView: 'I_SOFT_LOONG_PROJECT_VIEW',
  projectFile: 'I_SOFT_LOONG_PROJECT_FILE',
  projectLink: 'I_SOFT_LOONG_PROJECT_LINK',
  projectAppTemplateCache: 'I_SOFT_LOONG_APP_TEMPLATE_CACHE',
  project: 'I_SOFT_LOONG_PROJECT',
  projectApp: 'I_SOFT_LOONG_PROJECT_APP'
} as const satisfies Record<string, TableName>;

/**
 * 表名常量对象的类型
 * 从 TABLE 对象推导出精确的类型
 */
export type TableNames = typeof tableNames;

/**
 * 表名键的联合类型
 * 例如: 'APP_TEMPLATE' | 'PROJECT_APP_NODE' | ...
 */
export type TableNameKeys = keyof typeof tableNames;

/**
 * 表名值的联合类型
 * 从 TABLE 对象的值中提取，确保与实际使用的表名一致
 */
export type TableNameValues = (typeof tableNames)[keyof typeof tableNames];
