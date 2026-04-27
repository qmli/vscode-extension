import { existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '@orientais/vscode-core/logger';
import { getLogScope } from '@orientais/vscode-core/logger.scope';
import type { RunOptions, RunResult } from '@orientais/vscode-core/shell';
import { runSpawn } from '@orientais/vscode-core/shell';
import { PlatformUtils } from './platform';

/**
 * SSH客户端类型
 */
export enum SSHClientType {
  /** OpenSSH (默认) */
  OpenSSH = 'openssh',
  /** PuTTY (Windows) */
  PuTTY = 'putty',
  /** Windows内置OpenSSH */
  WindowsOpenSSH = 'windows-openssh'
}

/**
 * SSH客户端信息
 */
export interface SSHClientInfo {
  /** 客户端类型 */
  type: SSHClientType;
  /** 可执行文件路径 */
  path: string;
  /** 版本信息 */
  version?: string;
  /** 是否可用 */
  available: boolean;
}

/**
 * 跨平台SSH客户端检测器
 */
export const SSHClientDetector = {
  _cachedClients: undefined as SSHClientInfo[] | undefined,

  /**
   * 检测所有可用的SSH客户端
   * @returns SSH客户端列表
   */
  detectAvailableClients: async function (): Promise<SSHClientInfo[]> {
    const scope = getLogScope();

    if (this._cachedClients) {
      return this._cachedClients;
    }

    Logger.debug(scope, '开始检测可用的SSH客户端...');
    const clients: SSHClientInfo[] = [];

    // 根据操作系统检测不同的SSH客户端
    if (PlatformUtils.isWindows()) {
      // Windows平台
      clients.push(...(await this.detectWindowsSSHClients()));
    } else {
      // Unix-like平台 (Linux, macOS)
      clients.push(...(await this.detectUnixSSHClients()));
    }

    // 测试每个客户端的可用性
    for (const client of clients) {
      try {
        const version = await this.getSSHVersion(client.path);
        client.version = version;
        client.available = true;
        Logger.debug(scope, `SSH客户端可用: ${client.type} at ${client.path} (${version})`);
      } catch (ex) {
        client.available = false;
        Logger.debug(scope, `SSH客户端不可用: ${client.type} at ${client.path}`, ex);
      }
    }

    this._cachedClients = clients.filter((client) => client.available);
    Logger.debug(scope, `检测到 ${this._cachedClients.length} 个可用的SSH客户端`);

    return this._cachedClients;
  },

  /**
   * 获取最佳SSH客户端
   * @returns 最佳SSH客户端信息
   */
  getBestSSHClient: async function (): Promise<SSHClientInfo | null> {
    const clients = await this.detectAvailableClients();

    if (clients.length === 0) {
      return null;
    }

    // 优先级排序: OpenSSH > Windows OpenSSH > PuTTY
    const priorityOrder = [SSHClientType.OpenSSH, SSHClientType.WindowsOpenSSH, SSHClientType.PuTTY];

    for (const type of priorityOrder) {
      const client = clients.find((c) => c.type === type);
      if (client) {
        return client;
      }
    }

    return clients[0];
  },

  /**
   * 检测Windows平台的SSH客户端
   * @returns Windows SSH客户端列表
   */
  detectWindowsSSHClients: async function (): Promise<SSHClientInfo[]> {
    const clients: SSHClientInfo[] = [];

    // 1. 检测系统PATH中的ssh (可能是Git Bash或Windows OpenSSH)
    clients.push({
      type: SSHClientType.OpenSSH,
      path: 'ssh',
      available: false
    });

    // 2. 检测Windows内置OpenSSH
    const windir = PlatformUtils.getWindowsDir();
    const windowsOpenSSHPaths = [
      'C:\\Windows\\System32\\OpenSSH\\ssh.exe',
      join(windir, 'System32', 'OpenSSH', 'ssh.exe')
    ];

    for (const path of windowsOpenSSHPaths) {
      if (existsSync(path)) {
        clients.push({
          type: SSHClientType.WindowsOpenSSH,
          path: path,
          available: false
        });
        break;
      }
    }

    // 3. 检测Git for Windows中的SSH

    const programFiles = PlatformUtils.getProgramFilesDir();

    const programFilesX86 = PlatformUtils.getProgramFilesX86Dir();

    const gitSSHPaths = [
      'C:\\Program Files\\Git\\usr\\bin\\ssh.exe',
      'C:\\Program Files (x86)\\Git\\usr\\bin\\ssh.exe',
      join(programFiles, 'Git', 'usr', 'bin', 'ssh.exe'),
      join(programFilesX86, 'Git', 'usr', 'bin', 'ssh.exe')
    ];

    for (const path of gitSSHPaths) {
      if (existsSync(path)) {
        clients.push({
          type: SSHClientType.OpenSSH,
          path: path,
          available: false
        });
        break;
      }
    }

    // 4. 检测PuTTY
    const puttyPaths = [
      'C:\\Program Files\\PuTTY\\plink.exe',
      'C:\\Program Files (x86)\\PuTTY\\plink.exe',
      join(programFiles, 'PuTTY', 'plink.exe'),
      join(programFilesX86, 'PuTTY', 'plink.exe')
    ];

    for (const path of puttyPaths) {
      if (existsSync(path)) {
        clients.push({
          type: SSHClientType.PuTTY,
          path: path,
          available: false
        });
        break;
      }
    }

    return clients;
  },

  /**
   * 检测Unix-like平台的SSH客户端
   * @returns Unix SSH客户端列表
   */
  detectUnixSSHClients: async function (): Promise<SSHClientInfo[]> {
    const clients: SSHClientInfo[] = [];

    // 1. 检测系统PATH中的ssh
    clients.push({
      type: SSHClientType.OpenSSH,
      path: 'ssh',
      available: false
    });

    // 2. 检测常见的SSH安装路径
    const commonSSHPaths = [
      '/usr/bin/ssh',
      '/usr/local/bin/ssh',
      '/opt/homebrew/bin/ssh', // macOS Homebrew
      '/opt/local/bin/ssh' // macOS MacPorts
    ];

    for (const path of commonSSHPaths) {
      if (existsSync(path)) {
        clients.push({
          type: SSHClientType.OpenSSH,
          path: path,
          available: false
        });
        break;
      }
    }

    return clients;
  },

  /**
   * 获取SSH客户端版本信息
   * @param sshPath SSH可执行文件路径
   * @returns 版本信息
   */
  getSSHVersion: async function (sshPath: string): Promise<string> {
    try {
      const runOptions: RunOptions = {
        timeout: 5000,
        maxBuffer: 1024
      };

      // 对于PuTTY，使用不同的版本检查命令
      const versionArgs = sshPath.toLowerCase().includes('plink') ? [] : ['-V'];

      const result: RunResult<string> = await runSpawn(sshPath, versionArgs, 'utf8', runOptions);

      // SSH版本通常在stderr中输出
      const output = result.stderr || result.stdout || '';
      const versionMatch = output.match(/OpenSSH_([^\s,]+)|PuTTY\s+Release\s+([^\s]+)|ssh\s+version\s+([^\s]+)/i);

      if (versionMatch) {
        return versionMatch[1] || versionMatch[2] || versionMatch[3] || 'unknown';
      }

      return 'unknown';
    } catch (ex) {
      throw new Error(`无法获取SSH版本: ${ex instanceof Error ? ex.message : String(ex)}`);
    }
  },

  /**
   * 清除缓存的客户端信息
   */
  clearCache: function (): void {
    this._cachedClients = undefined;
  },

  /**
   * 检查指定路径的SSH客户端是否可用
   * @param sshPath SSH客户端路径
   * @returns 是否可用
   */
  isSSHClientAvailable: async function (sshPath: string): Promise<boolean> {
    try {
      await this.getSSHVersion(sshPath);
      return true;
    } catch {
      return false;
    }
  }
};
