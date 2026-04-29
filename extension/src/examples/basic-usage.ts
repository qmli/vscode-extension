// import { Container } from '@/container';
// import { ProjectEntity } from '@/entitys/project.entity';
// import { ProjectRepository } from '@/entitys/project.repository';
import type { ConnectionConfig, Database } from '@orientais/dbdriver';
import { createDatabase, generateUUID, Table } from '@orientais/dbdriver';
import { Logger } from '@orientais/vscode-core';
import * as vscode from 'vscode';

// 用户实体类
@Table('users', { softDelete: { field: 'is_deleted' } })
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
  is_deleted?: number;
}

/**
 * 基本用法示例
 */
export class BasicUsageExample {
  private db: Database;
  private outputChannel: vscode.OutputChannel;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // 创建输出通道
    this.outputChannel = vscode.window.createOutputChannel('数据库示例');
    context.subscriptions.push(this.outputChannel);

    // 获取数据库存储路径
    const storageUri =
      context.globalStorageUri ||
      (context.globalStoragePath ? vscode.Uri.file(context.globalStoragePath) : context.extensionUri);
    const dbPath = vscode.Uri.joinPath(storageUri, 'dbdriver-example');

    // 数据库配置
    const config: ConnectionConfig = {
      storage: dbPath.fsPath,
      database: 'users.db',
      password: 'your-encryption-key', // 可选的加密密钥
      enableWAL: true,
      pool: {
        maxConnections: 10,
        readerConnections: 5
      }
    };

    // 创建数据库实例（不再需要默认表名，因为使用装饰器）
    this.db = createDatabase(config);
  }

  /**
   * 示例：插入用户
   */
  async insertUser(userData: Partial<User>): Promise<void> {
    const result = await this.db.insert(User, {
      data: {
        name: userData.name,
        email: userData.email,
        age: userData.age,
        profile: userData.profile
      }
    });

    if (result.success) {
      const message = `用户插入成功！ID: ${result.lastInsertRowid}, 影响行数: ${result.changes}`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage('用户插入成功！');
    } else {
      const errorMessage = `用户插入失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(`用户插入失败：${result.error}`);
    }
  }

  /**
   * 示例：根据ID查询用户
   */
  async findUserById(id: string): Promise<User | null> {
    const user = await this.db.findOne(User, {
      conditions: { id: id }
    });

    if (user) {
      const message = `找到用户：${JSON.stringify(user, null, 2)}`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
    } else {
      const message = '用户不存在';
      Logger.warn(message);
      this.outputChannel.appendLine(message);
    }

    return user;
  }

  /**
   * 示例：根据邮箱查询用户
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.db.findOne(User, {
      conditions: { email: email }
    });
  }

  /**
   * 示例：查询所有用户
   */
  async findAllUsers(): Promise<User[]> {
    const users = await this.db.findMany(User, {
      order: { name: 'created_at', value: 'DESC' },
      withDeleted: true
    });
    const message = `找到 ${users.length} 个用户`;
    Logger.log(message);
    this.outputChannel.appendLine(message);

    if (users.length > 0) {
      const formattedResult = users
        .map((user: User) => `ID: ${user.id}, 姓名: ${user.name}, 邮箱: ${user.email}, 年龄: ${user.age || 'N/A'}`)
        .join('\n');
      this.outputChannel.appendLine(formattedResult);
      this.outputChannel.show();
    }

    return users;
  }

  /**
   * 示例：分页查询用户
   */
  async findUsersPage(page: number = 1, size: number = 10): Promise<void> {
    const result = await this.db.findPage(User, page, size, {
      order: { name: 'created_at', value: 'DESC' }
    });

    if (result.success) {
      const message = `第 ${page} 页，共 ${result.total} 条记录`;
      Logger.log(message);
      this.outputChannel.appendLine(message);

      result.data.forEach((user: User) => {
        const line = `- ${user.name || 'N/A'} (${user.email || 'N/A'})`;
        Logger.debug(line);
        this.outputChannel.appendLine(line);
      });

      this.outputChannel.show();
    } else {
      const errorMessage = `分页查询失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：搜索用户（模糊匹配）
   */
  async searchUsers(keyword: string): Promise<User[]> {
    return this.db.findMany(User, {
      conditions: {
        name: { $like: `%${keyword}%` }
      }
    });
  }

  /**
   * 示例：按年龄范围查询用户
   */
  async findUsersByAgeRange(minAge: number, maxAge: number): Promise<User[]> {
    return this.db.findMany(User, {
      conditions: {
        age: { $between: [minAge, maxAge] }
      },
      order: { name: 'age', value: 'ASC' }
    });
  }

  /**
   * 示例：更新用户信息
   */
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const result = await this.db.update(User, {
      conditions: { id: id },
      data: updates
    });

    if (result.success) {
      const message = `用户更新成功，影响 ${result.changes} 行`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage(message);
    } else {
      const errorMessage = `用户更新失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：删除用户
   */
  async deleteUser(id: string): Promise<void> {
    const result = await this.db.delete(User, {
      id: id
    });

    if (result.success) {
      const message = `用户删除成功，影响 ${result.changes} 行`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage(message);
    } else {
      const errorMessage = `用户删除失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：批量操作
   */
  async batchInsertUsers(users: Partial<User>[]): Promise<void> {
    const batchEntities = users.map((user) => ({
      sql: 'INSERT INTO users (id, name, email, age, profile) VALUES (?, ?, ?, ?, ?)',
      params: [user.id, user.name, user.email, user.age || null, user.profile ? JSON.stringify(user.profile) : null]
    }));

    const result = await this.db.batch(batchEntities);

    if (result.success) {
      const message = `批量插入成功，影响 ${result.changes} 行`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage(message);
    } else {
      const errorMessage = `批量插入失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：事务操作
   */
  async transferUserData(fromUserId: string, toUserId: string): Promise<void> {
    const result = await this.db.transaction(async () => {
      // 在这里执行多个相关操作
      // 如果任何一个操作失败，整个事务都会回滚

      const fromUser = await this.db.findOne(User, {
        conditions: { id: fromUserId }
      });

      if (!fromUser) {
        throw new Error('源用户不存在');
      }

      const toUser = await this.db.findOne(User, {
        conditions: { id: toUserId }
      });

      if (!toUser) {
        throw new Error('目标用户不存在');
      }

      // 执行一些业务逻辑...
      const message = `从 ${fromUser.name} 转移数据到 ${toUser.name}`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
    });

    if (result.success) {
      const message = '事务执行成功';
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage(message);
    } else {
      const errorMessage = `事务执行失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：事务操作 - 批量操作成功
   */
  async transferUserData1(userIds: string[]): Promise<void> {
    const result = await this.db.transaction(async () => {
      // 批量操作：更新多个用户信息
      for (const userId of userIds) {
        const user = await this.db.findOne(User, {
          conditions: { id: userId }
        });

        if (!user) {
          throw new Error(`用户 ${userId} 不存在`);
        }

        // 更新用户信息
        const updateResult = await this.db.update(User, {
          conditions: { id: userId },
          data: {
            updated_at: new Date().toISOString()
          }
        });

        if (!updateResult.success) {
          throw new Error(`更新用户 ${userId} 失败：${updateResult.error}`);
        }

        Logger.log(`成功更新用户：${user.name} (${userId})`);
        this.outputChannel.appendLine(`成功更新用户：${user.name} (${userId})`);
      }

      // 批量插入新用户
      const newUsers = [
        { name: '事务用户1', email: 'transaction1@example.com', age: 25 },
        { name: '事务用户2', email: 'transaction2@example.com', age: 30 }
      ];

      for (const userData of newUsers) {
        const insertResult = await this.db.insert(User, {
          data: userData
        });

        if (!insertResult.success) {
          throw new Error(`插入用户失败：${insertResult.error}`);
        }

        Logger.log(`成功插入用户：${userData.name} (${insertResult.id})`);
        this.outputChannel.appendLine(`成功插入用户：${userData.name} (${insertResult.id})`);
      }

      const message = `批量操作完成：更新了 ${userIds.length} 个用户，插入了 ${newUsers.length} 个新用户`;
      Logger.log(message);
      this.outputChannel.appendLine(message);
    });

    if (result.success) {
      const message = '事务执行成功：所有批量操作已完成';
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage(message);
    } else {
      const errorMessage = `事务执行失败：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：事务操作 - 一个删除失败导致回滚
   */
  async transferUserData2(userIds: string[]): Promise<void> {
    const result = await this.db.transaction(async () => {
      // 先执行一些成功的操作
      for (const userId of userIds) {
        const user = await this.db.findOne(User, {
          conditions: { id: userId }
        });

        if (!user) {
          throw new Error(`用户 ${userId} 不存在`);
        }

        // 更新用户信息（这个操作会成功）
        const updateResult = await this.db.update(User, {
          conditions: { id: userId },
          data: {
            updated_at: new Date().toISOString()
          }
        });

        if (!updateResult.success) {
          throw new Error(`更新用户 ${userId} 失败：${updateResult.error}`);
        }

        Logger.log(`成功更新用户：${user.name} (${userId})`);
        this.outputChannel.appendLine(`成功更新用户：${user.name} (${userId})`);
      }

      // 插入一个新用户（这个操作会成功）
      const insertResult = await this.db.insert(User, {
        data: {
          name: '事务测试用户',
          email: 'transaction-test@example.com',
          age: 28
        }
      });

      if (!insertResult.success) {
        throw new Error(`插入用户失败：${insertResult.error}`);
      }

      Logger.log(`成功插入用户：事务测试用户 (${insertResult.id})`);
      this.outputChannel.appendLine(`成功插入用户：事务测试用户 (${insertResult.id})`);

      // 尝试删除一个不存在的用户（这个操作会失败，导致整个事务回滚）
      const nonExistentUserId = generateUUID(); // 生成一个不存在的ID
      const deleteResult = await this.db.delete(User, {
        id: nonExistentUserId
      });

      // 检查删除是否真的影响了行（如果删除0行，说明用户不存在）
      if (deleteResult.success && deleteResult.changes === 0) {
        throw new Error(`删除失败：用户 ${nonExistentUserId} 不存在，影响行数为 0`);
      }

      if (!deleteResult.success) {
        throw new Error(`删除用户失败：${deleteResult.error}`);
      }

      Logger.log(`成功删除用户：${nonExistentUserId}`);
      this.outputChannel.appendLine(`成功删除用户：${nonExistentUserId}`);
    });

    if (result.success) {
      const message = '事务执行成功';
      Logger.log(message);
      this.outputChannel.appendLine(message);
      vscode.window.showInformationMessage(message);
    } else {
      const errorMessage = `事务执行失败，所有操作已回滚：${result.error}`;
      Logger.error(errorMessage);
      this.outputChannel.appendLine(errorMessage);
      this.outputChannel.appendLine('注意：由于删除操作失败，之前的所有更新和插入操作都已回滚');
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * 示例：统计用户数量
   */
  async getUserStats(): Promise<void> {
    // 总用户数
    const totalUsers = await this.db.count(User);

    // 有邮箱的用户数
    const usersWithEmail = await this.db.count(User, {
      email: { $ne: null }
    });

    // 年龄大于等于18的用户数
    const adultUsers = await this.db.count(User, {
      age: { $gte: 18 }
    });

    const stats = {
      总用户数: totalUsers,
      有邮箱用户数: usersWithEmail,
      成年用户数: adultUsers
    };

    const message = `用户统计：${JSON.stringify(stats, null, 2)}`;
    Logger.log(message);
    this.outputChannel.appendLine(message);
    this.outputChannel.show();
  }

  /**
   * 示例：执行原始SQL
   */
  async customQuery(): Promise<void> {
    // 执行自定义查询
    const results = await this.db.query<{ name: string; count: number }>(
      'SELECT name, COUNT(*) as count FROM users GROUP BY name HAVING COUNT(*) > 1'
    );

    const message = `重名用户：${JSON.stringify(results, null, 2)}`;
    Logger.log(message);
    this.outputChannel.appendLine(message);
    this.outputChannel.show();
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    await this.db.close();
    const message = '数据库连接已关闭';
    Logger.debug(message);
    this.outputChannel.appendLine(message);
  }
}

/**
 * 运行示例
 */
export async function runExample(context: vscode.ExtensionContext): Promise<void> {
  const example = new BasicUsageExample(context);
  Logger.log('========================================');
  Logger.log('开始运行基本用法示例...');
  Logger.log('========================================');

  try {
    // ========== 1. 插入用户示例 ==========
    await runExample1(example);
    // ========== 2. 批量插入用户示例 ==========
    // await runExample2(example);
    // ========== 3. 查询所有用户 ==========
    const allUsers = await runExample3(example);

    // ========== 4. 根据ID查询用户 ==========
    if (allUsers.length > 0 && allUsers[0].id) {
      await runExample4(example, allUsers[0].id);
    }

    // ========== 5. 根据邮箱查询用户 ==========
    await runExample5(example);

    // ========== 6. 分页查询用户 ==========
    await runExample6(example);

    // ========== 7. 搜索用户（模糊匹配） ==========
    await runExample7(example);

    // ========== 8. 按年龄范围查询用户 ==========
    await runExample8(example);

    // ========== 9. 更新用户信息 ==========
    if (allUsers.length > 0 && allUsers[0].id) {
      await runExample9(example, allUsers[0].id);
    }

    // ========== 10. 统计用户数量 ==========
    await runExample10(example);

    // ========== 11. 执行原始SQL查询 ==========
    await runExample11(example);

    // ========== 12. 事务操作示例 ==========
    if (allUsers.length >= 2 && allUsers[0].id && allUsers[1].id) {
      await runExample12(example, allUsers[0].id, allUsers[1].id);
    }

    // ========== 13. 删除用户 ==========
    if (allUsers.length > 0 && allUsers[allUsers.length - 1].id) {
      await runExample13(example, allUsers[allUsers.length - 1].id as string);
    }

    // ========== 14. 最终统计 ==========
    await runExample14(example);

    Logger.log('\n========================================');
    Logger.log('所有示例运行完成！');
    Logger.log('========================================');
    vscode.window.showInformationMessage('所有数据库示例运行完成！');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`示例运行出错：${errorMessage}`);
    vscode.window.showErrorMessage(`示例运行出错：${errorMessage}`);
  } finally {
    // ========== 15. 关闭数据库 ==========
    Logger.log('\n>>> 15. 关闭数据库连接');
    await example.close();
  }
}

/**
 * 示例1：插入单个用户
 */
async function runExample1(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 1. 插入用户示例');
  const user1 = new User();
  user1.name = '张三';
  user1.email = 'zhangsan@example.com';
  user1.age = 25;
  user1.profile = {
    avatar: 'avatar1.jpg',
    bio: '这是张三的简介'
  };
  await example.insertUser(user1);

  const user2 = new User();
  user2.name = '李四';
  user2.email = 'lisi@example.com';
  user2.age = 30;
  await example.insertUser(user2);

  await example.insertUser({
    name: '王五',
    email: 'wangwu@example.com',
    age: 35,
    profile: {
      avatar: 'avatar3.jpg',
      bio: '这是王五的简介'
    }
  });
}

/**
 * 示例2：批量插入用户
 */
// async function runExample2(example: BasicUsageExample): Promise<void> {
//   Logger.log('\n>>> 2. 批量插入用户示例');
//   await example.batchInsertUsers([
//     { id: generateUUID(), name: '赵六', email: 'zhaoliu@example.com', age: 28 },
//     { id: generateUUID(), name: '孙七', email: 'sunqi@example.com', age: 22 },
//     { id: generateUUID(), name: '周八', email: 'zhouba@example.com', age: 40 }
//   ]);
// }

/**
 * 示例3：查询所有用户
 */
async function runExample3(example: BasicUsageExample): Promise<User[]> {
  Logger.log('\n>>> 3. 查询所有用户');
  return example.findAllUsers();
}

/**
 * 示例4：根据ID查询用户
 */
async function runExample4(example: BasicUsageExample, userId: string): Promise<void> {
  Logger.log('\n>>> 4. 根据ID查询用户');
  await example.findUserById(userId);
}

/**
 * 示例5：根据邮箱查询用户
 */
async function runExample5(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 5. 根据邮箱查询用户');
  const userByEmail = await example.findUserByEmail('zhangsan@example.com');
  if (userByEmail) {
    Logger.log(`通过邮箱找到用户：${userByEmail.name} (${userByEmail.email})`);
  }
}

/**
 * 示例6：分页查询用户
 */
async function runExample6(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 6. 分页查询用户 - 第1页');
  await example.findUsersPage(1, 3);

  Logger.log('\n>>> 6. 分页查询用户 - 第2页');
  await example.findUsersPage(2, 3);
}

/**
 * 示例7：搜索用户（模糊匹配）
 */
async function runExample7(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 7. 搜索用户（模糊匹配名字包含"张"）');
  const searchResults = await example.searchUsers('张');
  Logger.log(`搜索结果：${JSON.stringify(searchResults, null, 2)}`);

  Logger.log('\n>>> 7. 搜索用户（模糊匹配名字包含"六"）');
  const searchResults2 = await example.searchUsers('六');
  Logger.log(`搜索结果：${JSON.stringify(searchResults2, null, 2)}`);
}

/**
 * 示例8：按年龄范围查询用户
 */
async function runExample8(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 8. 按年龄范围查询用户 (20-30岁)');
  const ageRangeResults = await example.findUsersByAgeRange(20, 30);
  Logger.log(`年龄范围查询结果：${JSON.stringify(ageRangeResults, null, 2)}`);

  Logger.log('\n>>> 8. 按年龄范围查询用户 (30-40岁)');
  const ageRangeResults2 = await example.findUsersByAgeRange(30, 40);
  Logger.log(`年龄范围查询结果：${JSON.stringify(ageRangeResults2, null, 2)}`);
}

/**
 * 示例9：更新用户信息
 */
async function runExample9(example: BasicUsageExample, userId: string): Promise<void> {
  Logger.log('\n>>> 9. 更新用户信息');
  await example.updateUser(userId, {
    age: 26,
    profile: {
      avatar: 'new-avatar.jpg',
      bio: '更新后的简介'
    }
  });

  // 验证更新结果
  Logger.log('\n>>> 9. 验证更新结果');
  await example.findUserById(userId);
}

/**
 * 示例10：统计用户数量
 */
async function runExample10(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 10. 统计用户数量');
  await example.getUserStats();
}

/**
 * 示例11：执行原始SQL查询
 */
async function runExample11(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 11. 执行原始SQL查询（查找重名用户）');
  await example.customQuery();
}

/**
 * 示例12：事务操作示例
 */
async function runExample12(example: BasicUsageExample, fromUserId: string, toUserId: string): Promise<void> {
  Logger.log('\n>>> 12. 事务操作示例');
  await example.transferUserData(fromUserId, toUserId);
  await example.transferUserData1([fromUserId, toUserId]);
  await example.transferUserData2([fromUserId, toUserId]);
}

/**
 * 示例13：删除用户
 */
async function runExample13(example: BasicUsageExample, userId: string): Promise<void> {
  Logger.log('\n>>> 13. 删除用户');
  await example.deleteUser(userId);

  // 验证删除后的用户列表
  Logger.log('\n>>> 13. 删除后查询所有用户');
  await example.findAllUsers();
}

/**
 * 示例14：最终统计
 */
async function runExample14(example: BasicUsageExample): Promise<void> {
  Logger.log('\n>>> 14. 最终统计');
  await example.getUserStats();
}

// // 方式1：使用 Repository（推荐）
// async function example1() {
//   const repo = new ProjectRepository();

//   // 插入项目
//   const projectId = await repo.insert({
//     name: '我的项目',
//     version: '1.0.0',
//     path: '/path/to/project'
//   });

//   // 查询项目
//   const project = await repo.findById(projectId!);
// }

// // 方式2：直接使用数据库服务
// async function example2() {
//   const dbService = Container.instance.database;
//   const db = await dbService.getDatabase();

//   // 直接操作
//   const result = await db.insert(ProjectEntity, {
//     data: {
//       name: '我的项目',
//       version: '1.0.0'
//     }
//   });

//   const projects = await db.findMany(ProjectEntity, {
//     conditions: { name: { $like: '%项目%' } }
//   });
// }
