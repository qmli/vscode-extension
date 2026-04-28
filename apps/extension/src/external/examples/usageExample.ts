/**
 * 外部可执行文件集成使用示例
 *
 * 这个文件展示了如何在 autosar 中使用外部可执行文件集成功能
 */

import { window } from 'vscode';
import { showMessage } from '@/core/message';
import { SSHClientDetector } from '@packages/vscode-external';
import type { Container } from '../../container';
import { SSHExecutableNotFoundError } from '../errors';
import type { ExternalExecutableServiceConfig } from '../externalExecutableService';
import { ProviderName } from '../externalExecutableService';
import { GitShellBasedProvider } from '../providers/gitShellBasedProvider';
import { SSHGitProvider } from '../providers/sshGitProvider';
import { GitHubSSHExample } from './githubSSHExample';

export class ExternalExecutableUsageExample {
  constructor(private readonly container: Container) {}

  /**
   * 示例 0: 检测跨平台SSH客户端
   */
  async demonstrateCrossPlatformSSH(): Promise<void> {
    try {
      console.log('=== 跨平台SSH客户端检测 ===');

      // 检测所有可用的SSH客户端
      const clients = await SSHClientDetector.detectAvailableClients();
      console.log(`检测到 ${clients.length} 个可用SSH客户端:`);

      for (const client of clients) {
        console.log(`- ${client.type}: ${client.path} (${client.version || 'unknown'})`);
      }

      // 获取最佳SSH客户端
      const bestClient = await SSHClientDetector.getBestSSHClient();
      if (bestClient) {
        console.log(`推荐使用: ${bestClient.type} at ${bestClient.path}`);
        void window.showInformationMessage(`检测到SSH客户端: ${bestClient.type}`);
      } else {
        console.log('未找到可用的SSH客户端');
        void window.showWarningMessage('未找到可用的SSH客户端，请安装OpenSSH或PuTTY');
      }

      console.log('当前平台: 跨平台支持');
    } catch (error) {
      console.error('SSH客户端检测失败:', error);
      void window.showErrorMessage(`SSH客户端检测失败: ${String(error)}`);
    }
  }

  /**
   * 示例 1: 注册和初始化外部可执行文件提供者
   */
  async registerSampleProvider(): Promise<void> {
    try {
      // 注册本地Git提供者
      const localConfig: ExternalExecutableServiceConfig = {
        providers: {
          path: 'C:\\Program Files\\Git\\cmd\\git.exe',
          name: 'Local GIT Tool',
          enabled: true,
          connectionType: 'local',
          timeout: 15000,
          autoRestart: true,
          startupArgs: [''],
          env: {
            MY_TOOL_CONFIG: 'production'
          }
        },
        globalTimeout: 30000,
        maxConcurrentExecutions: 5,
        enableStatusBar: true,
        enableNotifications: true
      };
      await this.container.external.registerProviders([
        {
          name: ProviderName.LocalGitTool,
          providerClass: GitShellBasedProvider,
          config: localConfig
        }
      ]);

      // 注册SSH Git提供者（跨平台配置）
      const sshConfig: ExternalExecutableServiceConfig = {
        providers: {
          path: '/usr/bin/git', // 远程服务器上的Git路径
          name: 'SSH GIT Tool',
          enabled: true,
          connectionType: 'remote',
          ssh: {
            host: '192.168.1.100', // 远程服务器IP
            port: 22,
            username: 'gituser',
            // 跨平台私钥路径处理（系统会自动检测平台）
            privateKey: '~/.ssh/id_rsa', // 支持跨平台路径展开
            connectTimeout: 30000,
            keepAlive: 300000,
            retryAttempts: 3,
            retryDelay: 1000,
            sshOptions: {
              StrictHostKeyChecking: 'no',
              // 跨平台null设备路径（系统会自动处理）
              UserKnownHostsFile: '/dev/null' // 系统会自动转换为平台相应的null设备
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
          name: ProviderName.SshGitTool,
          providerClass: SSHGitProvider,
          config: sshConfig
        }
      ]);

      console.log('本地和SSH可执行文件提供者注册成功');
    } catch (error) {
      console.error('注册示例提供者失败:', error);
      void window.showErrorMessage(`注册示例提供者失败: ${String(error)}`);
    }
  }

  /**
   * 示例 2: 执行基本命令
   */
  async executeBasicCommands(): Promise<void> {
    const externalService = this.container.external;

    try {
      // 本地Git命令示例
      console.log('=== 本地Git命令示例 ===');
      if (!externalService.isProviderRunning('local-git-tool')) {
        await externalService.startProvider('local-git-tool');
      }

      const localVersionResponse = await externalService.executeCommand('local-git-tool', '--version');
      console.log('本地Git版本:', localVersionResponse.data);

      // SSH Git命令示例
      console.log('=== SSH Git命令示例 ===');
      if (!externalService.isProviderRunning('ssh-git-tool')) {
        await externalService.startProvider('ssh-git-tool');
      }

      const sshVersionResponse = await externalService.executeCommand('ssh-git-tool', '--version');
      console.log('远程Git版本:', sshVersionResponse.data);

      // 显示结果
      void window.showInformationMessage(
        `Git操作成功 - 本地: ${localVersionResponse.data?.trim() || 'unknown'}, 远程: ${sshVersionResponse.data?.trim() || 'unknown'}`
      );
    } catch (error) {
      console.error('Git操作失败:', error);
      void window.showErrorMessage(`Git操作失败: ${String(error)}`);
    }
  }

  /**
   * 示例 2.1: SSH特定功能演示
   */
  async demonstrateSSHFeatures(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== SSH功能演示 ===');

      // 确保SSH提供者运行
      if (!externalService.isProviderRunning('ssh-git-tool')) {
        await externalService.startProvider('ssh-git-tool');
      }

      // 获取远程Git状态
      const statusResponse = await externalService.executeCommand('ssh-git-tool', 'status', ['--porcelain'], {
        cwd: '/home/gituser/myproject'
      });
      console.log('远程Git状态:', statusResponse.data);

      // 获取远程仓库信息
      const remoteResponse = await externalService.executeCommand('ssh-git-tool', 'remote', ['-v'], {
        cwd: '/home/gituser/myproject'
      });
      console.log('远程仓库信息:', remoteResponse.data);

      // 显示结果
      void window.showInformationMessage('SSH Git操作成功完成');
    } catch (error) {
      console.error('SSH Git操作失败:', error);
      void window.showErrorMessage(`SSH Git操作失败: ${String(error)}`);
    }
  }

  /**
   * 示例 3: 状态监控
   */
  monitorProviderStatus(): Promise<void> {
    const externalService = this.container.external;

    // 获取本地提供者状态
    const localStatus = externalService.getProviderStatus('local-git-tool');
    console.log('本地Git提供者状态:', localStatus);

    // 获取SSH提供者状态
    const sshStatus = externalService.getProviderStatus('ssh-git-tool');
    console.log('SSH Git提供者状态:', sshStatus);

    // 获取所有提供者状态
    const allStatuses = externalService.getAllProviderStatuses();
    console.log('所有提供者状态:', allStatuses);

    // 显示状态信息
    const statusMessages: string[] = [];

    if (localStatus) {
      statusMessages.push(
        `本地Git: ${localStatus.status} 最后活动: ${localStatus.lastActivity?.toLocaleString() || 'N/A'}`
      );
    }

    if (sshStatus) {
      statusMessages.push(
        `SSH Git: ${sshStatus.status} 最后活动: ${sshStatus.lastActivity?.toLocaleString() || 'N/A'}`
      );
    }

    if (statusMessages.length > 0) {
      void showMessage(statusMessages.join(' | '));
    }

    return Promise.resolve();
  }

  /**
   * 示例 4: 错误处理和重试
   */
  async demonstrateErrorHandling(): Promise<void> {
    const externalService = this.container.external;

    try {
      // 尝试执行不存在的命令
      await externalService.executeCommand('local-git-tool', 'non-existent-command');
    } catch (error) {
      console.log('预期的错误: 不存在的命令:', error);
    }

    try {
      // 尝试使用不存在的提供者
      await externalService.executeCommand('non-existent-provider', 'ping');
    } catch (error) {
      console.log('预期的错误: 不存在的提供者:', error);
    }

    try {
      // 尝试SSH连接失败（如果配置的服务器不可达）
      await externalService.executeCommand('ssh-git-tool', '--version');
    } catch (error) {
      console.log('预期的SSH连接错误:', error);
    }

    try {
      // 尝试执行不存在的远程可执行文件
      const badConfig: ExternalExecutableServiceConfig = {
        providers: {
          path: '/nonexistent/executable', // 不存在的可执行文件
          name: 'Bad SSH Tool',
          enabled: true,
          connectionType: 'remote',
          ssh: {
            host: '192.168.1.100',
            username: 'testuser',
            privateKey: 'C:\\Users\\YourUser\\.ssh\\id_rsa'
          }
        }
      };
      await this.container.external.registerProviders([
        {
          name: ProviderName.SshGitTool,
          providerClass: SSHGitProvider,
          config: badConfig
        }
      ]);
      await externalService.startProvider('local-ssh-git');
      await externalService.executeCommand('bad-ssh-tool', '--version');
    } catch (error) {
      if (error instanceof SSHExecutableNotFoundError) {
        console.log('预期的SSH可执行文件不存在错误:', error.message);
      } else {
        console.log('预期的SSH错误:', error);
      }
    }

    // 演示超时处理
    try {
      await externalService.executeCommand(
        'local-git-tool',
        'ping',
        [],
        { timeout: 1 } // 1ms 超时，必定失败
      );
    } catch (error) {
      console.log('预期的超时错误:', error);
    }
  }

  /**
   * 示例 5: 生命周期管理
   */
  async demonstrateLifecycleManagement(): Promise<void> {
    const externalService = this.container.external;

    try {
      console.log('=== 启动本地提供者 ===');
      await externalService.startProvider('local-git-tool');
      console.log('本地提供者已启动');

      console.log('=== 启动SSH提供者 ===');
      await externalService.startProvider('ssh-git-tool');
      console.log('SSH提供者已启动');

      // 等待一段时间
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('=== 重启SSH提供者 ===');
      await externalService.restartProvider('ssh-git-tool');
      console.log('SSH提供者已重启');

      // 再次等待
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('=== 停止所有提供者 ===');
      await externalService.stopProvider('local-git-tool');
      await externalService.stopProvider('ssh-git-tool');
      console.log('所有提供者已停止');
    } catch (error) {
      console.error('生命周期管理失败:', error);
    }
  }

  /**
   * 示例 6: GitHub SSH连接演示
   */
  async demonstrateGitHubSSH(): Promise<void> {
    try {
      console.log('=== GitHub SSH连接演示 ===');

      const githubExample = new GitHubSSHExample(this.container);
      await githubExample.demonstrateGitHubSSH();

      // 演示GitHub仓库克隆（模拟）
      await githubExample.demonstrateGitHubClone();

      // 获取连接状态
      githubExample.getGitHubConnectionStatus();

      console.log('GitHub SSH演示完成');
    } catch (error) {
      console.error('GitHub SSH演示失败:', error);
      void window.showErrorMessage(`GitHub SSH演示失败: ${String(error)}`);
    }
  }

  /**
   * 运行所有示例
   */
  async runAllExamples(): Promise<void> {
    try {
      console.log('开始运行外部可执行文件使用示例...');

      await this.demonstrateCrossPlatformSSH();
      await this.registerSampleProvider();
      await this.executeBasicCommands();
      await this.demonstrateSSHFeatures();
      await this.demonstrateGitHubSSH(); // 新增GitHub SSH演示
      await this.monitorProviderStatus();
      await this.demonstrateErrorHandling();
      await this.demonstrateLifecycleManagement();

      console.log('所有示例已成功完成！');
      void window.showInformationMessage('外部可执行文件示例已成功完成！');
    } catch (error) {
      console.error('示例运行失败:', error);
      void window.showErrorMessage(`示例运行失败: ${String(error)}`);
    }
  }
}

/**
 * 如何在扩展中使用这些示例:
 *
 * 1. 在扩展激活时注册提供者:
 * ```typescript
 * export async function activate(context: ExtensionContext) {
 *   const container = Container.instance;
 *   const examples = new ExternalExecutableUsageExample(container);
 *
 *   // 注册提供者
 *   await examples.registerSampleProvider();
 * }
 * ```
 *
 * 2. 创建命令来运行示例:
 * ```typescript
 * context.subscriptions.push(
 *   commands.registerCommand('autosar.examples.runExternalExamples', async () => {
 *     const examples = new ExternalExecutableUsageExample(Container.instance);
 *     await examples.runAllExamples();
 *   })
 * );
 * ```
 *
 * 3. 在配置中添加可执行文件设置:
 * ```json
 * {
 *   "autosar.external": {
 *     "enabled": true,
 *     "providers": {
 *       "local-git": {
 *         "path": "C:\\Program Files\\Git\\cmd\\git.exe",
 *         "name": "Local Git",
 *         "enabled": true,
 *         "connectionType": "local",
 *         "startupArgs": [],
 *         "autoRestart": true
 *       },
 *       "ssh-git": {
 *         "path": "/usr/bin/git",
 *         "name": "SSH Git",
 *         "enabled": true,
 *         "connectionType": "remote",
 *         "ssh": {
 *           "host": "192.168.1.100",
 *           "port": 22,
 *           "username": "gituser",
 *           "privateKey": "C:\\Users\\YourUser\\.ssh\\id_rsa",
 *           "connectTimeout": 30000,
 *           "keepAlive": 300000,
 *           "retryAttempts": 3,
 *           "retryDelay": 1000,
 *           "sshOptions": {
 *             "StrictHostKeyChecking": "no",
 *             "UserKnownHostsFile": "/dev/null"
 *           }
 *         },
 *         "timeout": 30000,
 *         "autoRestart": true
 *       }
 *     }
 *   }
 * }
 * ```
 */
