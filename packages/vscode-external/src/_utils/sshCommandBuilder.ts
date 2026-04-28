import { isAbsolute, normalize, resolve } from 'path';
import type { SSHConfig } from '../types/protocol';
import { PlatformUtils } from './platform';
import type { SSHClientInfo } from './sshClientDetector';
import { SSHClientType } from './sshClientDetector';

/**
 * SSH命令构建选项
 */
export interface SSHCommandOptions {
  /** SSH客户端信息 */
  client: SSHClientInfo;
  /** SSH配置 */
  config: SSHConfig;
  /** 远程命令 */
  remoteCommand: string;
  /** 是否为批处理模式 */
  batchMode?: boolean;
}

/**
 * 跨平台SSH命令构建器
 */
export const SSHCommandBuilder = {
  /**
   * 构建SSH命令参数
   * @param options SSH命令选项
   * @returns SSH命令参数数组
   */
  buildSSHArgs: function (options: SSHCommandOptions): string[] {
    const { client, config, remoteCommand, batchMode = true } = options;

    switch (client.type) {
      case SSHClientType.PuTTY:
        return this.buildPuTTYArgs(config, remoteCommand, batchMode);
      case SSHClientType.OpenSSH:
      case SSHClientType.WindowsOpenSSH:
      default:
        return this.buildOpenSSHArgs(config, remoteCommand, batchMode);
    }
  },

  /**
   * 构建OpenSSH命令参数
   * @param config SSH配置
   * @param remoteCommand 远程命令
   * @param batchMode 批处理模式
   * @returns OpenSSH命令参数
   */
  buildOpenSSHArgs: function (config: SSHConfig, remoteCommand: string, batchMode: boolean): string[] {
    const args: string[] = [];

    // 添加端口
    if (config.port && config.port !== 22) {
      args.push('-p', config.port.toString());
    }

    // 添加连接超时
    if (config.connectTimeout) {
      args.push('-o', `ConnectTimeout=${Math.floor(config.connectTimeout / 1000)}`);
    }

    // 添加保活设置
    if (config.keepAlive) {
      const interval = Math.floor(config.keepAlive / 1000);
      args.push('-o', `ServerAliveInterval=${interval}`);
      args.push('-o', 'ServerAliveCountMax=3');
    }

    // 添加私钥
    if (config.privateKey) {
      const keyPath = this.normalizePrivateKeyPath(config.privateKey);
      args.push('-i', keyPath);

      // 禁用密码认证（当使用私钥时）
      args.push('-o', 'PasswordAuthentication=no');
    }

    // 添加批处理模式
    if (batchMode) {
      args.push('-o', 'BatchMode=yes');
    }

    // 添加SSH选项
    if (config.sshOptions) {
      for (const [key, value] of Object.entries(config.sshOptions)) {
        args.push('-o', `${key}=${value}`);
      }
    }

    // 添加跨平台兼容性选项
    this.addCrossPlatformOptions(args);

    // 添加目标主机
    args.push(`${config.username}@${config.host}`);

    // 添加远程命令
    args.push(remoteCommand);

    return args;
  },

  /**
   * 构建PuTTY命令参数
   * @param config SSH配置
   * @param remoteCommand 远程命令
   * @param batchMode 批处理模式
   * @returns PuTTY命令参数
   */
  buildPuTTYArgs: function (config: SSHConfig, remoteCommand: string, batchMode: boolean): string[] {
    const args: string[] = [];

    // PuTTY使用不同的参数格式
    args.push('-ssh');

    // 添加端口
    if (config.port && config.port !== 22) {
      args.push('-P', config.port.toString());
    }

    // 添加私钥 (PuTTY使用.ppk格式)
    if (config.privateKey) {
      const keyPath = this.convertToWindowsPath(config.privateKey);
      // 尝试找到对应的.ppk文件
      const ppkPath = keyPath.replace(/\.(pem|key|rsa)$/i, '.ppk');
      args.push('-i', ppkPath);
    }

    // 添加批处理模式
    if (batchMode) {
      args.push('-batch');
    }

    // 添加连接超时
    if (config.connectTimeout) {
      // PuTTY的超时选项不同
      args.push('-timeout', Math.floor(config.connectTimeout / 1000).toString());
    }

    // 添加主机和用户名
    args.push(`${config.username}@${config.host}`);

    // 添加远程命令
    args.push(remoteCommand);

    return args;
  },

  /**
   * 添加跨平台兼容性选项
   * @param args 参数数组
   */
  addCrossPlatformOptions: function (args: string[]): void {
    // Windows特定选项
    if (PlatformUtils.isWindows()) {
      // 避免Windows终端的一些问题
      args.push('-o', 'StrictHostKeyChecking=no');
      args.push('-o', 'UserKnownHostsFile=NUL'); // Windows的null设备
    } else {
      // Unix-like系统
      args.push('-o', 'UserKnownHostsFile=/dev/null');
    }

    // 通用选项
    args.push('-o', 'LogLevel=ERROR'); // 减少日志输出
    args.push('-o', 'CheckHostIP=no');
  },

  /**
   * 规范化私钥路径
   * @param keyPath 原始私钥路径
   * @returns 规范化后的路径
   */
  normalizePrivateKeyPath: function (keyPath: string): string {
    // 处理相对路径
    if (!isAbsolute(keyPath)) {
      keyPath = resolve(keyPath);
    }

    // Windows路径处理
    if (PlatformUtils.isWindows()) {
      return this.convertToWindowsPath(keyPath);
    }

    // Unix路径处理
    return normalize(keyPath);
  },

  /**
   * 转换为Windows路径格式
   * @param path 原始路径
   * @returns Windows格式路径
   */
  convertToWindowsPath: function (path: string): string {
    // 规范化路径分隔符
    return normalize(path).replace(/\//g, '\\');
  },

  /**
   * 转换为Unix路径格式
   * @param path 原始路径
   * @returns Unix格式路径
   */
  convertToUnixPath: function (path: string): string {
    // 规范化路径分隔符
    return normalize(path).replace(/\\/g, '/');
  },

  /**
   * 处理用户主目录路径
   * @param path 包含~的路径
   * @returns 展开后的绝对路径
   */
  expandUserPath: function (path: string): string {
    if (!path.startsWith('~')) {
      return path;
    }

    const homeDir = PlatformUtils.getUserHome();

    if (!homeDir) {
      throw new Error('无法确定用户主目录');
    }

    return path.replace(/^~/, homeDir);
  },

  /**
   * 验证SSH配置的跨平台兼容性
   * @param config SSH配置
   * @param clientType SSH客户端类型
   * @returns 验证结果和建议
   */
  validateCrossPlatformConfig: function (
    config: SSHConfig,
    clientType: SSHClientType
  ): {
    valid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 检查私钥文件格式
    if (config.privateKey) {
      const keyPath = config.privateKey.toLowerCase();

      if (clientType === SSHClientType.PuTTY) {
        if (!keyPath.endsWith('.ppk')) {
          warnings.push('PuTTY需要.ppk格式的私钥文件');
          suggestions.push('使用PuTTYgen将私钥转换为.ppk格式');
        }
      } else if (keyPath.endsWith('.ppk')) {
        warnings.push('OpenSSH不支持.ppk格式的私钥文件');
        suggestions.push('使用OpenSSH格式的私钥文件(.pem, .key, .rsa)');
      }
    }

    // 检查路径格式
    if (PlatformUtils.isWindows() && config.privateKey) {
      if (config.privateKey.includes('/') && !config.privateKey.includes('\\')) {
        suggestions.push('建议在Windows上使用反斜杠路径分隔符');
      }
    }

    // 检查SSH选项兼容性
    if (config.sshOptions && clientType === SSHClientType.PuTTY) {
      const incompatibleOptions = Object.keys(config.sshOptions).filter((option) =>
        ['StrictHostKeyChecking', 'UserKnownHostsFile', 'BatchMode'].includes(option)
      );

      if (incompatibleOptions.length > 0) {
        warnings.push(`PuTTY不支持以下SSH选项: ${incompatibleOptions.join(', ')}`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings: warnings,
      suggestions: suggestions
    };
  }
};
