/* eslint-disable @typescript-eslint/no-explicit-any */
import { env, UIKind } from 'vscode';

export enum Platform {
  Windows = 'win32',
  MacOS = 'darwin',
  Linux = 'linux',
  Unknown = 'unknown'
}

export const isWeb = env.uiKind === UIKind.Web;

export const PlatformUtils = {
  getCurrentPlatform(): Platform {
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
  isWindows(): boolean {
    return this.getCurrentPlatform() === Platform.Windows;
  },
  isMacOS(): boolean {
    return this.getCurrentPlatform() === Platform.MacOS;
  },
  isLinux(): boolean {
    return this.getCurrentPlatform() === Platform.Linux;
  },
  isUnixLike(): boolean {
    const platform = this.getCurrentPlatform();
    return platform === Platform.MacOS || platform === Platform.Linux;
  },
  getEnvVar(name: string, defaultValue: string = ''): string {
    return (process as any).env[name] || defaultValue;
  },
  getUserHome(): string {
    if (this.isWindows()) return this.getEnvVar('USERPROFILE', 'C:\\Users\\Default');
    return this.getEnvVar('HOME', '/home/user');
  },
  getWindowsDir(): string {
    if (!this.isWindows()) throw new Error('仅在Windows平台可用');
    return this.getEnvVar('WINDIR', 'C:\\Windows');
  },
  getProgramFilesDir(): string {
    if (!this.isWindows()) throw new Error('仅在Windows平台可用');
    return this.getEnvVar('PROGRAMFILES', 'C:\\Program Files');
  },
  getProgramFilesX86Dir(): string {
    if (!this.isWindows()) throw new Error('仅在Windows平台可用');
    return this.getEnvVar('PROGRAMFILES(X86)', 'C:\\Program Files (x86)');
  },
  getNullDevicePath(): string {
    return this.isWindows() ? 'NUL' : '/dev/null';
  },
  getPathSeparator(): string {
    return this.isWindows() ? '\\' : '/';
  },
  normalizePath(path: string): string {
    if (this.isWindows()) return path.replace(/\//g, '\\\\');
    return path.replace(/\\/g, '/');
  },
  expandUserPath(path: string): string {
    if (!path.startsWith('~')) return path;
    return path.replace(/^~/, this.getUserHome());
  }
};
