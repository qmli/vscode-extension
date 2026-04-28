/**
 * GitHub SSH连接示例
 * 展示如何使用SSH连接到GitHub进行Git操作
 */

import { window } from 'vscode';
import { showMessage } from '@/core/message';
import { SSHClientDetector } from '@packages/vscode-external';
import type { Container } from '../../container';
import { SSHExecutableNotFoundError } from '../errors';
import type { ExternalExecutableServiceConfig } from '../externalExecutableService';
import { ProviderName } from '../externalExecutableService';
import { SSHGitProvider } from '../providers/sshGitProvider';

export class GitHubSSHExample {
  constructor(private readonly container: Container) {}

  /**
   * 演示GitHub SSH连接
   */
  async demonstrateGitHubSSH(): Promise<void> {
    try {
      console.log('=== GitHub SSH连接演示 ===');

      // 检测SSH客户端
      const clients = await SSHClientDetector.detectAvailableClients();
      console.log(`检测到 ${clients.length} 个可用SSH客户端:`);

      for (const client of clients) {
        console.log(`- ${client.type}: ${client.path} (${client.version || 'unknown'})`);
      }

      const bestClient = await SSHClientDetector.getBestSSHClient();
      if (bestClient) {
        console.log(`推荐使用: ${bestClient.type} at ${bestClient.path}`);
        void window.showInformationMessage(`检测到SSH客户端: ${bestClient.type}`);
      } else {
        console.log('未找到可用的SSH客户端');
        void window.showWarningMessage('未找到可用的SSH客户端，请安装OpenSSH或PuTTY');
        return;
      }

      // 注册GitHub SSH提供者
      await this.registerGitHubSSHProvider();

      // 测试GitHub连接
      await this.testGitHubConnection();

      // 演示Git操作
      await this.demonstrateGitOperations();

      console.log('GitHub SSH连接演示完成！');
      void window.showInformationMessage('GitHub SSH连接演示完成！');
    } catch (error) {
      console.error('GitHub SSH连接演示失败:', error);
      void window.showErrorMessage(`GitHub SSH连接演示失败: ${String(error)}`);
    }
  }

  /**
   * 注册GitHub SSH提供者
   */
  private async registerGitHubSSHProvider(): Promise<void> {
    const githubSSHConfig: ExternalExecutableServiceConfig = {
      providers: {
        path: '/usr/bin/git', // GitHub服务器上的Git路径
        name: 'GitHub SSH Git',
        enabled: true,
        connectionType: 'remote',
        ssh: {
          host: 'github.com', // GitHub SSH主机
          port: 22, // GitHub SSH端口
          username: 'git', // GitHub SSH用户名（固定为git）
          // 注意：你需要将你的SSH私钥路径替换为实际路径
          privateKey: '~/.ssh/id_rsa', // 你的SSH私钥路径
          connectTimeout: 30000, // 连接超时30秒
          keepAlive: 300000, // 保持连接5分钟
          retryAttempts: 3, // 重试3次
          retryDelay: 1000, // 重试间隔1秒
          sshOptions: {
            StrictHostKeyChecking: 'no', // 跳过主机密钥检查（仅用于测试）
            UserKnownHostsFile: '/dev/null', // 不使用已知主机文件
            LogLevel: 'ERROR' // 减少日志输出
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

    await this.container.external.registerProviders([
      {
        name: ProviderName.GithubSshGit,
        providerClass: SSHGitProvider,
        config: githubSSHConfig
      }
    ]);
    console.log('GitHub SSH提供者注册成功');
  }

  /**
   * 测试GitHub连接
   */
  private async testGitHubConnection(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== 测试GitHub SSH连接 ===');

      // 启动GitHub SSH提供者
      if (!externalService.isProviderRunning('github-ssh-git')) {
        await externalService.startProvider('github-ssh-git');
      }

      // 测试SSH连接（通过执行简单命令）
      const testResponse = await externalService.executeCommand('github-ssh-git', '--version');
      console.log('GitHub SSH连接成功！');
      console.log('远程Git版本:', testResponse.data);

      // 测试GitHub特定功能
      const helpResponse = await externalService.executeCommand('github-ssh-git', 'help', ['clone']);
      console.log('Git clone帮助信息:', helpResponse.data);

      void window.showInformationMessage('GitHub SSH连接测试成功！');
    } catch (error) {
      console.error('GitHub SSH连接测试失败:', error);
      void window.showErrorMessage(`GitHub SSH连接测试失败: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 演示Git操作
   */
  private async demonstrateGitOperations(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== 演示Git操作 ===');

      // 1. 获取Git配置信息
      const configResponse = await externalService.executeCommand('github-ssh-git', 'config', ['--list']);
      console.log('Git配置信息:', configResponse.data);

      // 2. 测试Git状态命令
      const statusResponse = await externalService.executeCommand('github-ssh-git', 'status', ['--porcelain'], {
        cwd: '/tmp' // 使用临时目录
      });
      console.log('Git状态:', statusResponse.data);

      // 3. 测试Git远程操作（不实际执行，只测试命令格式）
      const remoteResponse = await externalService.executeCommand('github-ssh-git', 'remote', ['-v'], {
        cwd: '/tmp'
      });
      console.log('Git远程信息:', remoteResponse.data);

      // 4. 演示Git日志命令
      const logResponse = await externalService.executeCommand('github-ssh-git', 'log', ['--oneline', '-n', '5'], {
        cwd: '/tmp'
      });
      console.log('Git日志:', logResponse.data);

      void window.showInformationMessage('Git操作演示完成！');
    } catch (error) {
      console.error('Git操作演示失败:', error);
      void window.showErrorMessage(`Git操作演示失败: ${String(error)}`);
    }
  }

  /**
   * 演示GitHub仓库克隆（模拟）
   */
  async demonstrateGitHubClone(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== 演示GitHub仓库克隆 ===');

      // 注意：这里只是演示命令格式，不会实际克隆
      // 在实际使用中，你需要有适当的权限和仓库访问权

      const cloneCommand = 'clone';
      const repositoryUrl = 'git@github.com:octocat/Hello-World.git';
      const localPath = '/tmp/hello-world';

      console.log(`准备执行: git ${cloneCommand} ${repositoryUrl} ${localPath}`);

      // 这里只是展示命令格式，实际执行需要适当的权限
      const response = await externalService.executeCommand('github-ssh-git', cloneCommand, [repositoryUrl, localPath]);
      console.log('克隆结果:', response.data);

      void window.showInformationMessage('GitHub仓库克隆演示完成！');
    } catch (error) {
      if (error instanceof SSHExecutableNotFoundError) {
        console.log('预期的错误: 远程可执行文件未找到');
        void window.showWarningMessage('远程Git可执行文件未找到，这是正常的测试结果');
      } else {
        console.error('GitHub仓库克隆演示失败:', error);
        void window.showErrorMessage(`GitHub仓库克隆演示失败: ${String(error)}`);
      }
    }
  }

  /**
   * 获取GitHub SSH连接状态
   */
  getGitHubConnectionStatus(): void {
    const externalService = this.container.external;
    const status = externalService.getProviderStatus('github-ssh-git');

    if (status) {
      console.log('GitHub SSH连接状态:', status);
      void showMessage(`GitHub SSH状态: ${status.status}`);
    } else {
      console.log('GitHub SSH提供者未注册');
      void window.showWarningMessage('GitHub SSH提供者未注册');
    }
  }

  /**
   * 清理GitHub SSH连接
   */
  async cleanupGitHubConnection(): Promise<void> {
    const externalService = this.container.external;

    try {
      if (externalService.isProviderRunning('github-ssh-git')) {
        await externalService.stopProvider('github-ssh-git');
        console.log('GitHub SSH连接已停止');
        void window.showInformationMessage('GitHub SSH连接已停止');
      }
    } catch (error) {
      console.error('清理GitHub SSH连接失败:', error);
      void window.showErrorMessage(`清理GitHub SSH连接失败: ${String(error)}`);
    }
  }
}

/**
 * GitHub SSH配置示例
 * 展示不同场景下的GitHub SSH配置
 */
export const GitHubSSHConfigs = {
  /**
   * 基本GitHub SSH配置
   */
  basic: {
    providers: {
      path: '/usr/bin/git',
      name: 'GitHub SSH Git (Basic)',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: 'github.com',
        port: 22,
        username: 'git',
        privateKey: '~/.ssh/id_rsa',
        connectTimeout: 30000,
        keepAlive: 300000,
        retryAttempts: 3,
        retryDelay: 1000,
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null',
          LogLevel: 'ERROR'
        }
      }
    }
  } satisfies ExternalExecutableServiceConfig,

  /**
   * 企业GitHub SSH配置
   */
  enterprise: {
    providers: {
      path: '/usr/bin/git',
      name: 'GitHub Enterprise SSH Git',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: 'github.yourcompany.com', // 企业GitHub主机
        port: 22,
        username: 'git',
        privateKey: '~/.ssh/id_rsa',
        connectTimeout: 30000,
        keepAlive: 300000,
        retryAttempts: 3,
        retryDelay: 1000,
        sshOptions: {
          StrictHostKeyChecking: 'yes', // 企业环境建议启用
          UserKnownHostsFile: '~/.ssh/known_hosts',
          LogLevel: 'ERROR'
        }
      }
    }
  } satisfies ExternalExecutableServiceConfig,

  /**
   * 高安全性GitHub SSH配置
   */
  secure: {
    providers: {
      path: '/usr/bin/git',
      name: 'GitHub SSH Git (Secure)',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: 'github.com',
        port: 22,
        username: 'git',
        privateKey: '~/.ssh/id_ed25519', // 使用Ed25519密钥
        connectTimeout: 15000, // 更短的连接超时
        keepAlive: 600000, // 更长的保持连接时间
        retryAttempts: 5, // 更多重试次数
        retryDelay: 2000, // 更长的重试间隔
        sshOptions: {
          StrictHostKeyChecking: 'yes',
          UserKnownHostsFile: '~/.ssh/known_hosts',
          LogLevel: 'ERROR',
          Ciphers: 'chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com',
          MACs: 'hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com',
          KexAlgorithms: 'curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384'
        }
      }
    }
  } satisfies ExternalExecutableServiceConfig
};

/**
 * GitHub SSH使用说明
 */
export const GitHubSSHUsageGuide = {
  /**
   * 设置SSH密钥
   */
  setupSSHKey: {
    title: '设置SSH密钥',
    steps: [
      '1. 生成SSH密钥对: ssh-keygen -t ed25519 -C "your_email@example.com"',
      '2. 将公钥添加到GitHub: cat ~/.ssh/id_ed25519.pub',
      '3. 测试SSH连接: ssh -T git@github.com',
      '4. 配置SSH客户端（如果需要）'
    ]
  },

  /**
   * 常见问题解决
   */
  troubleshooting: {
    title: '常见问题解决',
    issues: [
      {
        problem: 'SSH连接被拒绝',
        solution: '检查SSH密钥是否正确添加到GitHub账户'
      },
      {
        problem: '权限被拒绝',
        solution: '确保SSH私钥文件权限正确（600）'
      },
      {
        problem: '主机密钥验证失败',
        solution: '运行 ssh-keyscan -H github.com >> ~/.ssh/known_hosts'
      },
      {
        problem: '连接超时',
        solution: '检查网络连接和防火墙设置'
      }
    ]
  },

  /**
   * 最佳实践
   */
  bestPractices: {
    title: '最佳实践',
    practices: [
      '使用Ed25519密钥而不是RSA密钥',
      '定期轮换SSH密钥',
      '为不同用途使用不同的SSH密钥',
      '启用SSH密钥的密码保护',
      '使用SSH代理来管理密钥',
      '定期更新SSH客户端'
    ]
  }
};
