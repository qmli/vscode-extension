/**
 * 数据库相关常量定义
 * 用于统一管理数据库表结构、索引等
 */

import { tableNames } from './constants.table';

/**
 * 数据库表结构定义
 * 包含所有表的 CREATE TABLE 和 CREATE INDEX 语句
 *
 * 注意：SQLite 不能在一个单独的 SQL 语句中一次性执行多个 CREATE 语句
 * 因此每个 CREATE TABLE 和 CREATE INDEX 语句都必须是独立的、完整的 SQL 语句
 * 每个表的 sql 数组中的每个元素都会单独执行
 */
export const tableSchema = [
  // 创建模板表
  // --APP_TEMPLATE-------------------------------------------------------------------------------------------------------
  {
    table: tableNames.appTemplate,
    sql: [
      `CREATE TABLE IF NOT EXISTS ${tableNames.appTemplate}(` +
        `   uuid         INTEGER PRIMARY KEY,` + // 自增UUID
        `   id           CHAR(32)            NOT NULL,` + // 主键ID
        `   parentId     CHAR(32),` + // 父ID
        `   alias        VARCHAR(128),` + // 别名
        `   name         VARCHAR(128),` + // 名称
        `   iType        VARCHAR(10),` + // 节点类型 ENUM、ATTR
        `   pType        VARCHAR(2),` + // 平台类型 AP、CP
        `   type         TEXT,` + // 模板中类型
        `   outline      CHAR(1),` + // 是否是大纲 T
        `   lowerBound   CHAR(1),` + // 最少出现次数
        `   upperBound   CHAR(1),` + // 最大出现次数
        `   sort         INTEGER,` + // 排序
        `   category     VARCHAR(128),` + // 字典
        `   description  TEXT,` + // 描述
        `   optionalValueList     TEXT,` + // optionalValueList
        `   pattern      TEXT,` + // 正则匹配
        `   patternList  TEXT,` + // 正则匹配列表、推荐用
        `   links        TEXT,` + // 关联引用
        `   init         BOOLEAN,` + // 初始埋入
        `   version      INTEGER,` + // 版本号
        `   isNode       BOOLEAN,` + // 是否是对象
        `   isL1Node     BOOLEAN,` + // 是否是Package一级对象
        `   isSimple     BOOLEAN,` + // 是否是简单对象
        `   isArray      BOOLEAN,` + // 是否是数组
        `   defaultValue TEXT,` + // 默认值
        `   postBuildVariantMultiplicity  BOOLEAN,` + //
        `   postBuildVariantValue         BOOLEAN,` + //
        `   UNIQUE (parentId, name)` + // 组合唯一
        `);`,
      `CREATE INDEX IF NOT EXISTS template_idx_id ON ${tableNames.appTemplate}(id); `,
      `CREATE INDEX IF NOT EXISTS template_idx_parent_id ON ${tableNames.appTemplate}(parentId); `,
      `CREATE INDEX IF NOT EXISTS template_idx_sort ON ${tableNames.appTemplate}(sort); `,
      `CREATE INDEX IF NOT EXISTS template_idx_name ON ${tableNames.appTemplate}(name); `,
      `CREATE INDEX IF NOT EXISTS template_idx_pType ON ${tableNames.appTemplate}(pType); `
    ]
  },

  // --PROJECT_APP_NODE_ATTR-------------------------------------------------------------------------------------------------------
  {
    table: tableNames.projectAppNodeAttr,
    sql: [
      `CREATE TABLE IF NOT EXISTS ${tableNames.projectAppNodeAttr}(` +
        `    id         CHAR(32) PRIMARY KEY,\n` +
        `    appId      CHAR(32),\n` +
        `    rootId     CHAR(32),\n` +
        `    nodeId     CHAR(32),\n` +
        `    tempId     CHAR(32),\n` +
        `    treeId     CHAR(32),\n` +
        `    parentId   CHAR(32),\n` +
        `    dummyId    CHAR(32),\n` +
        `    name       VARCHAR(128),\n` +
        `    label      VARCHAR(128),\n` +
        `    sort       INTEGER,\n` +
        `    component  VARCHAR(10),\n` +
        `    iType      VARCHAR(10),\n` +
        `    value      TEXT,\n` +
        `    version    INTEGER,\n` + // 版本号
        `    isError    BOOLEAN,\n` + // 是否有错
        `    isCache    BOOLEAN,\n` + // 是否缓存
        `    isKeep     BOOLEAN,\n` + // 是否更改留存
        `    removed    BOOLEAN,\n` + // 是否删除
        `    isWrite    BOOLEAN,\n` + // 是否写入文件
        `    variantPoint  CHAR(2),\n` + // 变体信息
        `    longName   TEXT,\n` + // 长名称(校验用)
        `    displayName   TEXT,\n` + // 显示名称
        `    UNIQUE (nodeId, name)\n` + // 约束同一对象下，属性名唯一
        `);\n`,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_appid ON ${tableNames.projectAppNodeAttr}(appId); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_nodeId ON ${tableNames.projectAppNodeAttr}(nodeId); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_tempId ON ${tableNames.projectAppNodeAttr}(tempId); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_treeId ON ${tableNames.projectAppNodeAttr}(treeId); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_parentId ON ${tableNames.projectAppNodeAttr}(parentId); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_rootId ON ${tableNames.projectAppNodeAttr}(rootId); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_name ON ${tableNames.projectAppNodeAttr}(name); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_version ON ${tableNames.projectAppNodeAttr}(version); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_sort ON ${tableNames.projectAppNodeAttr}(sort); `,
      `CREATE INDEX IF NOT EXISTS node_attr_idx_longName ON ${tableNames.projectAppNodeAttr}(longName); `
    ]
  },

  // -PROJECT_APP_NODE--------------------------------------------------------------------------------------------------------
  {
    table: tableNames.projectAppNode,
    sql: [
      `CREATE TABLE IF NOT EXISTS ${tableNames.projectAppNode}(` +
        `    id          CHAR(32) PRIMARY KEY,\n` +
        `    treeId      CHAR(32),\n` +
        `    tempId      CHAR(32),\n` +
        `    parentId    CHAR(32),\n` +
        `    appId       CHAR(32),\n` +
        `    rootId      CHAR(32),\n` +
        `    dummyId     CHAR(32),\n` +
        `    name        VARCHAR(128),\n` +
        `    displayName VARCHAR(128),\n` +
        `    longName    TEXT,\n` +
        `    type        VARCHAR(12),\n` +
        `    version     INTEGER,\n` + // 版本号
        `    removed     BOOLEAN,\n` +
        `    removed2    BOOLEAN,\n` +
        `    isSaved     BOOLEAN,\n` + // 已保存
        `    isNode      BOOLEAN,\n` + // 是否是对象
        `    isL1Node    BOOLEAN,\n` + // 是否是Package一级对象
        `    isSimple    BOOLEAN,\n` + // 是否是简单对象
        `    isError     BOOLEAN,\n` + // 是否有错
        `    isCache     BOOLEAN,\n` + // 是否缓存
        `    isKeep      BOOLEAN,\n` + // 是否更改留存
        `    expand      BOOLEAN,\n` + // 是否展开节点
        `    variantPoint  CHAR(2),\n` + // 用来存储变体信息
        `    markImport    VARCHAR(12),\n` + // 导入信息进行标记
        `    markExport    VARCHAR(12),\n` + // 导出信息进行标记
        `    sort        INTEGER\n` +
        `);\n`,
      `CREATE INDEX IF NOT EXISTS node_idx_appid ON ${tableNames.projectAppNode}(appId); `,
      `CREATE INDEX IF NOT EXISTS node_idx_tempId ON ${tableNames.projectAppNode}(tempId); `,
      `CREATE INDEX IF NOT EXISTS node_idx_treeId ON ${tableNames.projectAppNode}(treeId); `,
      `CREATE INDEX IF NOT EXISTS node_idx_parentId ON ${tableNames.projectAppNode}(parentId); `,
      `CREATE INDEX IF NOT EXISTS node_idx_rootId ON ${tableNames.projectAppNode}(rootId); `,
      `CREATE INDEX IF NOT EXISTS node_idx_name ON ${tableNames.projectAppNode}(name); `,
      `CREATE INDEX IF NOT EXISTS node_idx_version ON ${tableNames.projectAppNode}(version); `,
      `CREATE INDEX IF NOT EXISTS node_idx_sort ON ${tableNames.projectAppNode}(sort); `
    ]
  },

  // -PROJECT_VIEW--------------------------------------------------------------------------------------------------------
  {
    table: tableNames.projectView,
    sql: [
      `CREATE TABLE IF NOT EXISTS ${tableNames.projectView}(` +
        `    id       CHAR(32) PRIMARY KEY,\n` +
        `    name     VARCHAR(128),\n` +
        `    type     VARCHAR(25),\n` +
        `    column   CHAR(1),\n` +
        `    active   BOOLEAN,\n` +
        `    ext      BOOLEAN\n` +
        `);\n`
    ]
  }
] as const;
