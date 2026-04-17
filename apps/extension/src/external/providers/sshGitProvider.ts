import { Logger } from '@/core/logger';
import { getLogScope } from '@/core/logger.scope';
import { SSHBasedExecutableProvider } from './sshBasedProvider';

/**
 * 基于SSH的Git提供者示例实现
 * 演示如何使用SSHBasedExecutableProvider基类连接远程Git服务器
 */
export class SSHGitProvider extends SSHBasedExecutableProvider {
  readonly name = 'ssh-git-tool';
  readonly version = '1.0.0';

  /**
   * 重写启动验证方法
   * 验证SSH连接和远程Git是否正常工作
   */
  protected async waitForStartup(): Promise<void> {
    const scope = getLogScope();
    Logger.debug(scope, `验证 ${this.name} SSH连接和Git工具...`);

    try {
      // 首先调用父类的启动验证（包含SSH连接测试）
      await super.waitForStartup();

      // 尝试获取Git版本信息进行额外验证
      const output = await this.execute('--version');
      const version = output.data?.trim() || 'unknown';
      Logger.debug(scope, `远程Git版本: ${version}`);

      // 验证是否真的是Git
      if (version !== 'unknown' && !version.toLowerCase().includes('git')) {
        Logger.warn(scope, `远程可执行文件可能不是Git: ${version}`);
      }
    } catch (ex) {
      Logger.warn(scope, `${this.name} 启动验证失败，但继续执行:`, ex);
      // 不抛出错误，允许继续运行
    }
  }

  /**
   * 获取远程Git版本
   * @returns 版本字符串
   */
  async getVersion(): Promise<string> {
    try {
      const output = await this.execute('--version');
      return output.data?.trim() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 执行Git状态检查
   * @param repoPath 仓库路径
   * @returns Git状态信息
   */
  async getGitStatus(repoPath: string): Promise<any> {
    const response = await this.execute('status', ['--porcelain'], { cwd: repoPath });
    return response.data;
  }

  /**
   * 执行Git拉取操作
   * @param repoPath 仓库路径
   * @returns 拉取结果
   */
  async gitPull(repoPath: string): Promise<any> {
    const response = await this.execute('pull', [], { cwd: repoPath });
    return response.data;
  }

  /**
   * 执行Git推送操作
   * @param repoPath 仓库路径
   * @param branch 分支名称
   * @returns 推送结果
   */
  async gitPush(repoPath: string, branch: string = 'main'): Promise<any> {
    const response = await this.execute('push', ['origin', branch], { cwd: repoPath });
    return response.data;
  }

  /**
   * 克隆远程仓库
   * @param repoUrl 仓库URL
   * @param localPath 本地路径
   * @returns 克隆结果
   */
  async gitClone(repoUrl: string, localPath: string): Promise<any> {
    const response = await this.execute('clone', [repoUrl, localPath]);
    return response.data;
  }

  /**
   * 获取远程仓库信息
   * @param repoPath 仓库路径
   * @returns 远程信息
   */
  async getRemoteInfo(repoPath: string): Promise<any> {
    const response = await this.execute('remote', ['-v'], { cwd: repoPath });
    return response.data;
  }
}
