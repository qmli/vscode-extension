/**
 * GitHub SSH快速测试脚本
 * 用于快速验证SSH连接功能
 */

import { window } from 'vscode';
import { SSHClientDetector } from '@packages/vscode-external';
import type { Container } from '../../container';
import type { ExternalExecutableServiceConfig } from '../externalExecutableService';
import { ProviderName } from '../externalExecutableService';
import { SSHGitProvider } from '../providers/sshGitProvider';

export class GitHubSSHQuickTest {
  constructor(private readonly container: Container) {}

  /**
   * 快速测试GitHub SSH连接
   * @param sshKeyPath SSH私钥路径，默认为 ~/.ssh/id_rsa
   */
  async quickTest(sshKeyPath: string = '~/.ssh/id_rsa'): Promise<boolean> {
    try {
      console.log('=== GitHub SSH快速测试 ===');
      console.log(`使用SSH密钥: ${sshKeyPath}`);

      // 1. 检测SSH客户端
      const clients = await SSHClientDetector.detectAvailableClients();
      if (clients.length === 0) {
        console.error('未找到可用的SSH客户端');
        void window.showErrorMessage('未找到可用的SSH客户端，请安装OpenSSH或PuTTY');
        return false;
      }

      const bestClient = await SSHClientDetector.getBestSSHClient();
      console.log(`使用SSH客户端: ${bestClient?.type} at ${bestClient?.path}`);

      // 2. 注册GitHub SSH提供者
      const config: ExternalExecutableServiceConfig = {
        providers: {
          path: '/usr/bin/git',
          name: 'GitHub SSH Quick Test',
          enabled: true,
          connectionType: 'remote',
          ssh: {
            host: 'github.com',
            port: 22,
            username: 'git',
            privateKey: sshKeyPath,
            connectTimeout: 10000, // 10秒超时，快速测试
            keepAlive: 60000, // 1分钟保持连接
            retryAttempts: 2, // 减少重试次数
            retryDelay: 500, // 减少重试间隔
            sshOptions: {
              StrictHostKeyChecking: 'no',
              UserKnownHostsFile: '/dev/null',
              LogLevel: 'ERROR'
            }
          },
          timeout: 10000
        }
      };

      await this.container.external.registerProviders([
        {
          name: ProviderName.GithubSshGit,
          providerClass: SSHGitProvider,
          config: config
        }
      ]);
      console.log('GitHub SSH提供者注册成功');

      // 3. 启动提供者
      await this.container.external.startProvider('local-git-tool');
      console.log('GitHub SSH提供者启动成功');

      // 4. 测试连接
      const response = await this.container.external.executeCommand('github-quick-test', '--version');
      console.log('GitHub SSH连接测试成功！');
      console.log('远程Git版本:', response.data);

      // 5. 清理
      await this.container.external.stopProvider('local-git-tool');
      console.log('GitHub SSH提供者已停止');

      void window.showInformationMessage('GitHub SSH连接测试成功！');
      return true;
    } catch (error) {
      console.error('GitHub SSH连接测试失败:', error);
      void window.showErrorMessage(`GitHub SSH连接测试失败: ${String(error)}`);
      return false;
    }
  }

  /**
   * 测试不同的SSH密钥路径
   */
  async testMultipleSSHKeys(): Promise<void> {
    const commonKeyPaths = [
      '~/.ssh/id_rsa',
      '~/.ssh/id_ed25519',
      '~/.ssh/id_ecdsa',
      '~/.ssh/github_rsa',
      '~/.ssh/github_ed25519'
    ];

    console.log('=== 测试多个SSH密钥路径 ===');

    for (const keyPath of commonKeyPaths) {
      console.log(`\n测试SSH密钥: ${keyPath}`);
      try {
        const success = await this.quickTest(keyPath);
        if (success) {
          console.log(`✅ ${keyPath} 测试成功`);
          void window.showInformationMessage(`SSH密钥 ${keyPath} 测试成功！`);
          return; // 找到一个可用的密钥就停止
        }
        console.log(`❌ ${keyPath} 测试失败`);
      } catch (error) {
        console.log(`❌ ${keyPath} 测试出错:`, error);
      }
    }

    void window.showWarningMessage('所有SSH密钥路径测试都失败了，请检查SSH密钥配置');
  }

  /**
   * 获取SSH连接诊断信息
   */
  async getSSHDiagnostics(): Promise<void> {
    try {
      console.log('=== SSH连接诊断信息 ===');

      // 1. SSH客户端信息
      const clients = await SSHClientDetector.detectAvailableClients();
      console.log('可用SSH客户端:');
      clients.forEach((client) => {
        console.log(`- ${client.type}: ${client.path} (${client.version || 'unknown'})`);
      });

      const bestClient = await SSHClientDetector.getBestSSHClient();
      console.log(`推荐SSH客户端: ${bestClient?.type} at ${bestClient?.path}`);

      // 2. 平台信息
      console.log('平台信息:');
      // eslint-disable-next-line no-restricted-globals
      console.log(`- 操作系统: ${process.platform}`);
      // eslint-disable-next-line no-restricted-globals
      console.log(`- 架构: ${process.arch}`);
      // eslint-disable-next-line no-restricted-globals
      console.log(`- Node.js版本: ${process.version}`);

      // 3. 环境变量
      console.log('相关环境变量:');
      // eslint-disable-next-line no-restricted-globals
      console.log(`- HOME: ${process.env.HOME || process.env.USERPROFILE || 'N/A'}`);
      // eslint-disable-next-line no-restricted-globals
      console.log(`- SSH_AUTH_SOCK: ${process.env.SSH_AUTH_SOCK || 'N/A'}`);

      // 4. 建议
      console.log('\n建议:');
      if (clients.length === 0) {
        console.log('- 安装SSH客户端 (OpenSSH, PuTTY等)');
      }
      // eslint-disable-next-line no-restricted-globals
      if (!process.env.HOME && !process.env.USERPROFILE) {
        console.log('- 设置HOME或USERPROFILE环境变量');
      }
      console.log('- 确保SSH密钥文件存在且权限正确');
      console.log('- 将SSH公钥添加到GitHub账户');

      void window.showInformationMessage('SSH诊断信息已输出到控制台');
    } catch (error) {
      console.error('获取SSH诊断信息失败:', error);
      void window.showErrorMessage(`获取SSH诊断信息失败: ${String(error)}`);
    }
  }
}

/**
 * 使用示例:
 *
 * ```typescript
 * // 在扩展中创建快速测试实例
 * const quickTest = new GitHubSSHQuickTest(Container.instance);
 *
 * // 使用默认SSH密钥测试
 * await quickTest.quickTest();
 *
 * // 使用指定SSH密钥测试
 * await quickTest.quickTest('~/.ssh/id_ed25519');
 *
 * // 测试多个SSH密钥
 * await quickTest.testMultipleSSHKeys();
 *
 * // 获取诊断信息
 * await quickTest.getSSHDiagnostics();
 * ```
 */
