import SQLCipher from '@journeyapps/sqlcipher';
import * as vscode from 'vscode';
import { Logger } from '@orientais/vscode-core/logger';
// 定义用户类型
interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}
const queryAllUsers = (db: SQLCipher.Database, outputChannel: vscode.OutputChannel): void => {
  db.all('SELECT * FROM users ORDER BY id DESC', (err: Error | null, rows: User[]) => {
    if (err) {
      Logger.error(`查询失败: ${err.message}`);
      vscode.window.showErrorMessage(`查询失败: ${err.message}`);
    } else {
      Logger.debug(`查询返回 ${rows.length} 条记录`);

      if (rows.length > 0) {
        const formattedResult = rows
          .map((row) => `ID: ${row.id}, 姓名: ${row.name}, 邮箱: ${row.email}, 创建时间: ${row.created_at}`)
          .join('\n');

        outputChannel.clear();
        outputChannel.appendLine('数据库查询结果：');
        outputChannel.appendLine('='.repeat(60));
        outputChannel.appendLine(formattedResult);
        outputChannel.appendLine('='.repeat(60));
        outputChannel.appendLine(`共 ${rows.length} 条记录`);
        outputChannel.show();

        vscode.window.showInformationMessage(`查询成功！找到 ${rows.length} 条记录`);
        Logger.log(`查询成功：找到 ${rows.length} 条记录`);
      } else {
        vscode.window.showInformationMessage('数据库中没有记录');
        Logger.warn('数据库中没有记录');
      }
    }
  });
};
export const sqlTest = async (context: vscode.ExtensionContext): Promise<void> => {
  // 获取数据库路径 - 使用 globalStorageUri 确保可写
  const storageUri =
    context.globalStorageUri ||
    (context.globalStoragePath ? vscode.Uri.file(context.globalStoragePath) : context.extensionUri);
  const dbPath = vscode.Uri.joinPath(storageUri, 'Databases.db');
  let db: SQLCipher.Database | null = null;

  // 创建输出通道（如果需要显示结果）
  const outputChannel = vscode.window.createOutputChannel('SQLite 数据库');
  context.subscriptions.push(outputChannel);

  try {
    // 确保数据库文件目录存在
    const fs = await import('fs');
    const path = await import('path');
    const dbDirPath = path.dirname(dbPath.fsPath);
    if (!fs.existsSync(dbDirPath)) {
      fs.mkdirSync(dbDirPath, { recursive: true });
    }

    Logger.debug(`数据库路径: ${dbPath.fsPath}`);
    Logger.debug(`数据库目录: ${dbDirPath}`);

    // 创建数据库连接
    db = new SQLCipher.Database(dbPath.fsPath);

    // 初始化表结构（如果不存在）
    db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
    Logger.debug('数据库表初始化成功');

    // 验证数据库连接和表是否存在
    try {
      const testStmt = db.prepare('SELECT COUNT(*) as count FROM users');
      const result = testStmt.get() as unknown as { count: number };
      testStmt.finalize();
      Logger.debug(`数据库连接正常，当前有 ${result.count} 条记录`);
    } catch (verifyError) {
      Logger.error(`数据库验证失败: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
    }

    // 显示操作菜单
    const action = await vscode.window.showQuickPick(
      [
        { label: '插入数据', value: 'insert', description: '添加新用户数据' },
        { label: '查询所有数据', value: 'query', description: '查询所有用户' },
        { label: '根据ID查询', value: 'queryById', description: '根据ID查询用户' },
        { label: '根据姓名查询', value: 'queryByName', description: '根据姓名查询用户' },
        { label: '删除数据', value: 'delete', description: '根据ID删除用户' }
      ],
      { placeHolder: '请选择要执行的操作' }
    );

    if (!action) {
      return;
    }

    switch (action.value) {
      case 'insert': {
        // 输入姓名
        const name = await vscode.window.showInputBox({
          prompt: '请输入姓名',
          placeHolder: '例如：张三',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return '姓名不能为空';
            }
            return null;
          }
        });

        if (!name) {
          return;
        }

        // 输入邮箱
        const email = await vscode.window.showInputBox({
          prompt: '请输入邮箱',
          placeHolder: '例如：zhangsan@example.com',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return '邮箱不能为空';
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return '邮箱格式不正确';
            }
            return null;
          }
        });

        if (!email) {
          return;
        }

        try {
          const insertStmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
          insertStmt.run([name.trim(), email.trim()]);
          insertStmt.finalize();

          vscode.window.showInformationMessage(`成功插入数据!`);
          Logger.log(`成功插入用户数据：${name}, ${email}`);
          queryAllUsers(db, outputChannel);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('UNIQUE')) {
            vscode.window.showErrorMessage('该邮箱已存在，请使用其他邮箱');
          } else {
            vscode.window.showErrorMessage(`插入数据失败: ${errorMessage}`);
          }
          Logger.error(`插入数据失败: ${errorMessage}`);
        }
        break;
      }
      case 'query': {
        try {
          if (!db) {
            throw new Error('数据库连接不存在');
          }
          Logger.debug('开始查询所有用户数据');
          queryAllUsers(db, outputChannel);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          Logger.error(`查询失败: ${errorMessage}`, errorStack);
          vscode.window.showErrorMessage(`查询失败: ${errorMessage}`);
          outputChannel.clear();
          outputChannel.appendLine(`查询错误: ${errorMessage}`);
          if (errorStack) {
            outputChannel.appendLine(errorStack);
          }
          outputChannel.show();
        }
        break;
      }
      case 'queryById': {
        const idInput = await vscode.window.showInputBox({
          prompt: '请输入用户ID',
          placeHolder: '例如：1',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'ID不能为空';
            }
            if (isNaN(Number(value))) {
              return '请输入有效的数字ID';
            }
            return null;
          }
        });

        if (!idInput) {
          return;
        }

        try {
          if (!db) {
            throw new Error('数据库连接不存在');
          }

          Logger.debug(`开始根据ID查询用户，ID: ${idInput}`);
          db.get('SELECT * FROM users WHERE id = ?', [Number(idInput)], (err: Error | null, row: User | undefined) => {
            if (err) {
              Logger.error(`查询失败: ${err.message}`);
              vscode.window.showErrorMessage(`查询失败: ${err.message}`);
              return;
            }
            if (row) {
              const formattedResult = `ID: ${row.id}, 姓名: ${row.name}, 邮箱: ${row.email}, 创建时间: ${row.created_at}`;
              outputChannel.clear();
              outputChannel.appendLine('查询结果：');
              outputChannel.appendLine('='.repeat(60));
              outputChannel.appendLine(formattedResult);
              outputChannel.appendLine('='.repeat(60));
              outputChannel.show();

              vscode.window.showInformationMessage('查询成功！');
              Logger.log(`根据ID查询成功：${JSON.stringify(row)}`);
            } else {
              vscode.window.showInformationMessage(`未找到ID为 ${idInput} 的用户`);
              Logger.warn(`未找到ID为 ${idInput} 的用户`);
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`查询失败: ${errorMessage}`);
          Logger.error(`查询失败: ${errorMessage}`);
        }
        break;
      }
      case 'queryByName': {
        const name = await vscode.window.showInputBox({
          prompt: '请输入姓名（支持模糊查询）',
          placeHolder: '例如：张',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return '姓名不能为空';
            }
            return null;
          }
        });

        if (!name) {
          return;
        }

        try {
          if (!db) {
            throw new Error('数据库连接不存在');
          }

          Logger.debug(`开始根据姓名查询用户，姓名: ${name}`);
          db.all(
            'SELECT * FROM users WHERE name LIKE ? ORDER BY id DESC',
            [`%${name.trim()}%`],
            (err: Error | null, rows: User[]) => {
              if (err) {
                Logger.error(`查询失败: ${err.message}`);
                vscode.window.showErrorMessage(`查询失败: ${err.message}`);
              }
              if (rows.length > 0) {
                const formattedResult = rows
                  .map((row) => `ID: ${row.id}, 姓名: ${row.name}, 邮箱: ${row.email}, 创建时间: ${row.created_at}`)
                  .join('\n');

                outputChannel.clear();
                outputChannel.appendLine('数据库查询结果：');
                outputChannel.appendLine('='.repeat(60));
                outputChannel.appendLine(formattedResult);
                outputChannel.appendLine('='.repeat(60));
                outputChannel.appendLine(`共 ${rows.length} 条记录`);
                outputChannel.show();

                vscode.window.showInformationMessage(`查询成功！找到 ${rows.length} 条记录`);
                Logger.log(`查询成功：找到 ${rows.length} 条记录`);
              } else {
                vscode.window.showInformationMessage('数据库中没有记录');
                Logger.warn('数据库中没有记录');
              }
            }
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`查询失败: ${errorMessage}`);
          Logger.error(`查询失败: ${errorMessage}`);
        }
        break;
      }
      case 'delete': {
        const idInput = await vscode.window.showInputBox({
          prompt: '请输入要删除的用户ID',
          placeHolder: '例如：1',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'ID不能为空';
            }
            if (isNaN(Number(value))) {
              return '请输入有效的数字ID';
            }
            return null;
          }
        });

        if (!idInput) {
          return;
        }

        // 确认删除
        const confirm = await vscode.window.showWarningMessage(`确定要删除ID为 ${idInput} 的用户吗？`, '确定', '取消');

        if (confirm !== '确定') {
          return;
        }

        try {
          const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
          deleteStmt.run([Number(idInput)]) as unknown as {
            lastInsertRowid: number;
            changes: number;
          };
          deleteStmt.finalize();

          vscode.window.showInformationMessage(`成功删除ID为 ${idInput} 的用户`);
          Logger.log(`成功删除用户，ID: ${idInput}`);
          queryAllUsers(db, outputChannel);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`删除失败: ${errorMessage}`);
          Logger.error(`删除失败: ${errorMessage}`);
        }
        break;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`数据库操作失败: ${errorMessage}`);
    Logger.error(`Database operation failed: ${errorMessage}`);
  } finally {
    // 确保数据库连接被正确关闭
    if (db) {
      try {
        db.close();
        Logger.debug('数据库连接已关闭');
      } catch (closeError) {
        Logger.error(closeError, '关闭数据库连接时出错');
      }
    }
  }
};
