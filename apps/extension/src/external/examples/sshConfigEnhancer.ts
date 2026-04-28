/**
 * SSH配置增强工具
 * 提供SSH客户端检测、配置优化和跨平台支持
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { SSHClientDetector } from '@packages/vscode-external';
import type { SSHConfig } from '../types/protocol';
import { ValidationUtils } from './validationUtils';

const execAsync = promisify(exec);

/**
 * SSH客户端信息
 */
export interface SSHClientInfo {
  type: string;
  path: string;
  version?: string;
  supported: boolean;
  features: string[];
}

/**
 * SSH配置增强器
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SSHConfigEnhancer {
  private static _detectedClients: SSHClientInfo[] | null = null;

  /**
   * 检测所有可用的SSH客户端
   */
  static async detectSSHClients(): Promise<SSHClientInfo[]> {
    if (this._detectedClients) {
      return this._detectedClients;
    }

    const clients: SSHClientInfo[] = [];

    try {
      // 使用现有的SSHClientDetector
      const detectedClients = await SSHClientDetector.detectAvailableClients();

      for (const client of detectedClients) {
        const clientInfo: SSHClientInfo = {
          type: client.type,
          path: client.path,
          version: client.version,
          supported: true,
          features: await this.detectClientFeatures(client.path)
        };

        clients.push(clientInfo);
      }
    } catch (error) {
      console.warn('SSH客户端检测失败:', error);
    }

    // 添加平台特定的默认客户端
    const defaultClient = this.getDefaultSSHClient();
    if (defaultClient && !clients.some((c) => c.type === defaultClient.type)) {
      clients.push(defaultClient);
    }

    this._detectedClients = clients;
    return clients;
  }

  /**
   * 获取最佳SSH客户端
   */
  static async getBestSSHClient(): Promise<SSHClientInfo | null> {
    const clients = await this.detectSSHClients();

    if (clients.length === 0) {
      return null;
    }

    // 优先级：OpenSSH > PuTTY > 其他
    const priorityOrder = ['openssh', 'putty', 'ssh'];

    for (const priority of priorityOrder) {
      const client = clients.find((c) => c.type.toLowerCase().includes(priority));
      if (client?.supported) {
        return client;
      }
    }

    // 返回第一个支持的客户端
    return clients.find((c) => c.supported) || clients[0];
  }

  /**
   * 检测客户端特性
   */
  private static async detectClientFeatures(clientPath: string): Promise<string[]> {
    const features: string[] = [];

    try {
      // 检测版本信息
      const { stdout } = await execAsync(`"${clientPath}" -V 2>&1`);
      const versionOutput = stdout.toLowerCase();

      // 检测支持的特性
      if (versionOutput.includes('openssh')) {
        features.push('openssh', 'ed25519', 'rsa', 'ecdsa');
      }

      if (versionOutput.includes('putty')) {
        features.push('putty', 'rsa', 'ed25519');
      }

      // 检测密钥类型支持
      if (versionOutput.includes('ed25519')) {
        features.push('ed25519');
      }

      if (versionOutput.includes('rsa')) {
        features.push('rsa');
      }

      if (versionOutput.includes('ecdsa')) {
        features.push('ecdsa');
      }

      // 检测压缩支持
      if (versionOutput.includes('compression')) {
        features.push('compression');
      }

      // 检测端口转发支持
      if (versionOutput.includes('forwarding')) {
        features.push('port-forwarding');
      }
    } catch (error) {
      console.warn(`检测客户端特性失败: ${clientPath}`, error);
    }

    return features;
  }

  /**
   * 获取平台默认SSH客户端
   */
  private static getDefaultSSHClient(): SSHClientInfo {
    // eslint-disable-next-line no-restricted-globals
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return {
          type: 'openssh',
          path: 'ssh',
          supported: true,
          features: ['openssh', 'rsa', 'ed25519']
        };
      case 'darwin':
        return {
          type: 'openssh',
          path: '/usr/bin/ssh',
          supported: true,
          features: ['openssh', 'rsa', 'ed25519', 'ecdsa']
        };
      case 'linux':
        return {
          type: 'openssh',
          path: '/usr/bin/ssh',
          supported: true,
          features: ['openssh', 'rsa', 'ed25519', 'ecdsa']
        };
      default:
        return {
          type: 'ssh',
          path: 'ssh',
          supported: false,
          features: []
        };
    }
  }

  /**
   * 优化SSH配置
   */
  static async optimizeSSHConfig(baseConfig: Partial<SSHConfig>): Promise<SSHConfig> {
    const bestClient = await this.getBestSSHClient();

    if (!bestClient) {
      throw new Error('未找到可用的SSH客户端');
    }

    // 基础配置
    const optimizedConfig: SSHConfig = {
      host: baseConfig.host || 'localhost',
      port: baseConfig.port || 22,
      username: baseConfig.username || 'git',
      connectTimeout: baseConfig.connectTimeout || 10000,
      keepAlive: baseConfig.keepAlive || 300000,
      retryAttempts: baseConfig.retryAttempts || 3,
      retryDelay: baseConfig.retryDelay || 1000,
      ...baseConfig
    };

    // 根据客户端特性优化配置
    if (bestClient.features.includes('ed25519')) {
      // 推荐使用Ed25519密钥
      if (!optimizedConfig.privateKey) {
        optimizedConfig.privateKey = this.getDefaultKeyPath('ed25519');
      }
    }

    // 优化SSH选项
    optimizedConfig.sshOptions = {
      StrictHostKeyChecking: 'no',
      UserKnownHostsFile: '/dev/null',
      LogLevel: 'ERROR',
      ...optimizedConfig.sshOptions
    };

    // 根据客户端类型添加特定选项
    if (bestClient.features.includes('openssh')) {
      optimizedConfig.sshOptions = {
        ...optimizedConfig.sshOptions,
        Compression: 'yes',
        ServerAliveInterval: '60',
        ServerAliveCountMax: '3'
      };
    }

    // 验证配置
    const validation = ValidationUtils.validateSSHConfig(optimizedConfig);
    if (!validation.valid) {
      throw new Error(`SSH配置验证失败: ${validation.error}`);
    }

    return optimizedConfig;
  }

  /**
   * 获取默认密钥路径
   */
  private static getDefaultKeyPath(keyType: string): string {
    // eslint-disable-next-line no-restricted-globals
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';

    switch (keyType) {
      case 'ed25519':
        return path.join(homeDir, '.ssh', 'id_ed25519');
      case 'rsa':
        return path.join(homeDir, '.ssh', 'id_rsa');
      case 'ecdsa':
        return path.join(homeDir, '.ssh', 'id_ecdsa');
      default:
        return path.join(homeDir, '.ssh', 'id_rsa');
    }
  }

  /**
   * 生成SSH密钥对
   */
  static async generateSSHKeyPair(
    keyPath: string,
    keyType: 'rsa' | 'ed25519' | 'ecdsa' = 'ed25519',
    comment?: string
  ): Promise<{ privateKey: string; publicKey: string }> {
    const bestClient = await this.getBestSSHClient();

    if (!bestClient) {
      throw new Error('未找到可用的SSH客户端');
    }

    // 确保目录存在
    const keyDir = path.dirname(keyPath);
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }

    // 构建ssh-keygen命令
    const commentStr = comment || `generated-by-ssh-config-enhancer-${Date.now()}`;
    let keygenCmd: string;

    switch (keyType) {
      case 'ed25519':
        keygenCmd = `ssh-keygen -t ed25519 -f "${keyPath}" -N "" -C "${commentStr}"`;
        break;
      case 'rsa':
        keygenCmd = `ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -C "${commentStr}"`;
        break;
      case 'ecdsa':
        keygenCmd = `ssh-keygen -t ecdsa -b 521 -f "${keyPath}" -N "" -C "${commentStr}"`;
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`不支持的密钥类型: ${keyType}`);
    }

    try {
      await execAsync(keygenCmd);

      // 验证密钥文件是否生成成功
      const privateKeyPath = keyPath;
      const publicKeyPath = `${keyPath}.pub`;

      if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        throw new Error('SSH密钥文件生成失败');
      }

      // 设置适当的文件权限
      // eslint-disable-next-line no-restricted-globals
      if (process.platform !== 'win32') {
        fs.chmodSync(privateKeyPath, 0o600);
        fs.chmodSync(publicKeyPath, 0o644);
      }

      return {
        privateKey: privateKeyPath,
        publicKey: publicKeyPath
      };
    } catch (error) {
      throw new Error(`生成SSH密钥对失败: ${String(error)}`);
    }
  }

  /**
   * 测试SSH连接
   */
  static async testSSHConnection(config: SSHConfig): Promise<boolean> {
    const bestClient = await this.getBestSSHClient();

    if (!bestClient) {
      return false;
    }

    try {
      // 构建SSH连接测试命令
      const sshCmd = this.buildSSHTestCommand(config, bestClient.path);
      await execAsync(sshCmd, { timeout: config.connectTimeout || 10000 });
      return true;
    } catch (error) {
      console.warn('SSH连接测试失败:', error);
      return false;
    }
  }

  /**
   * 构建SSH测试命令
   */
  private static buildSSHTestCommand(config: SSHConfig, sshPath: string): string {
    const parts = [sshPath];

    // 添加端口
    if (config.port && config.port !== 22) {
      parts.push('-p', config.port.toString());
    }

    // 添加超时
    if (config.connectTimeout) {
      parts.push('-o', `ConnectTimeout=${Math.ceil(config.connectTimeout / 1000)}`);
    }

    // 添加SSH选项
    if (config.sshOptions) {
      for (const [key, value] of Object.entries(config.sshOptions)) {
        parts.push('-o', `${key}=${value}`);
      }
    }

    // 添加私钥
    if (config.privateKey) {
      parts.push('-i', config.privateKey);
    }

    // 添加用户名和主机
    parts.push(`${config.username}@${config.host}`);

    // 添加测试命令
    parts.push('echo "SSH connection test successful"');

    return parts.join(' ');
  }

  /**
   * 获取SSH配置建议
   */
  static async getSSHConfigSuggestions(): Promise<{
    client: SSHClientInfo | null;
    recommendations: string[];
    warnings: string[];
  }> {
    const bestClient = await this.getBestSSHClient();
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (!bestClient) {
      warnings.push('未找到可用的SSH客户端，请安装OpenSSH或PuTTY');
      return { client: null, recommendations: recommendations, warnings: warnings };
    }

    // 基于客户端类型提供建议
    if (bestClient.features.includes('openssh')) {
      recommendations.push('推荐使用Ed25519密钥，安全性更高');
      recommendations.push('启用SSH密钥的密码保护');
      recommendations.push('定期轮换SSH密钥');
    }

    if (bestClient.features.includes('putty')) {
      recommendations.push('建议使用PuTTYgen生成密钥');
      recommendations.push('保存私钥为.ppk格式');
    }

    // 检查密钥文件
    const defaultKeyPath = this.getDefaultKeyPath('ed25519');
    if (!fs.existsSync(defaultKeyPath)) {
      recommendations.push(`生成SSH密钥对: ${defaultKeyPath}`);
    }

    // 检查SSH配置
    // eslint-disable-next-line no-restricted-globals
    const sshConfigPath = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.ssh', 'config');
    if (!fs.existsSync(sshConfigPath)) {
      recommendations.push('创建SSH配置文件以简化连接');
    }

    return {
      client: bestClient,
      recommendations: recommendations,
      warnings: warnings
    };
  }

  /**
   * 清理检测缓存
   */
  static clearCache(): void {
    this._detectedClients = null;
  }
}

/**
 * SSH配置预设
 */
export const SSHConfigPresets = {
  /**
   * 开发环境配置
   */
  development: {
    host: 'localhost',
    port: 22,
    username: 'git',
    connectTimeout: 5000,
    keepAlive: 600000,
    retryAttempts: 5,
    retryDelay: 500,
    sshOptions: {
      StrictHostKeyChecking: 'no',
      UserKnownHostsFile: '/dev/null',
      LogLevel: 'DEBUG',
      Compression: 'yes'
    }
  } satisfies Partial<SSHConfig>,

  /**
   * 生产环境配置
   */
  production: {
    host: 'your-server.com',
    port: 22,
    username: 'git',
    connectTimeout: 15000,
    keepAlive: 300000,
    retryAttempts: 3,
    retryDelay: 1000,
    sshOptions: {
      StrictHostKeyChecking: 'yes',
      LogLevel: 'ERROR',
      Compression: 'yes',
      ServerAliveInterval: '60',
      ServerAliveCountMax: '3'
    }
  } satisfies Partial<SSHConfig>,

  /**
   * 高安全性配置
   */
  secure: {
    host: 'your-server.com',
    port: 22,
    username: 'git',
    connectTimeout: 15000,
    keepAlive: 300000,
    retryAttempts: 5,
    retryDelay: 2000,
    sshOptions: {
      StrictHostKeyChecking: 'yes',
      LogLevel: 'ERROR',
      Compression: 'yes',
      ServerAliveInterval: '30',
      ServerAliveCountMax: '3',
      Ciphers: 'chacha20-poly1305@openssh.com,aes256-gcm@openssh.com',
      MACs: 'hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com',
      KexAlgorithms: 'curve25519-sha256@libssh.org,diffie-hellman-group16-sha512'
    }
  } satisfies Partial<SSHConfig>
};
