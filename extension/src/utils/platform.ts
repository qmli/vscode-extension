import { env, UIKind } from 'vscode';
/**
 * 平台检测和处理工具
 */

/**
 * 支持的操作系统平台
 */
export enum Platform {
  Windows = 'win32',
  MacOS = 'darwin',
  Linux = 'linux',
  Unknown = 'unknown'
}
export const isWeb = env.uiKind === UIKind.Web;

/**
 * 平台工具类
 */
export const PlatformUtils = {
  /**
   * 获取当前操作系统平台
   * @returns 当前平台
   */
  getCurrentPlatform: function (): Platform {
    // eslint-disable-next-line no-restricted-globals
    const platform = (process as any).platform as string;

    switch (platform) {
      case 'win32':
        return Platform.Windows;
      case 'darwin':
        return Platform.MacOS;
      case 'linux':
        return Platform.Linux;
      default:
        return Platform.Unknown;
    }
  },

  /**
   * 检查是否为Windows平台
   * @returns 是否为Windows
   */
  isWindows: function (): boolean {
    return this.getCurrentPlatform() === Platform.Windows;
  },

  /**
   * 检查是否为macOS平台
   * @returns 是否为macOS
   */
  isMacOS: function (): boolean {
    return this.getCurrentPlatform() === Platform.MacOS;
  },

  /**
   * 检查是否为Linux平台
   * @returns 是否为Linux
   */
  isLinux: function (): boolean {
    return this.getCurrentPlatform() === Platform.Linux;
  },

  /**
   * 检查是否为Unix-like平台（macOS或Linux）
   * @returns 是否为Unix-like
   */
  isUnixLike: function (): boolean {
    const platform = this.getCurrentPlatform();
    return platform === Platform.MacOS || platform === Platform.Linux;
  },

  /**
   * 获取环境变量
   * @param name 环境变量名
   * @param defaultValue 默认值
   * @returns 环境变量值
   */
  getEnvVar: function (name: string, defaultValue: string = ''): string {
    // eslint-disable-next-line no-restricted-globals
    return (process as any).env[name] || defaultValue;
  },

  /**
   * 获取用户主目录
   * @returns 用户主目录路径
   */
  getUserHome: function (): string {
    if (this.isWindows()) {
      return this.getEnvVar('USERPROFILE', 'C:\\Users\\Default');
    }
    return this.getEnvVar('HOME', '/home/user');
  },

  /**
   * 获取Windows系统目录
   * @returns Windows系统目录
   */
  getWindowsDir: function (): string {
    if (!this.isWindows()) {
      throw new Error('仅在Windows平台可用');
    }
    return this.getEnvVar('WINDIR', 'C:\\Windows');
  },

  /**
   * 获取Program Files目录
   * @returns Program Files目录
   */
  getProgramFilesDir: function (): string {
    if (!this.isWindows()) {
      throw new Error('仅在Windows平台可用');
    }
    return this.getEnvVar('PROGRAMFILES', 'C:\\Program Files');
  },

  /**
   * 获取Program Files (x86)目录
   * @returns Program Files (x86)目录
   */
  getProgramFilesX86Dir: function (): string {
    if (!this.isWindows()) {
      throw new Error('仅在Windows平台可用');
    }
    return this.getEnvVar('PROGRAMFILES(X86)', 'C:\\Program Files (x86)');
  },

  /**
   * 获取平台特定的null设备路径
   * @returns null设备路径
   */
  getNullDevicePath: function (): string {
    return this.isWindows() ? 'NUL' : '/dev/null';
  },

  /**
   * 获取平台特定的路径分隔符
   * @returns 路径分隔符
   */
  getPathSeparator: function (): string {
    return this.isWindows() ? '\\' : '/';
  },

  /**
   * 规范化路径分隔符
   * @param path 原始路径
   * @returns 规范化后的路径
   */
  normalizePath: function (path: string): string {
    if (this.isWindows()) {
      return path.replace(/\//g, '\\');
    }
    return path.replace(/\\/g, '/');
  },

  /**
   * 展开用户主目录路径
   * @param path 包含~的路径
   * @returns 展开后的绝对路径
   */
  expandUserPath: function (path: string): string {
    if (!path.startsWith('~')) {
      return path;
    }

    const homeDir = this.getUserHome();
    return path.replace(/^~/, homeDir);
  }
};
