/**
 * 本地SSH快速测试示例
 * 简化的本地SSH连接测试，无需复杂的服务器设置
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { showMessage } from '@orientais/vscode-core';
import { window } from 'vscode';
import { SSHClientDetector } from '@packages/vscode-external';
import type { Container } from '../../container';
import type { ExternalExecutableServiceConfig } from '../externalExecutableService';
import { ProviderName } from '../externalExecutableService';
import { SSHGitProvider } from '../providers/sshGitProvider';
import { SSHConfigEnhancer } from './sshConfigEnhancer';
import { ValidationError, ValidationUtils } from './validationUtils';

const execAsync = promisify(exec);

export class LocalSSHQuickTest {
  private readonly tempDir: string;
  private readonly sshPort: number = 2222;
  private readonly sshHost: string = 'localhost';
  private readonly sshUser: string = 'git';

  constructor(private readonly container: Container) {
    this.tempDir = path.join(__dirname, '../../../../temp/local-ssh-quick-test');

    // 验证临时目录路径
    const tempDirValidation = ValidationUtils.validateTempDirectory(this.tempDir);
    if (!tempDirValidation.valid) {
      throw new ValidationError(`临时目录路径无效: ${tempDirValidation.error}`);
    }
  }

  /**
   * 快速设置本地SSH测试环境
   */
  async quickSetup(): Promise<void> {
    try {
      console.log('=== 快速设置本地SSH测试环境 ===');

      // 1. 创建临时目录
      await this.createTempDirectories();

      // 2. 生成SSH密钥对
      await this.generateSSHKeys();

      // 3. 创建本地Git仓库
      await this.createLocalGitRepository();

      // 4. 注册SSH提供者（使用本地Git路径）
      await this.registerLocalSSHProvider();

      console.log('快速设置完成！');
      void window.showInformationMessage('本地SSH测试环境设置完成！');
    } catch (error) {
      console.error('快速设置失败:', error);
      void window.showErrorMessage(`设置失败: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 创建临时目录
   */
  private async createTempDirectories(): Promise<void> {
    const dirs = [
      this.tempDir,
      path.join(this.tempDir, 'git-repo'),
      path.join(this.tempDir, 'ssh-keys'),
      path.join(this.tempDir, 'work-dir')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`创建目录: ${dir}`);
      }
    }
  }

  /**
   * 生成SSH密钥对
   */
  private async generateSSHKeys(): Promise<void> {
    const keyPath = path.join(this.tempDir, 'ssh-keys', 'id_ed25519');

    if (!fs.existsSync(keyPath)) {
      try {
        // 使用SSH配置增强器生成密钥
        const keyPair = await SSHConfigEnhancer.generateSSHKeyPair(keyPath, 'ed25519', 'local-ssh-quick-test');

        console.log('SSH密钥对生成成功');
        console.log(`私钥: ${keyPair.privateKey}`);
        console.log(`公钥: ${keyPair.publicKey}`);

        // 验证密钥文件是否生成成功
        if (!fs.existsSync(keyPair.privateKey) || !fs.existsSync(keyPair.publicKey)) {
          throw new Error('SSH密钥文件生成失败');
        }
      } catch (error) {
        console.error('生成SSH密钥对失败:', error);
        throw new Error('无法生成SSH密钥对，请确保系统已安装OpenSSH');
      }
    } else {
      console.log('SSH密钥对已存在');
    }
  }

  /**
   * 创建本地Git仓库
   */
  private async createLocalGitRepository(): Promise<void> {
    const repoPath = path.join(this.tempDir, 'git-repo', 'test-repo');
    const workDir = path.join(this.tempDir, 'work-dir');

    if (!fs.existsSync(repoPath)) {
      try {
        // 确保目录存在
        if (!fs.existsSync(path.dirname(repoPath))) {
          fs.mkdirSync(path.dirname(repoPath), { recursive: true });
        }

        // 初始化裸仓库
        await execAsync(`git init --bare "${repoPath}"`);
        console.log(`Git仓库创建成功: ${repoPath}`);

        // 初始化工作目录
        if (!fs.existsSync(workDir)) {
          fs.mkdirSync(workDir, { recursive: true });
        }

        if (!fs.existsSync(path.join(workDir, '.git'))) {
          await execAsync(`git init "${workDir}"`);
          await execAsync(`git config user.name "Local SSH Test"`, { cwd: workDir });
          await execAsync(`git config user.email "local@ssh-test.local"`, { cwd: workDir });
        }

        // 创建示例文件
        const readmePath = path.join(workDir, 'README.md');
        if (!fs.existsSync(readmePath)) {
          fs.writeFileSync(
            readmePath,
            '# 本地SSH测试仓库\n\n这是一个用于测试SSH连接的本地Git仓库。\n\n## 测试内容\n\n- SSH连接测试\n- Git操作测试\n- 远程仓库模拟\n'
          );
        }

        // 提交文件
        await execAsync('git add .', { cwd: workDir });
        await execAsync('git commit -m "Initial commit for SSH testing"', { cwd: workDir });

        // 添加远程仓库
        await execAsync(`git remote add origin "${repoPath}"`, { cwd: workDir });
        await execAsync('git push -u origin main', { cwd: workDir });

        console.log('示例文件已添加到Git仓库');
      } catch (error) {
        console.error('创建Git仓库失败:', error);
        throw new Error(`创建Git仓库失败: ${String(error)}`);
      }
    } else {
      console.log('Git仓库已存在');
    }
  }

  /**
   * 注册本地SSH提供者（使用本地Git）
   */
  private async registerLocalSSHProvider(): Promise<void> {
    // 检测本地Git路径
    let gitPath: string;
    try {
      const { stdout } = await execAsync('which git');
      gitPath = stdout.trim();
    } catch {
      // 跨平台默认路径
      // eslint-disable-next-line no-restricted-globals
      gitPath = process.platform === 'win32' ? 'git' : '/usr/bin/git';
    }

    // 验证Git路径
    const gitPathValidation = ValidationUtils.validateGitPath(gitPath);
    if (!gitPathValidation.valid) {
      throw new ValidationError(`Git路径无效: ${gitPathValidation.error}`);
    }

    const privateKeyPath = path.join(this.tempDir, 'ssh-keys', 'id_ed25519');

    // 验证私钥文件存在
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`SSH私钥文件不存在: ${privateKeyPath}`);
    }

    const localSSHConfig: ExternalExecutableServiceConfig = {
      providers: {
        path: gitPath,
        name: 'Local SSH Git Quick Test',
        enabled: true,
        connectionType: 'remote',
        ssh: {
          host: this.sshHost,
          port: this.sshPort,
          username: this.sshUser,
          privateKey: privateKeyPath,
          connectTimeout: 10000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          sshOptions: {
            StrictHostKeyChecking: 'no',
            UserKnownHostsFile: '/dev/null',
            LogLevel: 'ERROR',
            IdentityFile: privateKeyPath
          }
        },
        timeout: 30000,
        autoRestart: true,
        startupArgs: []
      },
      globalTimeout: 60000,
      maxConcurrentExecutions: 3,
      enableStatusBar: true,
      enableNotifications: true
    };

    // 验证配置
    const configValidation = ValidationUtils.validateExternalExecutableServiceConfig(localSSHConfig);
    if (!configValidation.valid) {
      throw new ValidationError(`配置无效: ${configValidation.error}`);
    }

    try {
      await this.container.external.registerProviders([
        {
          name: ProviderName.LocalSshGit,
          providerClass: SSHGitProvider,
          config: localSSHConfig
        }
      ]);
      console.log('本地SSH提供者注册成功');
    } catch (error) {
      console.error('注册SSH提供者失败:', error);
      throw new Error(`注册SSH提供者失败: ${String(error)}`);
    }
  }

  /**
   * 测试本地SSH连接（模拟）
   */
  async testLocalSSHConnection(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== 测试本地SSH连接（模拟） ===');

      // 检查提供者是否已注册
      if (!externalService.getAvailableProviders().includes('local-ssh-quick-test')) {
        throw new Error('SSH提供者未注册，请先调用quickSetup()');
      }

      // 启动SSH提供者
      if (!externalService.isProviderRunning('local-git-tool')) {
        await externalService.startProvider('local-git-tool');
      }

      // 测试Git命令（这些命令会在本地执行，模拟远程执行）
      const testResponse = await externalService.executeCommand('local-ssh-quick-test', '--version');
      console.log('Git版本:', testResponse.data);

      // 测试Git配置
      const configResponse = await externalService.executeCommand('local-ssh-quick-test', 'config', ['--list']);
      console.log('Git配置信息:', configResponse.data);

      // 测试Git状态
      const workDir = path.join(this.tempDir, 'work-dir');
      if (fs.existsSync(workDir)) {
        const statusResponse = await externalService.executeCommand('local-ssh-quick-test', 'status', ['--porcelain'], {
          cwd: workDir
        });
        console.log('Git状态:', statusResponse.data);

        // 测试Git日志
        const logResponse = await externalService.executeCommand(
          'local-ssh-quick-test',
          'log',
          ['--oneline', '-n', '3'],
          {
            cwd: workDir
          }
        );
        console.log('Git日志:', logResponse.data);
      } else {
        console.log('工作目录不存在，跳过状态和日志测试');
      }

      void window.showInformationMessage('本地SSH连接测试成功！');
    } catch (error) {
      console.error('本地SSH连接测试失败:', error);
      void window.showErrorMessage(`连接测试失败: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 演示本地Git操作
   */
  async demonstrateLocalGitOperations(): Promise<void> {
    const externalService = this.container.external;
    const workDir = path.join(this.tempDir, 'work-dir');

    try {
      console.log('=== 演示本地Git操作 ===');

      // 1. 创建新文件
      const newFilePath = path.join(workDir, 'test-file.txt');
      fs.writeFileSync(newFilePath, `测试文件 - ${new Date().toISOString()}\n\n这是通过SSH模拟创建的文件。`);

      // 2. 添加文件到Git
      const addResponse = await externalService.executeCommand('local-ssh-quick-test', 'add', ['test-file.txt'], {
        cwd: workDir
      });
      console.log('添加文件结果:', addResponse.data);

      // 3. 提交文件
      const commitResponse = await externalService.executeCommand(
        'local-ssh-quick-test',
        'commit',
        ['-m', 'Add test file via SSH simulation'],
        {
          cwd: workDir
        }
      );
      console.log('提交结果:', commitResponse.data);

      // 4. 查看提交历史
      const logResponse = await externalService.executeCommand(
        'local-ssh-quick-test',
        'log',
        ['--oneline', '-n', '5'],
        {
          cwd: workDir
        }
      );
      console.log('提交历史:', logResponse.data);

      // 5. 查看文件差异
      const diffResponse = await externalService.executeCommand('local-ssh-quick-test', 'diff', ['HEAD~1'], {
        cwd: workDir
      });
      console.log('文件差异:', diffResponse.data);

      void window.showInformationMessage('本地Git操作演示完成！');
    } catch (error) {
      console.error('本地Git操作演示失败:', error);
      void window.showErrorMessage(`操作演示失败: ${String(error)}`);
    }
  }

  /**
   * 测试SSH客户端检测
   */
  async testSSHClientDetection(): Promise<void> {
    try {
      console.log('=== 测试SSH客户端检测 ===');

      // 使用增强的SSH配置工具
      const suggestions = await SSHConfigEnhancer.getSSHConfigSuggestions();

      if (suggestions.client) {
        console.log(`检测到SSH客户端: ${suggestions.client.type}`);
        console.log(`路径: ${suggestions.client.path}`);
        console.log(`版本: ${suggestions.client.version || 'unknown'}`);
        console.log(`支持的特性: ${suggestions.client.features.join(', ')}`);

        void window.showInformationMessage(`检测到SSH客户端: ${suggestions.client.type}`);
      } else {
        console.log('未找到可用的SSH客户端');
        void window.showWarningMessage('未找到可用的SSH客户端');
      }

      // 显示建议
      if (suggestions.recommendations.length > 0) {
        console.log('建议:');
        suggestions.recommendations.forEach((rec) => console.log(`- ${rec}`));
      }

      // 显示警告
      if (suggestions.warnings.length > 0) {
        console.log('警告:');
        suggestions.warnings.forEach((warning) => console.log(`- ${warning}`));
      }

      // 使用原有的检测方法作为备用
      const clients = await SSHClientDetector.detectAvailableClients();
      console.log(`\n使用原有方法检测到 ${clients.length} 个可用SSH客户端:`);

      for (const client of clients) {
        console.log(`- ${client.type}: ${client.path} (${client.version || 'unknown'})`);
      }

      const bestClient = await SSHClientDetector.getBestSSHClient();
      if (bestClient) {
        console.log(`推荐使用: ${bestClient.type} at ${bestClient.path}`);
      }
    } catch (error) {
      console.error('SSH客户端检测失败:', error);
      void window.showErrorMessage(`SSH客户端检测失败: ${String(error)}`);
    }
  }

  /**
   * 获取测试环境信息
   */
  getTestInfo(): void {
    console.log('=== 本地SSH快速测试环境信息 ===');
    console.log(`临时目录: ${this.tempDir}`);
    console.log(`SSH主机: ${this.sshHost}`);
    console.log(`SSH端口: ${this.sshPort}`);
    console.log(`SSH用户: ${this.sshUser}`);
    console.log(`私钥路径: ${path.join(this.tempDir, 'ssh-keys', 'id_ed25519')}`);
    console.log(`公钥路径: ${path.join(this.tempDir, 'ssh-keys', 'id_ed25519.pub')}`);
    console.log(`仓库路径: ${path.join(this.tempDir, 'git-repo', 'test-repo')}`);
    console.log(`工作目录: ${path.join(this.tempDir, 'work-dir')}`);

    void showMessage('本地SSH快速测试环境信息已输出到控制台');
  }

  /**
   * 清理测试环境
   */
  async cleanupTest(): Promise<void> {
    const externalService = this.container.external;

    try {
      // 停止SSH提供者
      if (externalService.isProviderRunning('local-git-tool')) {
        await externalService.stopProvider('local-ssh-git');
        console.log('本地SSH提供者已停止');
      }

      // 询问是否清理临时文件
      const shouldCleanup = await window.showInformationMessage('是否要清理临时文件？', '是', '否');

      if (shouldCleanup === '是' && fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true });
        console.log('临时文件已清理');
        void window.showInformationMessage('测试环境已清理');
      }
    } catch (error) {
      console.error('清理测试环境失败:', error);
      void window.showErrorMessage(`清理失败: ${String(error)}`);
    }
  }

  /**
   * 运行完整的测试流程
   */
  async runFullTest(): Promise<void> {
    try {
      console.log('=== 开始完整的本地SSH测试流程 ===');

      // 1. 快速设置
      await this.quickSetup();

      // 2. 测试SSH客户端检测
      await this.testSSHClientDetection();

      // 3. 测试SSH连接
      await this.testLocalSSHConnection();

      // 4. 演示Git操作
      await this.demonstrateLocalGitOperations();

      // 5. 显示环境信息
      this.getTestInfo();

      console.log('=== 完整的本地SSH测试流程完成 ===');
      void window.showInformationMessage('完整的本地SSH测试流程完成！');
    } catch (error) {
      console.error('完整测试流程失败:', error);
      void window.showErrorMessage(`测试流程失败: ${String(error)}`);
    }
  }
}

/**
 * 本地SSH快速测试配置
 */
export const LocalSSHQuickTestConfigs = {
  /**
   * 基本配置
   */
  basic: {
    providers: {
      path: process.platform === 'win32' ? 'git' : '/usr/bin/git', // eslint-disable-line no-restricted-globals
      name: 'Local SSH Git Quick Test',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: 'localhost',
        port: 2222,
        username: 'git',
        privateKey: '~/.ssh/id_ed25519',
        connectTimeout: 10000,
        keepAlive: 300000,
        retryAttempts: 3,
        retryDelay: 1000,
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null',
          LogLevel: 'ERROR'
        }
      },
      timeout: 30000,
      autoRestart: true,
      startupArgs: []
    },
    globalTimeout: 60000,
    maxConcurrentExecutions: 3,
    enableStatusBar: true,
    enableNotifications: true
  } satisfies ExternalExecutableServiceConfig
};

/**
 * 使用说明
 */
export const LocalSSHQuickTestGuide = {
  /**
   * 快速开始
   */
  quickStart: {
    title: '快速开始',
    steps: [
      '1. 创建LocalSSHQuickTest实例',
      '2. 调用runFullTest()运行完整测试',
      '3. 或者分步调用各个测试方法',
      '4. 查看控制台输出了解测试结果',
      '5. 调用cleanupTest()清理环境'
    ]
  },

  /**
   * 测试内容
   */
  testContent: {
    title: '测试内容',
    tests: ['SSH客户端检测', 'SSH连接建立', 'Git命令执行', '文件操作', '提交历史查看', '差异比较']
  },

  /**
   * 注意事项
   */
  notes: {
    title: '注意事项',
    points: [
      '此测试使用本地Git模拟远程SSH连接',
      '不需要实际的SSH服务器运行',
      '主要用于测试SSH连接逻辑',
      '生成的临时文件可以手动清理',
      '测试完成后建议清理临时文件'
    ]
  }
};
