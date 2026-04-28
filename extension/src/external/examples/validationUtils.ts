/**
 * 本地SSH模拟验证工具
 * 提供输入验证和边界检查功能
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * 验证工具类
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ValidationUtils {
  /**
   * 验证路径是否存在且可访问
   * @param filePath 文件路径
   * @param isDirectory 是否为目录
   * @returns 验证结果
   */
  static validatePath(filePath: string, isDirectory: boolean = false): { valid: boolean; error?: string } {
    try {
      if (!filePath || filePath.trim() === '') {
        return { valid: false, error: '路径不能为空' };
      }

      const normalizedPath = path.normalize(filePath);

      if (!fs.existsSync(normalizedPath)) {
        return { valid: false, error: `路径不存在: ${normalizedPath}` };
      }

      const stats = fs.statSync(normalizedPath);

      if (isDirectory && !stats.isDirectory()) {
        return { valid: false, error: `路径不是目录: ${normalizedPath}` };
      }

      if (!isDirectory && !stats.isFile()) {
        return { valid: false, error: `路径不是文件: ${normalizedPath}` };
      }

      // 检查权限
      try {
        if (isDirectory) {
          fs.accessSync(normalizedPath, fs.constants.R_OK | fs.constants.W_OK);
        } else {
          fs.accessSync(normalizedPath, fs.constants.R_OK);
        }
      } catch {
        return { valid: false, error: `路径权限不足: ${normalizedPath}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `路径验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证SSH配置
   * @param sshConfig SSH配置对象
   * @returns 验证结果
   */
  static validateSSHConfig(sshConfig: any): { valid: boolean; error?: string } {
    try {
      if (!sshConfig) {
        return { valid: false, error: 'SSH配置不能为空' };
      }

      // 验证主机
      if (!sshConfig.host || typeof sshConfig.host !== 'string' || sshConfig.host.trim() === '') {
        return { valid: false, error: 'SSH主机地址不能为空' };
      }

      // 验证用户名
      if (!sshConfig.username || typeof sshConfig.username !== 'string' || sshConfig.username.trim() === '') {
        return { valid: false, error: 'SSH用户名不能为空' };
      }

      // 验证端口
      if (sshConfig.port !== undefined) {
        const port = Number(sshConfig.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          return { valid: false, error: 'SSH端口必须在1-65535范围内' };
        }
      }

      // 验证认证方式
      if (!sshConfig.privateKey && !sshConfig.password) {
        return { valid: false, error: '必须提供SSH私钥或密码' };
      }

      // 验证私钥文件
      if (sshConfig.privateKey) {
        const keyValidation = this.validatePath(sshConfig.privateKey, false);
        if (!keyValidation.valid) {
          return { valid: false, error: `SSH私钥文件验证失败: ${keyValidation.error}` };
        }
      }

      // 验证超时设置
      if (sshConfig.connectTimeout !== undefined) {
        const timeout = Number(sshConfig.connectTimeout);
        if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
          return { valid: false, error: '连接超时时间必须在1000-300000毫秒范围内' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `SSH配置验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证Git可执行文件路径
   * @param gitPath Git路径
   * @returns 验证结果
   */
  static validateGitPath(gitPath: string): { valid: boolean; error?: string } {
    try {
      if (!gitPath || gitPath.trim() === '') {
        return { valid: false, error: 'Git路径不能为空' };
      }

      // 对于Windows，允许直接使用'git'命令
      // eslint-disable-next-line no-restricted-globals
      if (process.platform === 'win32' && gitPath === 'git') {
        return { valid: true };
      }

      // 验证文件路径
      const pathValidation = this.validatePath(gitPath, false);
      if (!pathValidation.valid) {
        return { valid: false, error: `Git路径验证失败: ${pathValidation.error}` };
      }

      // 检查文件是否可执行
      try {
        fs.accessSync(gitPath, fs.constants.X_OK);
      } catch {
        return { valid: false, error: `Git文件不可执行: ${gitPath}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Git路径验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证端口号
   * @param port 端口号
   * @returns 验证结果
   */
  static validatePort(port: number | string): { valid: boolean; error?: string } {
    try {
      const portNum = Number(port);

      if (isNaN(portNum)) {
        return { valid: false, error: '端口号必须是数字' };
      }

      if (portNum < 1 || portNum > 65535) {
        return { valid: false, error: '端口号必须在1-65535范围内' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `端口验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证超时时间
   * @param timeout 超时时间（毫秒）
   * @param min 最小超时时间（毫秒）
   * @param max 最大超时时间（毫秒）
   * @returns 验证结果
   */
  static validateTimeout(
    timeout: number | string,
    min: number = 1000,
    max: number = 300000
  ): { valid: boolean; error?: string } {
    try {
      const timeoutNum = Number(timeout);

      if (isNaN(timeoutNum)) {
        return { valid: false, error: '超时时间必须是数字' };
      }

      if (timeoutNum < min || timeoutNum > max) {
        return { valid: false, error: `超时时间必须在${min}-${max}毫秒范围内` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `超时时间验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证重试次数
   * @param retries 重试次数
   * @param maxRetries 最大重试次数
   * @returns 验证结果
   */
  static validateRetries(retries: number | string, maxRetries: number = 10): { valid: boolean; error?: string } {
    try {
      const retriesNum = Number(retries);

      if (isNaN(retriesNum)) {
        return { valid: false, error: '重试次数必须是数字' };
      }

      if (retriesNum < 0 || retriesNum > maxRetries) {
        return { valid: false, error: `重试次数必须在0-${maxRetries}范围内` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `重试次数验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证字符串长度
   * @param str 字符串
   * @param minLength 最小长度
   * @param maxLength 最大长度
   * @param fieldName 字段名称
   * @returns 验证结果
   */
  static validateStringLength(
    str: string,
    minLength: number,
    maxLength: number,
    fieldName: string = '字符串'
  ): { valid: boolean; error?: string } {
    try {
      if (typeof str !== 'string') {
        return { valid: false, error: `${fieldName}必须是字符串` };
      }

      if (str.length < minLength) {
        return { valid: false, error: `${fieldName}长度不能少于${minLength}个字符` };
      }

      if (str.length > maxLength) {
        return { valid: false, error: `${fieldName}长度不能超过${maxLength}个字符` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `${fieldName}长度验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证外部可执行服务配置
   * @param config 配置对象
   * @returns 验证结果
   */
  static validateExternalExecutableServiceConfig(config: any): { valid: boolean; error?: string } {
    try {
      if (!config) {
        return { valid: false, error: '配置对象不能为空' };
      }

      // 验证providers配置
      if (!config.providers) {
        return { valid: false, error: 'providers配置不能为空' };
      }

      const providers = config.providers;

      // 验证path
      if (!providers.path || typeof providers.path !== 'string') {
        return { valid: false, error: 'providers.path不能为空' };
      }

      // 验证name
      const nameValidation = this.validateStringLength(providers.name || '', 1, 100, '提供者名称');
      if (!nameValidation.valid) {
        return { valid: false, error: nameValidation.error };
      }

      // 验证connectionType
      if (providers.connectionType && !['local', 'remote'].includes(providers.connectionType)) {
        return { valid: false, error: 'connectionType必须是local或remote' };
      }

      // 如果是远程连接，验证SSH配置
      if (providers.connectionType === 'remote' && providers.ssh) {
        const sshValidation = this.validateSSHConfig(providers.ssh);
        if (!sshValidation.valid) {
          return { valid: false, error: sshValidation.error };
        }
      }

      // 验证timeout
      if (providers.timeout !== undefined) {
        const timeoutValidation = this.validateTimeout(providers.timeout);
        if (!timeoutValidation.valid) {
          return { valid: false, error: timeoutValidation.error };
        }
      }

      // 验证globalTimeout
      if (config.globalTimeout !== undefined) {
        const globalTimeoutValidation = this.validateTimeout(config.globalTimeout);
        if (!globalTimeoutValidation.valid) {
          return { valid: false, error: globalTimeoutValidation.error };
        }
      }

      // 验证maxConcurrentExecutions
      if (config.maxConcurrentExecutions !== undefined) {
        const maxConcurrent = Number(config.maxConcurrentExecutions);
        if (isNaN(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 100) {
          return { valid: false, error: 'maxConcurrentExecutions必须在1-100范围内' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `配置验证失败: ${String(error)}` };
    }
  }

  /**
   * 验证临时目录路径
   * @param tempDir 临时目录路径
   * @returns 验证结果
   */
  static validateTempDirectory(tempDir: string): { valid: boolean; error?: string } {
    try {
      if (!tempDir || tempDir.trim() === '') {
        return { valid: false, error: '临时目录路径不能为空' };
      }

      const normalizedPath = path.normalize(tempDir);

      // 检查路径是否在允许的范围内（防止路径遍历攻击）
      const resolvedPath = path.resolve(normalizedPath);
      // eslint-disable-next-line no-restricted-globals
      const allowedBase = path.resolve(process.cwd());

      if (!resolvedPath.startsWith(allowedBase)) {
        return { valid: false, error: '临时目录路径必须在项目目录内' };
      }

      // 检查父目录是否存在
      const parentDir = path.dirname(normalizedPath);
      if (!fs.existsSync(parentDir)) {
        return { valid: false, error: `临时目录的父目录不存在: ${parentDir}` };
      }

      // 检查父目录是否可写
      try {
        fs.accessSync(parentDir, fs.constants.W_OK);
      } catch {
        return { valid: false, error: `临时目录的父目录不可写: ${parentDir}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `临时目录验证失败: ${String(error)}` };
    }
  }
}

/**
 * 验证结果类型
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
