/**
 * 本地SSH模拟使用示例
 * 展示如何使用本地Git来模拟远程SSH连接
 */

import { window } from 'vscode';
import type { Container } from '../../container';
import { LocalSSHQuickTest } from './localSSHQuickTest';
import { LocalSSHSimulation } from './localSSHSimulation';

/**
 * 本地SSH模拟使用示例类
 */
export class LocalSSHSimulationExample {
  constructor(private readonly container: Container) {}

  /**
   * 演示完整的本地SSH模拟功能
   */
  async demonstrateLocalSSHSimulation(): Promise<void> {
    try {
      console.log('=== 开始本地SSH模拟演示 ===');

      // 选择测试类型
      const testType = await window.showQuickPick(
        [
          { label: '快速测试', description: '简化的本地SSH测试，无需复杂设置', value: 'quick' },
          { label: '完整模拟', description: '完整的本地SSH服务器模拟', value: 'full' },
          { label: '仅测试连接', description: '只测试SSH连接功能', value: 'connection' }
        ],
        { placeHolder: '选择测试类型' }
      );

      if (!testType) {
        return;
      }

      switch (testType.value) {
        case 'quick':
          await this.runQuickTest();
          break;
        case 'full':
          await this.runFullSimulation();
          break;
        case 'connection':
          await this.runConnectionTest();
          break;
      }

      console.log('=== 本地SSH模拟演示完成 ===');
    } catch (error) {
      console.error('本地SSH模拟演示失败:', error);
      void window.showErrorMessage(`演示失败: ${String(error)}`);
    }
  }

  /**
   * 运行快速测试
   */
  private async runQuickTest(): Promise<void> {
    const quickTest = new LocalSSHQuickTest(this.container);

    try {
      console.log('--- 运行快速测试 ---');

      // 运行完整测试流程
      await quickTest.runFullTest();

      // 询问是否清理
      const shouldCleanup = await window.showInformationMessage('测试完成，是否清理临时文件？', '是', '否');

      if (shouldCleanup === '是') {
        await quickTest.cleanupTest();
      }

      void window.showInformationMessage('快速测试完成！');
    } catch (error) {
      console.error('快速测试失败:', error);
      void window.showErrorMessage(`快速测试失败: ${String(error)}`);

      // 尝试清理资源
      try {
        await quickTest.cleanupTest();
      } catch (cleanupError) {
        console.error('清理资源失败:', cleanupError);
      }
    }
  }

  /**
   * 运行完整模拟
   */
  private async runFullSimulation(): Promise<void> {
    const simulation = new LocalSSHSimulation(this.container);

    try {
      console.log('--- 运行完整模拟 ---');

      // 设置模拟环境
      await simulation.setupLocalSSHSimulation();

      // 测试连接
      await simulation.testLocalSSHConnection();

      // 演示Git操作
      await simulation.demonstrateLocalGitOperations();

      // 显示环境信息
      simulation.getSimulationInfo();

      // 询问是否清理
      const shouldCleanup = await window.showInformationMessage('模拟完成，是否清理临时文件？', '是', '否');

      if (shouldCleanup === '是') {
        await simulation.cleanupSimulation();
      }

      void window.showInformationMessage('完整模拟完成！');
    } catch (error) {
      console.error('完整模拟失败:', error);
      void window.showErrorMessage(`完整模拟失败: ${String(error)}`);

      // 尝试清理资源
      try {
        await simulation.cleanupSimulation();
      } catch (cleanupError) {
        console.error('清理资源失败:', cleanupError);
      }
    }
  }

  /**
   * 运行连接测试
   */
  private async runConnectionTest(): Promise<void> {
    const quickTest = new LocalSSHQuickTest(this.container);

    try {
      console.log('--- 运行连接测试 ---');

      // 快速设置
      await quickTest.quickSetup();

      // 测试SSH客户端检测
      await quickTest.testSSHClientDetection();

      // 测试SSH连接
      await quickTest.testLocalSSHConnection();

      // 显示环境信息
      quickTest.getTestInfo();

      void window.showInformationMessage('连接测试完成！');
    } catch (error) {
      console.error('连接测试失败:', error);
      void window.showErrorMessage(`连接测试失败: ${String(error)}`);

      // 尝试清理资源
      try {
        await quickTest.cleanupTest();
      } catch (cleanupError) {
        console.error('清理资源失败:', cleanupError);
      }
    }
  }

  /**
   * 演示SSH配置选项
   */
  async demonstrateSSHConfigurations(): Promise<void> {
    try {
      console.log('=== 演示SSH配置选项 ===');

      const configType = await window.showQuickPick(
        [
          { label: '基本配置', description: '最简单的SSH配置', value: 'basic' },
          { label: '开发环境', description: '适合开发环境的配置', value: 'development' },
          { label: '生产环境', description: '适合生产环境的配置', value: 'production' },
          { label: '高安全性', description: '高安全性SSH配置', value: 'secure' }
        ],
        { placeHolder: '选择配置类型' }
      );

      if (!configType) {
        return;
      }

      // 显示配置信息
      this.showConfigurationInfo(configType.value);

      void window.showInformationMessage(`${configType.label}配置信息已显示在控制台`);
    } catch (error) {
      console.error('演示SSH配置失败:', error);
      void window.showErrorMessage(`演示失败: ${String(error)}`);
    }
  }

  /**
   * 显示配置信息
   */
  private showConfigurationInfo(configType: string): void {
    console.log(`=== ${configType} SSH配置信息 ===`);

    switch (configType) {
      case 'basic':
        console.log('基本SSH配置:');
        console.log('- 主机: localhost');
        console.log('- 端口: 2222');
        console.log('- 用户: git');
        console.log('- 私钥: ~/.ssh/id_rsa');
        console.log('- 连接超时: 10秒');
        console.log('- 重试次数: 3次');
        break;

      case 'development':
        console.log('开发环境SSH配置:');
        console.log('- 主机: localhost');
        console.log('- 端口: 2222');
        console.log('- 用户: git');
        console.log('- 私钥: ~/.ssh/id_rsa');
        console.log('- 连接超时: 5秒');
        console.log('- 重试次数: 5次');
        console.log('- 日志级别: DEBUG');
        console.log('- 启用压缩');
        break;

      case 'production':
        console.log('生产环境SSH配置:');
        console.log('- 主机: your-server.com');
        console.log('- 端口: 22');
        console.log('- 用户: git');
        console.log('- 私钥: ~/.ssh/id_ed25519');
        console.log('- 连接超时: 15秒');
        console.log('- 重试次数: 3次');
        console.log('- 严格主机密钥检查: 是');
        console.log('- 使用已知主机文件');
        break;

      case 'secure':
        console.log('高安全性SSH配置:');
        console.log('- 主机: your-server.com');
        console.log('- 端口: 22');
        console.log('- 用户: git');
        console.log('- 私钥: ~/.ssh/id_ed25519');
        console.log('- 连接超时: 15秒');
        console.log('- 重试次数: 5次');
        console.log('- 严格主机密钥检查: 是');
        console.log('- 使用已知主机文件');
        console.log('- 指定加密算法');
        console.log('- 指定MAC算法');
        console.log('- 指定密钥交换算法');
        break;
    }
  }

  /**
   * 显示使用指南
   */
  async showUsageGuide(): Promise<void> {
    try {
      console.log('=== 本地SSH模拟使用指南 ===');

      const guideType = await window.showQuickPick(
        [
          { label: '快速开始', description: '如何快速开始使用', value: 'quickstart' },
          { label: '配置说明', description: '各种配置选项说明', value: 'config' },
          { label: '故障排除', description: '常见问题解决方案', value: 'troubleshooting' },
          { label: '最佳实践', description: '使用最佳实践', value: 'bestpractices' }
        ],
        { placeHolder: '选择指南类型' }
      );

      if (!guideType) {
        return;
      }

      this.showGuideContent(guideType.value);

      void window.showInformationMessage(`${guideType.label}指南已显示在控制台`);
    } catch (error) {
      console.error('显示使用指南失败:', error);
      void window.showErrorMessage(`显示指南失败: ${String(error)}`);
    }
  }

  /**
   * 显示指南内容
   */
  private showGuideContent(guideType: string): void {
    console.log(`=== ${guideType}指南 ===`);

    switch (guideType) {
      case 'quickstart':
        console.log('快速开始步骤:');
        console.log('1. 创建LocalSSHQuickTest实例');
        console.log('2. 调用runFullTest()运行完整测试');
        console.log('3. 查看控制台输出了解测试结果');
        console.log('4. 调用cleanupTest()清理环境');
        break;

      case 'config':
        console.log('配置选项说明:');
        console.log('- host: SSH服务器主机名或IP地址');
        console.log('- port: SSH服务器端口（默认22）');
        console.log('- username: SSH用户名');
        console.log('- privateKey: SSH私钥文件路径');
        console.log('- connectTimeout: 连接超时时间（毫秒）');
        console.log('- keepAlive: 保持连接时间（毫秒）');
        console.log('- retryAttempts: 重试次数');
        console.log('- retryDelay: 重试间隔（毫秒）');
        console.log('- sshOptions: SSH客户端选项');
        break;

      case 'troubleshooting':
        console.log('常见问题解决方案:');
        console.log('1. SSH连接被拒绝:');
        console.log('   - 检查SSH服务器是否运行');
        console.log('   - 检查端口和配置');
        console.log('2. 权限被拒绝:');
        console.log('   - 检查SSH密钥文件权限（600）');
        console.log('   - 检查authorized_keys文件');
        console.log('3. 端口被占用:');
        console.log('   - 更改SSH端口');
        console.log('   - 停止占用端口的服务');
        console.log('4. Git操作失败:');
        console.log('   - 确保Git仓库路径正确');
        console.log('   - 检查仓库访问权限');
        break;

      case 'bestpractices':
        console.log('使用最佳实践:');
        console.log('1. 使用Ed25519密钥而不是RSA密钥');
        console.log('2. 定期轮换SSH密钥');
        console.log('3. 为不同用途使用不同的SSH密钥');
        console.log('4. 启用SSH密钥的密码保护');
        console.log('5. 使用SSH代理来管理密钥');
        console.log('6. 定期更新SSH客户端');
        console.log('7. 在生产环境中启用严格的主机密钥检查');
        console.log('8. 使用适当的超时和重试设置');
        break;
    }
  }
}
