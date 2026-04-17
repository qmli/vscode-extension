/**
 * 跨平台SSH配置示例
 * 展示如何在不同平台上配置SSH连接
 */

import type { ExternalExecutableServiceConfig } from '../externalExecutableService';

/**
 * 跨平台SSH配置示例
 */
export const CrossPlatformSSHConfigs = {
  /**
   * Windows平台配置示例
   */
  windows: {
    // 使用Windows OpenSSH
    windowsOpenSSH: {
      providers: {
        path: '/usr/bin/git',
        name: 'SSH Git (Windows OpenSSH)',
        enabled: true,
        connectionType: 'remote' as const,
        ssh: {
          host: '192.168.1.100',
          port: 22,
          username: 'gituser',
          privateKey: 'C:\\Users\\YourUser\\.ssh\\id_rsa',
          connectTimeout: 30000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          sshOptions: {
            StrictHostKeyChecking: 'no',
            UserKnownHostsFile: 'NUL' // Windows null设备
          }
        }
      }
    } satisfies ExternalExecutableServiceConfig,

    // 使用Git Bash OpenSSH
    gitBash: {
      providers: {
        path: '/usr/bin/git',
        name: 'SSH Git (Git Bash)',
        enabled: true,
        connectionType: 'remote' as const,
        ssh: {
          host: '192.168.1.100',
          port: 22,
          username: 'gituser',
          privateKey: 'C:\\Users\\YourUser\\.ssh\\id_rsa',
          connectTimeout: 30000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          sshOptions: {
            StrictHostKeyChecking: 'no',
            UserKnownHostsFile: '/dev/null' // Git Bash支持Unix路径
          }
        }
      }
    } satisfies ExternalExecutableServiceConfig,

    // 使用PuTTY
    putty: {
      providers: {
        path: '/usr/bin/git',
        name: 'SSH Git (PuTTY)',
        enabled: true,
        connectionType: 'remote' as const,
        ssh: {
          host: '192.168.1.100',
          port: 22,
          username: 'gituser',
          privateKey: 'C:\\Users\\YourUser\\.ssh\\id_rsa.ppk', // PuTTY格式私钥
          connectTimeout: 30000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000
          // PuTTY不支持某些OpenSSH选项
        }
      }
    } satisfies ExternalExecutableServiceConfig
  },

  /**
   * macOS平台配置示例
   */
  macOS: {
    // 使用系统OpenSSH
    system: {
      providers: {
        path: '/usr/bin/git',
        name: 'SSH Git (macOS System)',
        enabled: true,
        connectionType: 'remote' as const,
        ssh: {
          host: '192.168.1.100',
          port: 22,
          username: 'gituser',
          privateKey: '~/.ssh/id_rsa', // 支持~展开
          connectTimeout: 30000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          sshOptions: {
            StrictHostKeyChecking: 'no',
            UserKnownHostsFile: '/dev/null'
          }
        }
      }
    } satisfies ExternalExecutableServiceConfig,

    // 使用Homebrew OpenSSH
    homebrew: {
      providers: {
        path: '/usr/bin/git',
        name: 'SSH Git (Homebrew)',
        enabled: true,
        connectionType: 'remote' as const,
        ssh: {
          host: '192.168.1.100',
          port: 22,
          username: 'gituser',
          privateKey: '~/.ssh/id_rsa',
          connectTimeout: 30000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          sshOptions: {
            StrictHostKeyChecking: 'no',
            UserKnownHostsFile: '/dev/null',
            Compression: 'yes' // Homebrew版本支持更多选项
          }
        }
      }
    } satisfies ExternalExecutableServiceConfig
  },

  /**
   * Linux平台配置示例
   */
  linux: {
    // 使用系统OpenSSH
    system: {
      providers: {
        path: '/usr/bin/git',
        name: 'SSH Git (Linux)',
        enabled: true,
        connectionType: 'remote' as const,
        ssh: {
          host: '192.168.1.100',
          port: 22,
          username: 'gituser',
          privateKey: '~/.ssh/id_rsa',
          connectTimeout: 30000,
          keepAlive: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          sshOptions: {
            StrictHostKeyChecking: 'no',
            UserKnownHostsFile: '/dev/null',
            Compression: 'yes',
            Ciphers: 'aes128-ctr,aes192-ctr,aes256-ctr' // 指定加密算法
          }
        }
      }
    } satisfies ExternalExecutableServiceConfig
  },

  /**
   * 通用跨平台配置（推荐）
   * 系统会自动检测平台并应用最佳配置
   */
  universal: {
    providers: {
      path: '/usr/bin/git',
      name: 'SSH Git (Universal)',
      enabled: true,
      connectionType: 'remote' as const,
      ssh: {
        host: '192.168.1.100',
        port: 22,
        username: 'gituser',
        privateKey: '~/.ssh/id_rsa', // 跨平台路径，自动展开
        connectTimeout: 30000,
        keepAlive: 300000,
        retryAttempts: 3,
        retryDelay: 1000,
        sshOptions: {
          StrictHostKeyChecking: 'no'
          // 其他选项会根据检测到的SSH客户端自动添加
        }
      }
    }
  } satisfies ExternalExecutableServiceConfig
};

/**
 * 根据当前平台获取推荐配置
 * @returns 推荐的SSH配置
 */
export function getRecommendedSSHConfig(): ExternalExecutableServiceConfig {
  // 推荐使用通用配置，系统会自动处理平台差异
  return CrossPlatformSSHConfigs.universal;
}

/**
 * 平台特定配置示例
 */
export const PlatformSpecificExamples = {
  /**
   * Windows环境下的私钥路径示例
   */
  windowsKeyPaths: [
    'C:\\Users\\YourUser\\.ssh\\id_rsa', // 标准Windows路径
    'C:\\Users\\YourUser\\.ssh\\id_rsa.ppk', // PuTTY格式
    '%USERPROFILE%\\.ssh\\id_rsa', // 使用环境变量
    '~/.ssh/id_rsa' // Unix风格（Git Bash支持）
  ],

  /**
   * Unix环境下的私钥路径示例
   */
  unixKeyPaths: [
    '~/.ssh/id_rsa', // 标准Unix路径
    '/home/user/.ssh/id_rsa', // 绝对路径
    '$HOME/.ssh/id_rsa' // 环境变量
  ],

  /**
   * 跨平台兼容的sshOptions
   */
  compatibleSSHOptions: {
    // 所有平台都支持的选项
    common: {
      StrictHostKeyChecking: 'no',
      ConnectTimeout: '30',
      ServerAliveInterval: '60',
      ServerAliveCountMax: '3',
      LogLevel: 'ERROR'
    },

    // Windows特定选项
    windows: {
      UserKnownHostsFile: 'NUL'
    },

    // Unix特定选项
    unix: {
      UserKnownHostsFile: '/dev/null',
      Compression: 'yes',
      Ciphers: 'aes128-ctr,aes192-ctr,aes256-ctr'
    }
  }
};
