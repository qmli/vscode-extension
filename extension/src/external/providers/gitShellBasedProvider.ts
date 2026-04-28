import { Logger } from '@orientais/vscode-core/logger';
import { getLogScope } from '@orientais/vscode-core/logger.scope';
import { ShellBasedExecutableProvider } from '@orientais/vscode-external/providers/shellBasedProvider';

/**
 * 基于Shell的提供者示例实现
 * 演示如何使用ShellBasedExecutableProvider基类
 */
export class GitShellBasedProvider extends ShellBasedExecutableProvider {
  readonly name = 'my-git-tool';
  readonly version = '1.0.0';

  /**
   * 重写启动验证方法
   * 验证可执行文件是否正常工作
   */
  protected async waitForStartup(): Promise<void> {
    const scope = getLogScope();
    Logger.debug(scope, `Verifying ${this.name} startup...`);

    try {
      // 尝试获取版本信息
      const output = await this.executeShellCommand('--version');
      Logger.debug(scope, `${this.name} version: ${output.trim()}`);
    } catch (ex) {
      Logger.warn(scope, `${this.name} 版本检查失败，但继续执行:`, ex);
    }
  }

  /**
   * 使用直接shell执行获取版本
   * @returns 版本字符串
   */
  async getVersion(): Promise<string> {
    try {
      const output = await this.executeShellCommand('--version');
      return output.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * 使用通道系统处理文件
   * @param filePath 文件路径
   * @returns 处理结果
   */
  async processFile(filePath: string): Promise<any> {
    const response = await this.execute('process', [filePath]);
    return response.data;
  }
}
