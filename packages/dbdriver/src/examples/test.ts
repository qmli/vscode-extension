import { createDatabase, ConnectionConfig, Table } from '../index';
import * as path from 'path';
import * as os from 'os';

// 测试实体类，使用 @Table() 装饰器指定表名
@Table('test_users')
class TestUser {
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

/**
 * API 功能测试
 */
export async function testAPI(): Promise<void> {
  console.log('🚀 开始测试 @packages/dbdriver API 功能...\n');

  // 数据库配置
  const config: ConnectionConfig = {
    storage: path.join(os.tmpdir(), 'dbdriver-test'),
    database: 'test.db',
    password: 'test-encryption-key',
    enableWAL: true,
    pool: {
      maxConnections: 5,
      readerConnections: 3
    }
  };

  // 创建数据库实例（不再需要默认表名，因为使用装饰器）
  const db = createDatabase(config);

  try {
    // 1. 测试插入功能
    console.log('📝 测试插入功能...');
    const insertResult = await db.insert(TestUser, {
      data: {
        name: '测试用户1',
        email: 'test1@example.com',
        age: 25,
        profile: {
          avatar: 'avatar1.jpg',
          bio: '这是测试用户1的简介'
        }
      }
    });

    if (insertResult.success) {
      console.log('✅ 插入成功！影响行数:', insertResult.changes);
    } else {
      console.log('❌ 插入失败:', insertResult.error);
      return;
    }

    // 2. 测试批量插入
    console.log('\n📝 测试批量插入功能...');
    const batchResult = await db.batch([
      {
        sql: 'INSERT INTO test_users (id, name, email, age) VALUES (?, ?, ?, ?)',
        params: ['user2', '测试用户2', 'test2@example.com', 30]
      },
      {
        sql: 'INSERT INTO test_users (id, name, email, age) VALUES (?, ?, ?, ?)',
        params: ['user3', '测试用户3', 'test3@example.com', 35]
      }
    ]);

    if (batchResult.success) {
      console.log('✅ 批量插入成功！影响行数:', batchResult.changes);
    } else {
      console.log('❌ 批量插入失败:', batchResult.error);
    }

    // 3. 测试查询功能
    console.log('\n🔍 测试查询功能...');
    const users = await db.findMany(TestUser, {
      order: { name: 'created_at', value: 'DESC' }
    });
    console.log(`✅ 查询成功！找到 ${users.length} 条记录`);
    users.forEach((user) => {
      console.log(`  - ${user.name || 'N/A'} (${user.email || 'N/A'})`);
    });

    // 4. 测试条件查询
    console.log('\n🔍 测试条件查询...');
    const adultUsers = await db.findMany(TestUser, {
      conditions: {
        age: { $gte: 30 }
      }
    });
    console.log(`✅ 条件查询成功！找到 ${adultUsers.length} 个成年用户`);

    // 5. 测试分页查询
    console.log('\n📄 测试分页查询...');
    const pageResult = await db.findPage(TestUser, 1, 2);
    if (pageResult.success) {
      console.log(`✅ 分页查询成功！第1页显示 ${pageResult.data.length}/${pageResult.total} 条记录`);
    } else {
      console.log('❌ 分页查询失败:', pageResult.error);
    }

    // 6. 测试统计功能
    console.log('\n🧮 测试统计功能...');
    const totalCount = await db.count(TestUser);
    const adultCount = await db.count(TestUser, {
      age: { $gte: 30 }
    });
    console.log(`✅ 统计成功！总用户数: ${totalCount}, 成年用户数: ${adultCount}`);

    // 7. 测试更新功能
    console.log('\n✏️ 测试更新功能...');
    const updateResult = await db.update(TestUser, {
      conditions: { email: 'test1@example.com' },
      data: {
        age: 26,
        profile: {
          avatar: 'new-avatar.jpg',
          bio: '更新后的简介'
        }
      }
    });

    if (updateResult.success) {
      console.log('✅ 更新成功！影响行数:', updateResult.changes);
    } else {
      console.log('❌ 更新失败:', updateResult.error);
    }

    // 8. 测试事务功能
    console.log('\n🔄 测试事务功能...');
    const transactionResult = await db.transaction(async () => {
      // 在事务中执行多个操作
      await db.insert(TestUser, {
        data: {
          name: '事务用户',
          email: 'transaction@example.com',
          age: 40
        }
      });

      const user = await db.findOne(TestUser, {
        conditions: { email: 'transaction@example.com' }
      });

      if (!user) {
        throw new Error('事务中的用户创建失败');
      }

      console.log(`  ✅ 事务中成功创建用户: ${user.name || 'N/A'}`);
    });

    if (transactionResult.success) {
      console.log('✅ 事务执行成功！');
    } else {
      console.log('❌ 事务执行失败:', transactionResult.error);
    }

    // 9. 测试原始SQL查询
    console.log('\n💻 测试原始SQL查询...');
    const customResults = await db.query<{ name: string; email_domain: string }>(
      "SELECT name, SUBSTR(email, INSTR(email, '@') + 1) as email_domain FROM test_users WHERE age >= ?",
      [30]
    );
    console.log(`✅ 自定义查询成功！结果数量: ${customResults.length}`);
    customResults.forEach((result: { name: unknown; email_domain: unknown }) => {
      console.log(`  - ${result.name} 使用域名: ${result.email_domain}`);
    });

    // 10. 测试表信息获取
    console.log('\n📊 测试表信息获取...');
    const tableExists = await db.tableExists('test_users');
    console.log('✅ 表存在检查:', tableExists);

    const tableInfo = await db.getTableInfo('test_users');
    console.log(`✅ 表结构信息获取成功！共 ${tableInfo.length} 个字段`);

    // 11. 测试连接池状态
    console.log('\n🔗 测试连接池状态...');
    const status = db.getStatus();
    console.log('✅ 连接池状态获取成功:');
    console.log(
      `  - 写连接: ${status.writeConnection.inUse ? '使用中' : '空闲'} (${status.writeConnection.valid ? '有效' : '无效'})`
    );
    console.log(`  - 读连接数: ${status.readConnections.length}`);

    // 12. 测试删除功能
    console.log('\n🗑️ 测试删除功能...');
    const deleteResult = await db.delete(TestUser, {
      email: 'transaction@example.com'
    });

    if (deleteResult.success) {
      console.log('✅ 删除成功！影响行数:', deleteResult.changes);
    } else {
      console.log('❌ 删除失败:', deleteResult.error);
    }

    // 最终统计
    console.log('\n📈 最终数据统计...');
    const finalCount = await db.count(TestUser);
    console.log(`✅ 最终用户总数: ${finalCount}`);

    console.log('\n🎉 所有测试完成！API 功能正常工作。');
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    console.log('\n🔒 关闭数据库连接...');
    await db.close();
    console.log('✅ 数据库连接已关闭');
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testAPI().catch(console.error);
}
