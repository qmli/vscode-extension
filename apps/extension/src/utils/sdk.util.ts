import * as childProcess from 'child_process';
import * as fs from 'fs';
import path from 'path';
import * as util from 'util';
import * as chardet from 'chardet';
import * as iconv from 'iconv-lite';
import { Client } from 'ssh2';
import * as vscode from 'vscode';
import {
  areCmdSysMonitorFileName,
  GENERATE_TYPE_APPLICATION,
  GENERATE_TYPE_APPLICATION_DESC,
  GENERATE_TYPE_FULL,
  GENERATE_TYPE_FULL_DESC,
  GENERATE_TYPE_MIDDLE,
  GENERATE_TYPE_MIDDLE_DESC,
  GenerateTypeConfigMap,
  GenerateTypeJsonMap
} from '@/common/constants/constants.are';
import { DefaultAreCmdSysMonitorPath, SDK_INSTALL_DIR, WslDistro } from '@/common/constants/constants.shell';
import { workspaceState as WorkspaceState } from '@/common/constants/constants.storage';
import { Logger } from '@/core/logger';
import { SdkInfo } from '@/models/sdk';

/**
 * 获取已安装的SDK列表
 * @deprecated 这个将会在终端中替代服务里处理
 */
export function getSdks(workspaceState: vscode.Memento): string[] {
  const sdkNames: string[] = [];
  const sdkInfoKeys = workspaceState.keys()?.filter((key) => key.startsWith(WorkspaceState.sdkInfoPrefix));
  if (!sdkInfoKeys) {
    console.error('没有找到任何 SDK 信息');
    return [];
  }
  for (const key of sdkInfoKeys) {
    const existingSdkInfo = workspaceState.get(key, {} as any); // new SdkInfo() 目前取消
    const sdkName = existingSdkInfo.sdkName;
    if (sdkName && sdkName !== '') {
      sdkNames.push(sdkName);
    }
  }
  return sdkNames;
}

/**
 * 获取目标板名称列表
 * @returns 目标板名称列表
 */
export function getBoards(workspaceState: vscode.Memento): string[] {
  const boards = new Set<string>();
  const sdkInfoKeys = workspaceState.keys()?.filter((key) => key.startsWith(WorkspaceState.sdkInfoPrefix));
  if (!sdkInfoKeys) {
    console.error('没有找到任何 SDK 信息');
    return [];
  }
  for (const key of sdkInfoKeys) {
    const existingSdkInfo = workspaceState.get(key, new SdkInfo());
    const toolchain = existingSdkInfo.toolchain;
    if (toolchain && toolchain !== '') {
      boards.add(toolchain);
    }
  }
  return Array.from(boards);
}

/**
 * 删除已安装的所有低版本SDK
 * @param currentSdkVersion
 */
export async function deleteLowerVersionSdks(currentSdkVersion: string): Promise<void> {
  try {
    // 获取 SDK 安装目录
    const sdkInstallDir = SDK_INSTALL_DIR;

    // 列出 SDK_INSTALL_DIR 下的所有子目录
    const exec = util.promisify(childProcess.exec);
    const { stdout: dirList } = await exec(`wsl --user root ls -d ${sdkInstallDir}/SDK-*`);

    // 解析目录名称
    const sdkDirectories = dirList
      .split('\n')
      .map((dir) => dir.trim())
      .filter((dir) => dir.length > 0);

    for (const sdkDir of sdkDirectories) {
      // 提取 SDK 版本号
      const sdkName = path.basename(sdkDir);
      const versionMatch = sdkName.match(/SDK-([\d.]+)-/);
      if (!versionMatch) {
        console.warn(`无法解析 SDK 版本号: ${sdkName}`);
        continue;
      }

      const sdkVersion = versionMatch[1];

      // 比较版本号
      if (compareVersions(sdkVersion, currentSdkVersion) < 0) {
        console.log(`删除低版本 SDK: ${sdkDir}`);
        await exec(`wsl --user root rm -rf ${sdkDir}`);
      }
    }
  } catch (error) {
    console.error(`删除低版本 SDK 目录时发生错误: ${(error as Error).message}`);
  }
}

/**
 * 获取SDK安装目录 <Home>/sdks
 */
export function getWslSdkDir(): string {
  try {
    return `${execCommandSync('wsl echo $HOME')}/sdks`;
  } catch (_error) {
    return ''; // 返回空字符串表示失败
  }
}

/**
 *  获取WSL用户目录 如：/home/ap
 */
export function getWslHomeDir(): string {
  try {
    return execCommandSync('wsl echo $HOME');
  } catch (_error) {
    return ''; // 返回空字符串表示失败
  }
}

export function getIdeInstallPath(): string {
  // eslint-disable-next-line no-restricted-globals
  const vscodeInstallPath = path.dirname(process.execPath);
  console.log(`IDE安装目录: ${vscodeInstallPath}`);
  return vscodeInstallPath;
}

export function execCommandSync(command: string): string {
  try {
    // 使用 child_process.execSync 执行同步命令，并以 Buffer 格式获取结果
    const resultBuffer = childProcess.execSync(command, { encoding: 'buffer' });

    // 动态检测编码
    const detectedEncoding = chardet.detect(resultBuffer) || 'utf-8';

    // 将 Buffer 转换为字符串
    const result = iconv.default.decode(resultBuffer, detectedEncoding);
    return result.trim(); // 去除多余的换行符或空格
  } catch (error) {
    // 捕获错误并动态检测编码
    if (error instanceof Error && (error as any).stderr) {
      const stderrBuffer = (error as any).stderr;
      const detectedEncoding = chardet.detect(stderrBuffer) || 'utf-8';
      const stderr = iconv.default.decode(stderrBuffer, detectedEncoding).trim();
      console.error(`执行命令失败: ${stderr}, 命令：${command}`);
      throw new Error(`执行命令失败: ${stderr}, 命令：${command}`);
    } else {
      console.error(`执行命令失败: ${(error as Error).message}, 命令：${command}`);
      throw new Error(`执行命令失败: ${(error as Error).message}, 命令：${command}`);
    }
  }
}

export function sshConnectionOnReady(connectOptions: any, listener: () => void): Client {
  const conn = new Client();
  conn
    .on('ready', listener)
    .on('error', (err) => {
      console.error(`SSH 连接失败: ${err.message}`);
      vscode.window.showErrorMessage(`SSH 连接失败: ${err.message}`);
    })
    .connect(connectOptions);
  return conn;
}

export function execSshCommandAndLog(
  connectOptions: any,
  command: string,
  logOutputChannel: vscode.LogOutputChannel
): void {
  const conn = sshConnectionOnReady(connectOptions, () => {
    console.log(`SSH 连接已建立，开始执行命令：'${command}'`);

    conn.exec(command, (err, stream) => {
      if (err) {
        console.error(`执行命令失败: ${err.message}`);
        conn.end();
        return;
      }

      logOutputChannel.show();

      // 处理正常输出
      stream.stdout.on('data', (data: Buffer) => {
        // TODO 处理拆包粘包
        const output = data.toString();
        logOutputChannel.info(output);
      });

      // 处理错误输出
      stream.stderr.on('data', (data: Buffer) => {
        // TODO 处理拆包粘包
        const errorOutput = data.toString();
        logOutputChannel.error(errorOutput);
      });

      // 监听命令执行完成
      stream.on('close', (code: number) => {
        if (code === 0) {
          console.log(`SSH连接数据流正常关闭`);
        } else {
          console.error(`SSH连接数据流异常关闭，退出码: ${code}`);
        }
        conn.end();
      });
    });
  });
}

/**
 * @param connectOptions SSH连接选项
 * @param command 要执行的命令
 * @returns 命令输出
 * @deprecated 这个将会在终端中替代
 */
export async function execSshCommand(connectOptions: any, command: string): Promise<string> {
  const conn = new Client();
  return new Promise((resolve, reject) => {
    conn
      .on('ready', async () => {
        console.log(`SSH 连接已建立，开始执行命令：'${command}'`);

        try {
          const output = await execCommandWithSshConn(conn, command);
          console.log(`命令输出: ${output}`);
          resolve(output); // 返回命令输出
        } catch (err) {
          console.error(`SSH执行命令失败: ${(err as Error).message}`);
          reject(err instanceof Error ? err : new Error(String(err))); // 抛出错误
        } finally {
          conn.end(); // 关闭 SSH 连接
        }
      })
      .on('error', (err) => {
        console.error(`SSH 连接失败: ${err.message}`);
        reject(err); // 抛出错误
      })
      .connect(connectOptions);
  });
}

async function execCommandWithSshConn(conn: Client, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        return void reject(err);
      }

      let output = '';
      stream.on('data', (data: Buffer) => {
        output += data.toString();
      });

      stream.on('close', (code: number) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`命令执行失败，退出码: ${code}`));

          // // TODO delete
          // console.error(`命令(${command})执行失败，退出码: ${code}`);
          // resolve(output);
        }
      });
    });
  });
}

/**
 * 执行命令
 * @param command 要执行的命令
 * @returns 命令输出
 * @deprecated 这个将会在终端中替代
 */
export async function execCommand(command: string): Promise<string> {
  const exec = util.promisify(childProcess.exec);
  const { stdout, stderr } = await exec(command);
  if (stderr) {
    console.error(`执行命令失败: ${stderr}`);
    // TODO
    // throw new Error(stderr);
  }
  return stdout.trim();
}

/**
 *
 * @param command 要执行的命令
 * @param logOutputChannel
 * @deprecated 这个将会在终端中替代
 */
export function execCommandAndLog(command: string, logOutputChannel?: vscode.LogOutputChannel): void {
  const child = childProcess.spawn(command, { shell: true });

  // 持续读取 stdout 流并按行输出到控制台
  child.stdout.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        if (logOutputChannel) {
          logOutputChannel.info(line.trim());
        } else {
          Logger.log(line.trim());
        }
      }
    });
  });

  // 持续读取 stderr 流并按行输出到控制台
  child.stderr.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        if (logOutputChannel) {
          logOutputChannel.error(line.trim());
        } else {
          Logger.log(line.trim());
        }
      }
    });
  });

  // 监听命令执行完成
  child.on('close', (code) => {
    if (code === 0) {
      console.log(`命令执行成功，退出码: ${code}`);
    } else {
      console.error(`命令执行失败，退出码: ${code}`);
    }
  });

  // 监听错误事件
  child.on('error', (err) => {
    console.error(`命令执行过程中发生错误: ${err.message}`);
  });
}

export function getInterfaceForIdePath(sdkName: string): string {
  const sdkInfo = {} as any; //ExtensionStore.getWorkspaceState()?.get(WorkspaceState.sdkInfoPrefix + sdkName, new SdkInfo());
  const araSysroot = path.posix.join(SDK_INSTALL_DIR, sdkName, 'ara-sysroot');
  // eslint-disable-next-line no-template-curly-in-string
  const orToolPath = sdkInfo?.orientaisToolPath.replace('${ARA_SYSROOT}', araSysroot);
  return path.posix.join(orToolPath, 'interface-for-ide-v3');
}

export function getSdkAraSysrootPath(sdkName: string): string {
  return path.posix.join(SDK_INSTALL_DIR, sdkName, 'ara-sysroot');
}

export function getAraToolsPath(sdkName: string): string {
  return path.posix.join(getSdkAraSysrootPath(sdkName), 'ara-tools');
}

export function getSdkAreCmdSysMonitorPath(sdkName: string): string {
  return path.posix.join(getAraToolsPath(sdkName), areCmdSysMonitorFileName);
}

export function getAreCmdSysMonitorDir(userName: string, sdkName: string): string {
  // J5板文件夹路径不支持-，需要替换为_
  const sdkDir = sdkName.replace(/-/g, '_');
  const userPath = path.posix.join(DefaultAreCmdSysMonitorPath, sdkDir);
  return getUserPath(userName, userPath);
}

export function getAreCmdSysMonitorFilePath(userName: string, sdkName: string): string {
  return path.posix.join(getAreCmdSysMonitorDir(userName, sdkName), areCmdSysMonitorFileName);
}

export function getGenerateTypes(): { name: string; description: string }[] {
  return [
    { name: GENERATE_TYPE_FULL, description: GENERATE_TYPE_FULL_DESC },
    { name: GENERATE_TYPE_MIDDLE, description: GENERATE_TYPE_MIDDLE_DESC },
    { name: GENERATE_TYPE_APPLICATION, description: GENERATE_TYPE_APPLICATION_DESC }
  ];
}

export function getAreConfigJsonFilePath(generateType: string): string {
  const homeDir = getWslHomeDir();
  switch (generateType) {
    case GENERATE_TYPE_FULL:
      return path.posix.join(homeDir, GenerateTypeJsonMap[GENERATE_TYPE_FULL]);
    case GENERATE_TYPE_MIDDLE:
      return path.posix.join(homeDir, GenerateTypeJsonMap[GENERATE_TYPE_MIDDLE]);
    case GENERATE_TYPE_APPLICATION:
      return path.posix.join(homeDir, GenerateTypeJsonMap[GENERATE_TYPE_APPLICATION]);
    default:
      throw new Error('未知的生成类型');
  }
}

export function getAraSysRootPath(generateType: string, outDir: string): string {
  const jsonFilePath = getAreConfigTemplatePath(generateType, outDir);
  try {
    // 读取 JSON 文件内容
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    // 检查并返回 `ara-sysroot.path` 的值
    if (jsonData['ara-sysroot']?.path) {
      return jsonData['ara-sysroot'].path;
    }
    Logger.error('未找到 ara-sysroot 节点或 path 属性');
  } catch (error) {
    Logger.error(error as Error, '解析 JSON 文件失败:');
  }
  return '';
}

export function getAreConfigTemplatePath(generateType: string, outDir: string): string {
  switch (generateType) {
    case GENERATE_TYPE_FULL:
      return path.join(outDir, GenerateTypeConfigMap[GENERATE_TYPE_FULL]);
    case GENERATE_TYPE_MIDDLE:
      return path.join(outDir, GenerateTypeConfigMap[GENERATE_TYPE_MIDDLE]);
    case GENERATE_TYPE_APPLICATION:
      return path.join(outDir, GenerateTypeConfigMap[GENERATE_TYPE_APPLICATION]);
    default:
      throw new Error('未知的生成类型');
  }
}

export function getUserPath(userName: string, userPath: string): string {
  const prefix = userName === 'root' ? '/' : '/home';
  return path.posix.join(prefix, userName, userPath);
}

export async function getMaxAvailableDiskSpace(): Promise<number> {
  try {
    const exec = util.promisify(childProcess.exec);

    // 执行 df 命令，获取所有挂载点的可用磁盘空间
    const { stdout } = await exec('wsl df --output=avail,target');

    // 解析输出，跳过标题行
    const lines = stdout.split('\n').slice(1); // 跳过第一行标题
    const availableSpaces = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [space, mountPoint] = line.split(/\s+/);
        return { space: parseInt(space, 10), mountPoint: mountPoint };
      })
      .filter((entry) => !isNaN(entry.space) && entry.mountPoint.startsWith('/mnt/')); // 过滤掉无效数据和非 /mnt/ 挂载点

    if (availableSpaces.length === 0) {
      Logger.error('未找到任何有效的磁盘空间信息');
      return 0;
    }

    // 找到可用空间最大的磁盘
    const maxSpaceEntry = availableSpaces.reduce((max, current) => (current.space > max.space ? current : max));

    // 将空间从 KB 转换为 GB
    const maxSpaceInGB = maxSpaceEntry.space / (1024 * 1024);

    Logger.log(`最大可用磁盘空间: ${maxSpaceInGB.toFixed(2)} GB, 挂载点: ${maxSpaceEntry.mountPoint}`);
    return parseFloat(maxSpaceInGB.toFixed(2)); // 保留两位小数
  } catch (error) {
    Logger.error(`获取可用磁盘空间失败: ${(error as Error).message}`);
    return 0;
  }
}

/**
 * 获取给定挂载点的可用磁盘空间（单位：MB）
 * @param disk 挂载点，如：/mnt/c
 * @returns
 */
export async function getAvailableDiskSpace(disk: string): Promise<number> {
  try {
    const exec = util.promisify(childProcess.exec);

    // 执行 df 命令，获取所有挂载点的可用磁盘空间
    // const { stdout } = await exec(`wsl df --output=avail,target | grep ${disk}`);    报错
    const { stdout } = await exec('wsl df --output=avail,target');

    // 解析输出，跳过标题行
    const lines = stdout.split('\n').slice(1); // 跳过第一行标题
    const targetLine = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .find((line) => line.endsWith(disk)); // 找到以指定挂载点结尾的行

    if (!targetLine) {
      Logger.error(`未找到挂载点 ${disk} 的磁盘空间信息`);
      return 0;
    }

    // 提取可用空间
    const [space] = targetLine.split(/\s+/); // 提取第一列（可用空间）
    const availableSpaceInKB = parseInt(space, 10);

    if (isNaN(availableSpaceInKB)) {
      Logger.error(`解析挂载点 ${disk} 的可用空间失败`);
      return 0;
    }

    // 将空间从 KB 转换为 MB
    const availableSpaceInGB = availableSpaceInKB / 1024;
    Logger.log(`挂载点 ${disk} 的可用磁盘空间: ${availableSpaceInGB.toFixed(2)} MB`);
    return parseFloat(availableSpaceInGB.toFixed(2)); // 保留两位小数
  } catch (error) {
    Logger.error(`获取挂载点 ${disk} 的可用磁盘空间失败: ${(error as Error).message}`);
    return 0;
  }
}

export async function getWslAvailableSpace(): Promise<number> {
  return getAvailableDiskSpace(getWslRootWinPath());
}

/**
 * 获取给定目录下的最新文件的最后修改时间
 */
export function getLatestFileMTime(directory: string): number {
  // 检查是否为 WSL 路径
  if (directory.startsWith('/')) {
    // 将 WSL 路径转换为 Windows 可访问的路径
    directory = `\\\\wsl$\\${WslDistro}${directory.replace(/\//g, '\\')}`;
  }

  // 检查目录是否存在
  if (!fs.existsSync(directory)) {
    console.error(`目录不存在: ${directory}`);
    return 0;
  }

  let latestTime = 0;

  // 递归遍历目录
  const traverseDirectory = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.posix.join(dir, entry.name);

      if (entry.isFile()) {
        // 获取文件的最后修改时间
        const stats = fs.statSync(fullPath);
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
        }
      } else if (entry.isDirectory()) {
        // 递归处理子目录
        traverseDirectory(fullPath);
      }
    });
  };

  traverseDirectory(directory);

  return latestTime;
}

/**
 * 获取 WSL 的非127.0.0.1的 IP 地址
 */
export function getWslIpAddress(): string {
  try {
    const stdout = execCommandSync('wsl --user root hostname -I');
    const ipAddresses = stdout
      .split(' ')
      .map((ip) => ip.trim())
      .filter((ip) => ip && ip !== '127.0.0.1');
    if (ipAddresses.length > 0) {
      return ipAddresses[0]; // 返回第一个非 127.0.0.1 的 IP 地址
    }
    throw new Error('未找到有效的 WSL IP 地址');
  } catch (error) {
    console.error(`获取 WSL IP 地址失败: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * 比较版本号
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0; // 如果某部分不存在，默认为 0
    const v2 = v2Parts[i] || 0;

    if (v1 > v2) {
      return 1;
    } // version1 大于 version2
    if (v1 < v2) {
      return -1;
    } // version1 小于 version2
  }

  return 0; // 两个版本号相等
}

export function getWslRootWinPath(): string {
  // TODO 安装工具时，导入WSL后，可获取导入的Windows盘符，转换为WSL路径
  return '/mnt/c';
}

/**
 * 获取SDK版本号
 * @deprecated 这个将会在终端中替代服务里处理
 */
export function getSdkVersion(name?: string): string {
  // if (!name) {
  //   return ExtensionStore.getWorkspaceState()?.get(WorkspaceState.latestSdkVersion, '0.0.0') || '';
  // }
  // const sdkInfoKeys = ExtensionStore.getWorkspaceState()
  //   .keys()
  //   ?.filter((key: string) => key.startsWith(WorkspaceState.sdkInfoPrefix));
  // if (!sdkInfoKeys) {
  //   console.error('没有找到任何 SDK 信息');
  //   return '';
  // }
  // for (const key of sdkInfoKeys) {
  //   const existingSdkInfo = ExtensionStore.getWorkspaceState().get(key as string, {} as any); // new SdkInfo() 目前取消
  //   if (name === existingSdkInfo.sdkName) {
  //     return existingSdkInfo.sdkVersion;
  //   }
  // }
  return '';
}

/**
 * 获取SDK名称
 */
export function getSdkName(version?: string): string {
  version = version ? version : WorkspaceState.latestSdkVersion;
  // const sdkInfoKeys = ExtensionStore.getWorkspaceState()
  //   .keys()
  //   ?.filter((key: string) => key.startsWith(WorkspaceState.sdkInfoPrefix));
  // if (!sdkInfoKeys) {
  //   console.error('没有找到任何 SDK 信息');
  //   return '';
  // }
  // for (const key of sdkInfoKeys) {
  //   const existingSdkInfo = ExtensionStore.getWorkspaceState().get(key as string, {} as any); // new SdkInfo() 目前取消
  //   if (version === existingSdkInfo.sdkVersion) {
  //     return existingSdkInfo.sdkName;
  //   }
  // }
  return '';
}
