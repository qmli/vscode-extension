# @packages/dbdriver

基于 `@journeyapps/sqlcipher` 的高性能 SQLite 数据库操作库，提供类型安全的数据操作 API，支持加密、连接池、事务等企业级功能。

## 特性

✅ **类型安全** - 完整的 TypeScript 支持，提供类型推断和智能提示
✅ **装饰器支持** - 使用 `@Table()` 装饰器优雅地定义实体类和表映射
✅ **高性能** - 基于连接池的读写分离架构，优化查询性能  
✅ **数据加密** - 支持基于 SQLCipher 的透明数据库加密
✅ **自动建表** - 智能检测字段变化，自动创建表和添加列
✅ **事务支持** - 完整的事务控制，支持嵌套和回滚
✅ **批量操作** - 高效的批量插入、更新和删除操作
✅ **分页查询** - 内置分页支持，优化大数据集查询
✅ **连接管理** - 智能连接池管理，自动清理和重连
✅ **查询构建** - 灵活的查询条件构建器，支持复杂查询
✅ **错误处理** - 完善的错误处理和恢复机制
✅ **软删除支持** - 实体类含 `removed` 属性时，查询自动附加 `removed = 0` 条件，无该属性则不附加

## 安装

```bash
npm install @journeyapps/sqlcipher
```

## 快速开始

### 基本用法

```typescript
import { createDatabase, ConnectionConfig, Table } from '@packages/dbdriver';

// 配置数据库
const config: ConnectionConfig = {
  storage: './data', // 数据库文件存储路径
  database: 'myapp.db', // 数据库文件名
  password: 'your-secret-key', // 加密密钥（可选）
  enableWAL: true, // 启用 WAL 模式
  pool: {
    maxConnections: 10, // 最大连接数
    readerConnections: 5 // 读连接数
  }
};

// 创建数据库实例
const db = createDatabase(config);

// 定义实体类，使用 @Table() 装饰器指定表名
@Table('users')
class User {
  id?: string;
  name?: string;
  email?: string;
  age?: number;
  profile?: {
    avatar: string;
    bio: string;
  };
  created_at?: string;
  updated_at?: string;
}

// 若实体类含有 removed 属性，findOne/findMany/findPage/count 会自动附加 removed = 0 条件（见下方「removed 属性与软删除」）

// 插入数据
const result = await db.insert(User, {
  data: {
    name: '张三',
    email: 'zhangsan@example.com',
    age: 25,
    profile: {
      avatar: 'avatar1.jpg',
      bio: '这是张三的简介'
    }
  }
});

if (result.success) {
  console.log('插入成功！', result.changes);
}
```

### 查询数据

```typescript
// 查询单条记录
const user = await db.findOne(User, {
  conditions: { id: 'user-id-123' }
});

// 查询多条记录
const users = await db.findMany(User, {
  conditions: { age: { $gte: 18 } },
  order: { name: 'created_at', value: 'DESC' }
});

// 分页查询
const result = await db.findPage(
  User,
  1, // 页码
  20, // 每页数量
  {
    conditions: { age: { $between: [18, 65] } },
    order: { name: 'name', value: 'ASC' }
  }
);

console.log(`共 ${result.total} 条记录，当前页 ${result.data.length} 条`);

// 模糊搜索
const searchResults = await db.findMany(User, {
  conditions: {
    name: { $like: '%张%' },
    email: { $like: '%@gmail.com' }
  }
});

// 统计数量
const count = await db.count(User, {
  age: { $gte: 18 }
});
```

### removed 属性与软删除

动态表中，部分表有 `removed` 字段表示软删除（0=未删除，1=已删除），部分表没有该字段。本库通过 **实体类是否含有 `removed` 属性** 自动决定是否在查询时附加 `removed = 0` 条件：

| 实体类                | 行为                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| **有 `removed` 属性** | `findOne`、`findMany`、`findPage`、`count` 自动附加 `removed = 0`，只查未删除数据 |
| **无 `removed` 属性** | 不附加任何软删除条件，按传入的 conditions 正常查询                                |

**定义方式：**

```typescript
// 无 removed 的表 → 不启用软删除，查询不附加 removed 条件
@Table('logs')
class LogEntity {
  id: string = '';
  level: string = '';
  message: string = '';
}

// 有 removed 的表 → 自动启用软删除，查询时自动附加 removed = 0
@Table('projects')
class ProjectEntity {
  id: string = '';
  name: string = '';
  removed: number = 0; // 0=未删除，1=已删除
}
```

**说明：** 装饰器会在加载时实例化实体类并检测是否存在 `removed` 属性，因此建议为 `removed` 写上初始值（如 `removed: number = 0`），以确保运行时能被正确检测。

**查询包含已删除记录（逃生口）：**

需要查全量数据（含已软删除）时，在 `QueryOptions` 中传入 `withDeleted: true`：

```typescript
// 只查未删除（默认）
const list = await db.findMany(ProjectEntity, { conditions: { name: 'test' } });
// SQL: ... WHERE name='test' AND removed=0

// 包含已删除记录
const all = await db.findMany(ProjectEntity, {
  conditions: { name: 'test' },
  withDeleted: true
});
// SQL: ... WHERE name='test'

// count 的第三个参数为 withDeleted
const total = await db.count(ProjectEntity, { status: 1 }); // 仅未删除
const totalAll = await db.count(ProjectEntity, { status: 1 }, true); // 含已删除
```

**自定义软删除字段名：** 若软删除字段不是 `removed`（例如 `is_deleted`，注意：如果字段有`removed` 定义第二参数`is_deleted` 不生效），可通过 `@Table` 的第二个参数显式指定：

```typescript
@Table('tasks', { softDelete: { field: 'is_deleted' } })
class TaskEntity {
  id: string = '';
  is_deleted: number = 0;
}
```

### 更新和删除

```typescript
// 更新数据
const updateResult = await db.update(User, {
  conditions: { id: 'user-id-123' },
  data: {
    age: 26,
    profile: {
      avatar: 'new-avatar.jpg',
      bio: '更新后的简介'
    }
  }
});

// 删除数据
const deleteResult = await db.delete(User, {
  age: { $lt: 18 }
});

console.log(`删除了 ${deleteResult.changes} 条记录`);
```

### 批量操作

```typescript
// 批量插入
const batchResult = await db.batch([
  {
    sql: 'INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)',
    params: ['id1', '用户1', 'user1@example.com', 25]
  },
  {
    sql: 'INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)',
    params: ['id2', '用户2', 'user2@example.com', 30]
  }
]);

if (batchResult.success) {
  console.log(`批量操作成功，影响 ${batchResult.changes} 行`);
}
```

### 动态批量更新 SQL 生成

提供动态生成批量更新 SQL 的功能，支持根据实体类自动获取表名，灵活指定更新字段和条件。

```typescript
import { getTableName } from '@packages/dbdriver';

// 在 Repository 类中定义辅助方法
class TemplateRepository {
  /**
   * 生成批量更新 SQL
   * @param entityClass - 实体类（用于动态获取表名）
   * @param whereField - WHERE 条件的字段名（类型安全，只能是实体类的属性名）
   * @param whereValues - WHERE 条件的值数组
   * @param updateData - 要更新的字段和值
   */
  generateUpdateSQL<T extends new () => unknown>(
    entityClass: T,
    whereField: keyof InstanceType<T>,
    whereValues: (string | number)[],
    updateData: Partial<InstanceType<T>>
  ): BatchEntity {
    // 从实体类动态获取表名
    const tableName = getTableName(entityClass);
    if (!tableName) {
      throw new Error(`Entity ${entityClass.name} missing @Table decorator`);
    }

    // 将 whereField 转换为字符串
    const whereFieldStr = String(whereField);

    // 验证参数
    if (!whereValues?.length || !updateData || !Object.keys(updateData).length) {
      return {
        sql: `UPDATE ${tableName} SET id = ? WHERE 1 = 0`,
        params: []
      };
    }

    // 动态构建 SET 子句
    const setFields = Object.keys(updateData);
    const setClause = setFields.map((field) => `${field} = ?`).join(', ');

    // 构建 WHERE IN 占位符
    const placeholders = whereValues.map(() => '?').join(', ');

    // 生成 SQL
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereFieldStr} IN (${placeholders})`;
    const params = [...Object.values(updateData), ...whereValues];

    return { sql, params };
  }
}

// 使用示例 1：更新多个字段（类型安全）
const updateSQL = repository.generateUpdateSQL(
  AppTemplateEntity,
  'name', // ✅ 类型检查：IDE 会自动补全 AppTemplateEntity 的属性名
  ['Component', 'Service', 'Module'],
  {
    alias: 'common', // ✅ 只能设置 AppTemplateEntity 中存在的字段
    lowerBound: '0',
    upperBound: '100',
    init: true
  }
);

// 使用 batch 执行
await db.batch([updateSQL]);

// 使用示例 2：只更新部分字段
const partialUpdateSQL = repository.generateUpdateSQL(User, 'id', ['user-123', 'user-456'], {
  status: 'active',
  updated_at: new Date().toISOString()
});

// 使用示例 3：按不同条件批量更新
const sqlBatch = [
  repository.generateUpdateSQL(User, 'email', ['user1@gmail.com', 'user2@gmail.com'], { verified: true }),
  repository.generateUpdateSQL(User, 'age', ['18', '19', '20'], { category: 'young_adult' })
];

await db.batch(sqlBatch);
```

**功能特点：**

- ✅ **动态表名** - 自动从实体类装饰器获取表名
- ✅ **灵活字段** - 可更新任意字段，不限于固定列
- ✅ **完全类型安全** - 使用 `keyof` 约束字段名，IDE 提供自动补全和错误检查
- ✅ **批量支持** - 配合 `batch()` 实现高效批量更新
- ✅ **多条件** - 支持不同字段作为 WHERE 条件，且字段名必须是实体类的真实属性

### 动态批量删除 SQL 生成

提供动态生成批量删除 SQL 的功能，根据实体类自动获取表名，支持类型安全的条件字段。

```typescript
import { getTableName } from '@packages/dbdriver';

// 在 Repository 类中定义辅助方法
class TemplateRepository {
  /**
   * 生成批量删除 SQL
   * @param entityClass - 实体类（用于动态获取表名）
   * @param whereField - WHERE 条件的字段名（类型安全）
   * @param whereValues - WHERE 条件的值数组
   */
  generateDeleteSQL<T extends new () => unknown>(
    entityClass: T,
    whereField: keyof InstanceType<T>,
    whereValues: (string | number)[]
  ): BatchEntity {
    const tableName = getTableName(entityClass);
    if (!tableName) {
      throw new Error(`Entity ${entityClass.name} missing @Table decorator`);
    }

    const whereFieldStr = String(whereField);

    // 验证参数
    if (!whereValues || whereValues.length === 0) {
      return {
        sql: `DELETE FROM ${tableName} WHERE 1 = 0`,
        params: []
      };
    }

    // 构建 WHERE IN 占位符
    const placeholders = whereValues.map(() => '?').join(', ');

    // 生成 SQL
    const sql = `DELETE FROM ${tableName} WHERE ${whereFieldStr} IN (${placeholders})`;
    const params = [...whereValues];

    return { sql, params };
  }
}

// 使用示例 1：按名称批量删除
const deleteSQL = repository.generateDeleteSQL(
  AppTemplateEntity,
  'name', // ✅ 类型安全：只能是 AppTemplateEntity 的属性
  ['Component', 'Service', 'Module']
);

await db.batch([deleteSQL]);

// 使用示例 2：按 ID 批量删除
const deleteByIdSQL = repository.generateDeleteSQL(User, 'id', ['user-123', 'user-456', 'user-789']);

// 使用示例 3：批量删除多个条件
const deleteBatch = [
  repository.generateDeleteSQL(User, 'email', ['spam@example.com', 'test@example.com']),
  repository.generateDeleteSQL(User, 'status', ['deleted', 'banned'])
];

await db.batch(deleteBatch);
```

**功能特点：**

- ✅ **动态表名** - 自动从实体类装饰器获取表名
- ✅ **类型安全** - 使用 `keyof` 确保字段名正确
- ✅ **批量删除** - 支持一次删除多条记录
- ✅ **防误删** - 空值数组返回无效 SQL，防止误删全表

### 动态插入 SQL 生成

提供动态生成插入 SQL 的功能，自动根据实体数据生成对应的 INSERT 语句。

```typescript
import { getTableName } from '@packages/dbdriver';

// 在 Repository 类中定义辅助方法
class TemplateRepository {
  /**
   * 生成插入 SQL
   * @param entityClass - 实体类（用于动态获取表名）
   * @param data - 要插入的数据对象
   */
  generateInsertSQL<T extends new () => unknown>(entityClass: T, data: Partial<InstanceType<T>>): BatchEntity {
    const tableName = getTableName(entityClass);
    if (!tableName) {
      throw new Error(`Entity ${entityClass.name} missing @Table decorator`);
    }

    // 提取字段名和值
    const fields = Object.keys(data);
    const values = Object.values(data);

    // 构建占位符
    const placeholders = values.map(() => '?').join(', ');

    // 生成 SQL
    const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const params = [...values];

    return { sql, params };
  }
}

// 使用示例 1：插入单条记录
const insertSQL = repository.generateInsertSQL(AppTemplateEntity, {
  id: 'uuid-123',
  name: 'Component',
  alias: 'comp',
  lowerBound: '0',
  upperBound: '100',
  init: true
});

await db.batch([insertSQL]);

// 使用示例 2：批量插入多条记录
const insertBatch = [
  repository.generateInsertSQL(User, {
    id: 'user-1',
    name: '张三',
    email: 'zhangsan@example.com',
    age: 25
  }),
  repository.generateInsertSQL(User, {
    id: 'user-2',
    name: '李四',
    email: 'lisi@example.com',
    age: 30
  }),
  repository.generateInsertSQL(User, {
    id: 'user-3',
    name: '王五',
    email: 'wangwu@example.com',
    age: 28
  })
];

await db.batch(insertBatch);

// 使用示例 3：部分字段插入
const partialInsertSQL = repository.generateInsertSQL(User, {
  id: 'user-4',
  name: '赵六' // 只插入部分字段
});

await db.batch([partialInsertSQL]);
```

**功能特点：**

- ✅ **动态表名** - 自动从实体类装饰器获取表名
- ✅ **类型安全** - 数据对象必须符合实体类定义
- ✅ **灵活字段** - 可插入实体的任意字段组合
- ✅ **批量插入** - 配合 `batch()` 实现高效批量插入

### 事务操作

```typescript
const transactionResult = await db.transaction(async () => {
  // 在事务中执行多个操作
  await db.insert(User, {
    data: { name: '事务用户1', email: 'tx1@example.com' }
  });

  await db.update(User, {
    conditions: { email: 'old@example.com' },
    data: { email: 'new@example.com' }
  });

  // 如果任何操作失败，整个事务会自动回滚
});

if (transactionResult.success) {
  console.log('事务执行成功');
}
```

### 原始 SQL 查询

```typescript
// 执行查询
const customResults = await db.query<{ name: string; count: number }>(
  'SELECT name, COUNT(*) as count FROM users GROUP BY name HAVING COUNT(*) > ?',
  [1]
);

// 执行命令
const execResult = await db.execute('UPDATE users SET updated_at = ? WHERE created_at < ?', [
  new Date().toISOString(),
  '2023-01-01'
]);
```

### 执行 SQL 脚本文件

支持从本地文件系统读取并执行 SQL 脚本，自动在事务中执行，确保数据一致性。

```typescript
// 执行单个 SQL 脚本文件
await db.runSqlScript('./scripts/init.sql');

// 执行多个脚本文件（按顺序）
await db.runSqlScript('./scripts/01_create_tables.sql');
await db.runSqlScript('./scripts/02_insert_data.sql');
await db.runSqlScript('./scripts/03_create_indexes.sql');

// 在初始化流程中使用
async function initDatabase() {
  const db = createDatabase(config);

  try {
    // 执行初始化脚本
    await db.runSqlScript('./scripts/schema.sql');
    await db.runSqlScript('./scripts/seed_data.sql');
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}
```

**功能特点：**

- ✅ **事务保护** - 自动在事务中执行，失败自动回滚
- ✅ **文件验证** - 验证文件路径和格式（必须是 .sql 文件）
- ✅ **错误处理** - 详细的错误信息，便于调试
- ✅ **批量执行** - 支持执行包含多条 SQL 语句的脚本文件

## 高级查询条件

支持丰富的查询操作符：

```typescript
const users = await db.findMany(User, {
  conditions: {
    age: { $gte: 18, $lt: 65 }, // 年龄在 18-65 之间
    name: { $like: '%张%' }, // 姓名包含"张"
    email: { $in: ['@gmail.com', '@qq.com'] }, // 邮箱包含指定域名
    status: { $ne: 'deleted' }, // 状态不等于"deleted"
    profile: { $isNotNull: true }, // profile字段不为空
    tags: { $nin: ['spam', 'blocked'] } // tags不在黑名单中
  }
});
```

支持的操作符：

- `$eq` - 等于
- `$ne` - 不等于
- `$gt` - 大于
- `$gte` - 大于等于
- `$lt` - 小于
- `$lte` - 小于等于
- `$like` - 模糊匹配
- `$in` - 在列表中
- `$nin` - 不在列表中
- `$between` - 在范围内
- `$isNull` - 为空
- `$isNotNull` - 不为空

## 连接池管理

```typescript
// 获取连接池状态
const status = db.getStatus();
console.log('连接池状态：', {
  写连接: status.writeConnection,
  读连接: status.readConnections,
  配置: status.config
});

// 优化数据库
const optimizeResult = await db.optimize();
if (optimizeResult.success) {
  console.log('数据库优化完成');
}

// 关闭数据库连接
await db.close();
```

## 配置选项

### ConnectionConfig

```typescript
interface ConnectionConfig {
  storage: string; // 数据库文件存储路径
  database: string; // 数据库文件名
  password?: string; // 加密密钥，留空则不加密
  enableWAL?: boolean; // 启用 WAL 模式，默认 true
  pool?: {
    maxConnections?: number; // 最大连接数，默认 10
    readerConnections?: number; // 读连接数，默认 5
  };
}
```

### WAL 模式优化

启用 WAL 模式后，会自动配置以下优化参数：

- `journal_mode = WAL` - 使用 WAL 日志模式
- `synchronous = NORMAL` - 平衡性能和安全性
- `cache_size = -20000` - 20MB 内存缓存
- `page_size = 8192` - 8KB 页面大小
- `temp_store = MEMORY` - 临时数据存储在内存
- `mmap_size = 256MB` - 内存映射大小
- `wal_autocheckpoint = 1000` - 自动检查点

## API 参考

### Database 类

#### 基础操作

- `insert<T>(entityClass: T, options: InsertOptions<InstanceType<T>>): Promise<OperationResult>` - 插入数据
- `update<T>(entityClass: T, options: UpdateOptions<InstanceType<T>>): Promise<OperationResult>` - 更新数据
- `delete<T>(entityClass: T, conditions: { [key: string]: unknown }): Promise<OperationResult>` - 删除数据
- `findOne<T>(entityClass: T, options?: QueryOptions): Promise<InstanceType<T> | null>` - 查询单条记录（实体含 `removed` 时自动附加 `removed = 0`）
- `findMany<T>(entityClass: T, options?: QueryOptions): Promise<InstanceType<T>[]>` - 查询多条记录（同上）
- `findPage<T>(entityClass: T, page: number, size: number, options?: QueryOptions): Promise<QueryResult<InstanceType<T>>>` - 分页查询（同上）
- `count<T>(entityClass: T, conditions?: { [key: string]: unknown }, withDeleted?: boolean): Promise<number>` - 统计数量；`withDeleted === true` 时包含已软删除记录

#### 高级操作

- `query<R>(sql: string, params?: any[]): Promise<R[]>` - 执行查询SQL
- `execute(sql: string, params?: any[]): Promise<OperationResult>` - 执行命令SQL
- `batch(entities: BatchEntity[]): Promise<OperationResult>` - 批量操作
- `transaction(operations: () => Promise<void>): Promise<OperationResult>` - 事务操作
- `truncate(tableName: string): Promise<OperationResult>` - 清空表
- `runSqlScript(sqlScriptPath: string): Promise<void>` - 执行 SQL 脚本文件

#### 工具方法

- `tableExists(tableName: string): Promise<boolean>` - 检查表是否存在
- `getTableInfo(tableName: string): Promise<any[]>` - 获取表结构
- `optimize(): Promise<OperationResult>` - 优化数据库
- `getStatus()` - 获取连接池状态
- `close(): Promise<void>` - 关闭连接

#### 实体类工具函数

- `getTableName<T>(entityClass: T): string | undefined` - 从实体类获取表名
- `hasTableName<T>(entityClass: T): boolean` - 检查实体类是否已注册表名
- `getSoftDeleteConfig<T>(entityClass: T): Required<SoftDeleteConfig> | undefined` - 获取实体类的软删除配置（含 `removed` 或显式配置时返回，否则 `undefined`）
- `Table(tableName: string, config?: TableConfig)` - 表装饰器；自动检测实体是否含 `removed` 属性以决定是否启用软删除；`config.softDelete` 可指定自定义软删除字段名

#### SQL 生成器方法

- `generateUpdateSQL<T>(entityClass: T, whereField: keyof InstanceType<T>, whereValues: (string | number)[], updateData: Partial<InstanceType<T>>): BatchEntity` - 生成批量更新 SQL
- `generateDeleteSQL<T>(entityClass: T, whereField: keyof InstanceType<T>, whereValues: (string | number)[]): BatchEntity` - 生成批量删除 SQL
- `generateInsertSQL<T>(entityClass: T, data: Partial<InstanceType<T>>): BatchEntity` - 生成插入 SQL

这些方法提供类型安全的 SQL 生成功能，自动从实体类获取表名，支持与 `batch()` 方法配合使用。

## 最佳实践

### 1. 连接管理

```typescript
// 应用启动时创建数据库实例
const db = createDatabase(config);

// 应用关闭时释放连接
process.on('SIGTERM', async () => {
  await db.close();
  process.exit(0);
});
```

### 2. 错误处理

```typescript
try {
  const result = await db.insert(User, { data: userData });
  if (!result.success) {
    console.error('插入失败：', result.error);
  }
} catch (error) {
  console.error('数据库操作异常：', error);
}
```

### 3. 大批量操作

```typescript
// 对于大量数据，使用事务和批量操作
await db.transaction(async () => {
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.batch(
      batch.map((item) => ({
        sql: 'INSERT INTO table (col1, col2) VALUES (?, ?)',
        params: [item.col1, item.col2]
      }))
    );
  }
});
```

### 4. 数据验证

```typescript
// 插入前验证数据
const userData = {
  name: name?.trim(),
  email: email?.toLowerCase(),
  age: age > 0 ? age : null
};

if (!userData.name || !userData.email) {
  throw new Error('姓名和邮箱不能为空');
}

await db.insert(User, { data: userData });
```

### 5. 实体类定义

```typescript
// 使用 @Table() 装饰器定义实体类（无 removed 的表，查询不附加软删除条件）
@Table('users')
class User {
  id?: string;
  name?: string;
  email?: string;
  age?: number;
  created_at?: string;
  updated_at?: string;
}

// 含 removed 的表：findOne/findMany/findPage/count 会自动附加 removed = 0
@Table('projects')
class Project {
  id?: string;
  name?: string;
  removed: number = 0;
  created_at?: string;
  updated_at?: string;
}

// 使用实体类进行操作
const user = await db.findOne(User, { conditions: { id: '123' } });
const projects = await db.findMany(Project, { conditions: { name: 'test' } }); // 自动过滤 removed=0
```

## 性能优化建议

1. **启用 WAL 模式** - 提升并发读写性能
2. **合理设置连接池** - 根据应用负载调整连接数
3. **使用批量操作** - 大量数据操作时使用批量API
4. **善用事务** - 相关操作放在同一事务中
5. **定期优化** - 调用 `optimize()` 方法维护数据库性能
6. **索引优化** - 为常用查询条件添加索引
