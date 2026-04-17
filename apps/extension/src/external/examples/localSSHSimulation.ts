/**
 * 本地Git SSH模拟示例
 * 使用本地Git仓库和SSH服务器来模拟远程SSH连接
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { window } from 'vscode';
import { showMessage } from '@/core/message';
import type { Container } from '../../container';
import type { ExternalExecutableServiceConfig } from '../externalExecutableService';
import { ProviderName } from '../externalExecutableService';
import { SSHGitProvider } from '../providers/sshGitProvider';

const execAsync = promisify(exec);

export class LocalSSHSimulation {
  private readonly tempDir: string;
  private readonly sshPort: number = 2222; // 使用非标准端口避免冲突
  private readonly sshHost: string = 'localhost';
  private readonly sshUser: string = 'git';
  private readonly repoName: string = 'test-repo';

  constructor(private readonly container: Container) {
    this.tempDir = path.join(__dirname, '../../../../temp/local-ssh-simulation');
  }

  /**
   * 设置本地SSH模拟环境
   */
  async setupLocalSSHSimulation(): Promise<void> {
    try {
      console.log('=== 设置本地SSH模拟环境 ===');

      // 1. 创建临时目录
      await this.createTempDirectories();

      // 2. 生成SSH密钥对
      await this.generateSSHKeys();

      // 3. 创建本地Git仓库
      await this.createLocalGitRepository();

      // 4. 配置SSH服务器（模拟）
      await this.configureSSHServer();

      // 5. 注册本地SSH提供者
      await this.registerLocalSSHProvider();

      console.log('本地SSH模拟环境设置完成！');
      void window.showInformationMessage('本地SSH模拟环境设置完成！');
    } catch (error) {
      console.error('设置本地SSH模拟环境失败:', error);
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
      path.join(this.tempDir, 'ssh-config')
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
    const keyPath = path.join(this.tempDir, 'ssh-keys', 'id_rsa');
    const pubKeyPath = `${keyPath}.pub`;

    if (!fs.existsSync(keyPath)) {
      try {
        // 跨平台SSH密钥生成命令
        const sshKeygenCmd =
          // eslint-disable-next-line no-restricted-globals
          process.platform === 'win32'
            ? `ssh-keygen -t rsa -b 2048 -f "${keyPath}" -N "" -C "local-ssh-simulation"`
            : `ssh-keygen -t rsa -b 2048 -f "${keyPath}" -N "" -C "local-ssh-simulation"`;

        await execAsync(sshKeygenCmd);
        console.log('SSH密钥对生成成功');

        // 验证密钥文件是否生成成功
        if (!fs.existsSync(keyPath) || !fs.existsSync(pubKeyPath)) {
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
    const repoPath = path.join(this.tempDir, 'git-repo', this.repoName);

    if (!fs.existsSync(repoPath)) {
      try {
        // 初始化Git仓库
        await execAsync(`git init --bare "${repoPath}"`);
        console.log(`Git仓库创建成功: ${repoPath}`);

        // 创建一些示例文件
        const sampleFiles = [
          { name: 'README.md', content: '# 本地SSH模拟仓库\n\n这是一个用于测试SSH连接的本地Git仓库。' },
          { name: 'src/main.js', content: 'console.log("Hello, Local SSH Simulation!");' },
          {
            name: 'package.json',
            content: JSON.stringify(
              {
                name: 'local-ssh-simulation',
                version: '1.0.0',
                description: '本地SSH模拟测试仓库'
              },
              null,
              2
            )
          }
        ];

        // 创建临时工作目录来添加文件
        const workDir = path.join(this.tempDir, 'work-dir');
        if (!fs.existsSync(workDir)) {
          fs.mkdirSync(workDir, { recursive: true });
        }

        // 初始化工作仓库
        await execAsync(`git init "${workDir}"`);
        await execAsync(`git config user.name "Local SSH Simulation"`, { cwd: workDir });
        await execAsync(`git config user.email "local@ssh-simulation.local"`, { cwd: workDir });

        // 添加示例文件
        for (const file of sampleFiles) {
          const filePath = path.join(workDir, file.name);
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, file.content);
        }

        // 提交文件
        await execAsync('git add .', { cwd: workDir });
        await execAsync('git commit -m "Initial commit with sample files"', { cwd: workDir });

        // 添加远程仓库
        await execAsync(`git remote add origin "${repoPath}"`, { cwd: workDir });
        await execAsync('git push -u origin main', { cwd: workDir });

        console.log('示例文件已添加到Git仓库');
      } catch (error) {
        console.error('创建Git仓库失败:', error);
        throw error;
      }
    } else {
      console.log('Git仓库已存在');
    }
  }

  /**
   * 配置SSH服务器（模拟）
   */
  private async configureSSHServer(): Promise<void> {
    const sshConfigPath = path.join(this.tempDir, 'ssh-config', 'sshd_config');
    const authorizedKeysPath = path.join(this.tempDir, 'ssh-config', 'authorized_keys');
    const hostKeyPath = path.join(this.tempDir, 'ssh-keys', 'ssh_host_rsa_key');

    // 生成SSH主机密钥
    if (!fs.existsSync(hostKeyPath)) {
      try {
        await execAsync(`ssh-keygen -t rsa -b 2048 -f "${hostKeyPath}" -N ""`);
        console.log('SSH主机密钥生成成功');
      } catch (error) {
        console.error('生成SSH主机密钥失败:', error);
      }
    }

    // 创建SSH配置文件
    const sshConfig = `# 本地SSH模拟配置
Port ${this.sshPort}
HostKey ${hostKeyPath}
AuthorizedKeysFile ${authorizedKeysPath}
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
StrictModes no
UsePAM no
LogLevel ERROR
`;

    fs.writeFileSync(sshConfigPath, sshConfig);

    // 创建授权密钥文件
    const pubKeyPath = path.join(this.tempDir, 'ssh-keys', 'id_rsa.pub');
    if (fs.existsSync(pubKeyPath)) {
      const pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
      fs.writeFileSync(authorizedKeysPath, pubKey);
      console.log('SSH授权密钥配置完成');
    }

    console.log('SSH服务器配置完成');
  }

  /**
   * 注册本地SSH提供者
   */
  private async registerLocalSSHProvider(): Promise<void> {
    const privateKeyPath = path.join(this.tempDir, 'ssh-keys', 'id_rsa');
    const repoPath = path.join(this.tempDir, 'git-repo', this.repoName);

    // 验证私钥文件存在
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`SSH私钥文件不存在: ${privateKeyPath}`);
    }

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

    const localSSHConfig: ExternalExecutableServiceConfig = {
      providers: {
        path: gitPath,
        name: 'Local SSH Git Simulation',
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
   * 测试本地SSH连接
   */
  async testLocalSSHConnection(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== 测试本地SSH连接 ===');

      // 检查提供者是否已注册
      if (!externalService.getAvailableProviders().includes('local-ssh-git')) {
        throw new Error('SSH提供者未注册，请先调用setupLocalSSHSimulation()');
      }

      // 启动本地SSH提供者
      if (!externalService.isProviderRunning('local-ssh-git')) {
        await externalService.startProvider('local-ssh-git');
      }

      // 测试SSH连接
      const testResponse = await externalService.executeCommand('local-ssh-git', '--version');
      console.log('本地SSH连接成功！');
      console.log('Git版本:', testResponse.data);

      // 测试Git操作
      const statusResponse = await externalService.executeCommand('local-ssh-git', 'status', ['--porcelain'], {
        cwd: '/tmp'
      });
      console.log('Git状态:', statusResponse.data);

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

    try {
      console.log('=== 演示本地Git操作 ===');

      // 1. 克隆本地仓库
      const cloneDir = path.join(this.tempDir, 'cloned-repo');
      if (fs.existsSync(cloneDir)) {
        fs.rmSync(cloneDir, { recursive: true });
      }

      const repoUrl = `git@${this.sshHost}:${this.sshPort}/${this.repoName}`;
      console.log(`克隆仓库: ${repoUrl}`);

      // 注意：这里需要实际的SSH服务器运行才能成功
      // 在实际环境中，你需要启动SSH服务器
      try {
        const cloneResponse = await externalService.executeCommand('local-ssh-git', 'clone', [repoUrl, cloneDir]);
        console.log('仓库克隆成功:', cloneResponse.data);
      } catch (error) {
        console.log('仓库克隆失败（预期的，因为没有运行SSH服务器）:', error);
      }

      // 2. 测试其他Git命令
      const configResponse = await externalService.executeCommand('local-ssh-git', 'config', ['--list']);
      console.log('Git配置:', configResponse.data);

      const logResponse = await externalService.executeCommand('local-ssh-git', 'log', ['--oneline', '-n', '3'], {
        cwd: '/tmp'
      });
      console.log('Git日志:', logResponse.data);

      void window.showInformationMessage('本地Git操作演示完成！');
    } catch (error) {
      console.error('本地Git操作演示失败:', error);
      void window.showErrorMessage(`操作演示失败: ${String(error)}`);
    }
  }

  /**
   * 获取模拟环境信息
   */
  getSimulationInfo(): void {
    console.log('=== 本地SSH模拟环境信息 ===');
    console.log(`临时目录: ${this.tempDir}`);
    console.log(`SSH主机: ${this.sshHost}`);
    console.log(`SSH端口: ${this.sshPort}`);
    console.log(`SSH用户: ${this.sshUser}`);
    console.log(`仓库名称: ${this.repoName}`);
    console.log(`私钥路径: ${path.join(this.tempDir, 'ssh-keys', 'id_rsa')}`);
    console.log(`公钥路径: ${path.join(this.tempDir, 'ssh-keys', 'id_rsa.pub')}`);
    console.log(`仓库路径: ${path.join(this.tempDir, 'git-repo', this.repoName)}`);

    void showMessage('本地SSH模拟环境信息已输出到控制台');
  }

  /**
   * 清理模拟环境
   */
  async cleanupSimulation(): Promise<void> {
    const externalService = this.container.external;

    try {
      // 停止SSH提供者
      if (externalService.isProviderRunning('local-ssh-git')) {
        await externalService.stopProvider('local-ssh-git');
        console.log('本地SSH提供者已停止');
      }

      // 清理临时文件（可选）
      const shouldCleanup = await window.showInformationMessage('是否要清理临时文件？', '是', '否');

      if (shouldCleanup === '是' && fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true });
        console.log('临时文件已清理');
        void window.showInformationMessage('模拟环境已清理');
      }
    } catch (error) {
      console.error('清理模拟环境失败:', error);
      void window.showErrorMessage(`清理失败: ${String(error)}`);
    }
  }
}

/**
 * 本地SSH模拟配置示例
 */
export const LocalSSHSimulationConfigs = {
  /**
   * 基本本地SSH配置
   */
  basic: {
    providers: {
      // eslint-disable-next-line no-restricted-globals
      path: process.platform === 'win32' ? 'git' : '/usr/bin/git',
      name: 'Local SSH Git (Basic)',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: 'localhost',
        port: 2222,
        username: 'git',
        privateKey: '~/.ssh/id_rsa',
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
  } satisfies ExternalExecutableServiceConfig,

  /**
   * 开发环境SSH配置
   */
  development: {
    providers: {
      // eslint-disable-next-line no-restricted-globals
      path: process.platform === 'win32' ? 'git' : '/usr/bin/git',
      name: 'Local SSH Git (Development)',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: 'localhost',
        port: 2222,
        username: 'git',
        privateKey: '~/.ssh/id_rsa',
        connectTimeout: 5000,
        keepAlive: 600000,
        retryAttempts: 5,
        retryDelay: 500,
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null',
          LogLevel: 'DEBUG', // 开发环境使用详细日志
          Compression: 'yes'
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
 * 本地SSH模拟使用指南
 */
export const LocalSSHSimulationGuide = {
  /**
   * 快速开始
   */
  quickStart: {
    title: '快速开始',
    steps: [
      '1. 创建LocalSSHSimulation实例',
      '2. 调用setupLocalSSHSimulation()设置环境',
      '3. 调用testLocalSSHConnection()测试连接',
      '4. 调用demonstrateLocalGitOperations()演示操作',
      '5. 调用cleanupSimulation()清理环境'
    ]
  },

  /**
   * 手动启动SSH服务器
   */
  manualSSHServer: {
    title: '手动启动SSH服务器',
    commands: [
      'sudo sshd -D -f /path/to/sshd_config -p 2222',
      '或者使用Docker: docker run -p 2222:22 -v /path/to/keys:/home/git/.ssh alpine/openssh'
    ]
  },

  /**
   * 故障排除
   */
  troubleshooting: {
    title: '故障排除',
    issues: [
      {
        problem: 'SSH连接被拒绝',
        solution: '确保SSH服务器正在运行，检查端口和配置'
      },
      {
        problem: '权限被拒绝',
        solution: '检查SSH密钥文件权限（600）和authorized_keys文件'
      },
      {
        problem: '端口被占用',
        solution: '更改SSH端口或停止占用端口的服务'
      },
      {
        problem: 'Git操作失败',
        solution: '确保Git仓库路径正确且可访问'
      }
    ]
  }
};
