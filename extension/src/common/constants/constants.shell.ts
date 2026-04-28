/**
 * Shell 和终端相关常量定义
 * 用于统一管理 Shell 命令、WSL 配置等
 */

import * as path from 'path';
import { getWorkspaceId } from '@/utils/path';

/**
 * SDK 默认安装目录（基础路径）
 */
export const sdkInstallDirBase = '/isoft/sdk';

/**
 * SDK 安装目录（包含工作区 ID）
 * 动态路径，根据当前工作区 ID 构建
 */
export const sdkInstallDir = path.posix.join('/home/isoft/sdk', getWorkspaceId());

/**
 * WSL 初始化 Shell 命令
 * 用于 WSL 环境启动时的初始化操作
 */
export const wslInitShell = `cd ${sdkInstallDirBase} && service ssh start && clear`;

/**
 * Shell 命令模板
 * 提供常用的 Shell 命令模板
 */
export const shellCommand = Object.freeze({
  /** 切换到 SDK 目录 */
  cdSdk: `cd ${sdkInstallDirBase}`,
  /** 启动 SSH 服务 */
  startSsh: 'service ssh start',
  /** 清屏 */
  clear: 'clear',
  /** WSL 初始化（包含切换目录、启动SSH、清屏） */
  wslInit: wslInitShell
} as const);

/**
 * Shell 命令类型
 */
export type ShellCommandKey = keyof typeof shellCommand;

/**
 * WSL 发行版名称
 */
export const wslDistro = 'Ubuntu-20.04';

/**
 * Shell 环境配置
 * 定义不同环境下的 Shell 配置
 */
export const shellEnv = Object.freeze({
  /** WSL 环境 */
  wsl: {
    defaultDir: sdkInstallDirBase,
    initCommand: wslInitShell,
    serviceStart: 'service ssh start',
    distro: wslDistro
  },
  /** Linux 环境 */
  linux: {
    defaultDir: sdkInstallDirBase,
    serviceStart: 'systemctl start ssh'
  }
} as const);

/**
 * 机器实例和监控相关路径
 * 这些路径根据工作区 ID 动态构建
 */
export const machinePath = Object.freeze({
  /** 机器实例根路径 */
  instanceRoot: path.posix.join('/home/isoft/are/machineInstance', getWorkspaceId()),
  /** 机器监控路径 */
  monitor: path.posix.join('/home/isoft/machine/monitor', getWorkspaceId()),
  /** 远程机器监控路径（相对路径，前面有用户名目录） */
  remoteMonitor: path.posix.join('/isoft/machine/monitor', getWorkspaceId())
} as const);

/**
 * 机器监控文件名后缀
 */
export const machineMonitorFilePostfix = '_monitor.json';

/**
 * ARE 相关路径
 * 这些路径根据工作区 ID 动态构建
 */
export const arePathDynamic = Object.freeze({
  /** 默认 ARE 推送路径 */
  pushPath: path.posix.join('/isoft/are/push', getWorkspaceId()),
  /** 默认 ARE 命令系统监控路径 */
  cmdSysMonitorPath: path.posix.join('/isoft/script', getWorkspaceId())
} as const);

/**
 * Shell 环境类型
 */
export type ShellEnvType = keyof typeof shellEnv;

/**
 * 向后兼容的导出
 * @deprecated 建议使用 sdkInstallDir 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SDK_INSTALL_DIR = sdkInstallDir;

/**
 * @deprecated 建议使用 machinePath.instanceRoot 替代
 */
export const MachineInstanceRootPath = machinePath.instanceRoot;

/**
 * @deprecated 建议使用 machinePath.monitor 替代
 */
export const MachineMonitorPath = machinePath.monitor;

/**
 * @deprecated 建议使用 machineMonitorFilePostfix 替代
 */
export const MachineMonitorFileNamePostfix = machineMonitorFilePostfix;

/**
 * @deprecated 建议使用 machinePath.remoteMonitor 替代
 */
export const RemoteMachineMonitorPath = machinePath.remoteMonitor;

/**
 * @deprecated 建议使用 arePathDynamic.pushPath 替代
 */
export const DefaultArePushPath = arePathDynamic.pushPath;

/**
 * @deprecated 建议使用 arePathDynamic.cmdSysMonitorPath 替代
 */
export const DefaultAreCmdSysMonitorPath = arePathDynamic.cmdSysMonitorPath;

/**
 * @deprecated 建议使用 wslDistro 替代
 */
export const WslDistro = wslDistro;

/**
 * @deprecated 建议使用 wslInitShell 或 shellCommand.wslInit 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const INIT_SHELL = wslInitShell;

/**
 * @deprecated 建议使用 areFile.dltDb 替代（从 constants.are.ts 导入）
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Dlt_DB_PATH = 'dltDB';
