import path, { isAbsolute as _isAbsolute, basename } from 'path';
import { md5 } from '@orientais/vscode-core';
import { Uri, workspace } from 'vscode';
import * as vscode from 'vscode';
import { file } from '@/common/constants/constants';
import type { Workspace } from '@/common/constants/constants.workspace';
import { FileUtil } from '@/utils/file.util';
import { PlatformUtils } from '@/utils/platform';

interface Project {
  uuid: string;
}

export { basename, dirname, extname, join as joinPaths } from 'path';

// 正则表达式：匹配驱动器号（如 C: 或 D:），用于规范化 Windows 驱动器号
const driveLetterNormalizeRegex = /(^\/?)([a-zA-Z])(?=:\/)/;
// 正则表达式：匹配 URI 的 scheme 部分（如 http:// 或 file://）
const hasSchemeRegex = /^([a-zA-Z][\w+.-]+):/;
// 正则表达式：匹配反斜杠，用于将路径中的反斜杠替换为正斜杠
const pathNormalizeRegex = /\\/g;
// 常量：表示正斜杠的 ASCII 码值
const slash = 47;

/**
 * 比较两个路径是否相等
 * @param a 第一个路径
 * @param b 第二个路径
 * @param ignoreCase 是否忽略大小写（默认为非 Linux 平台忽略大小写）
 * @returns 是否相等
 */
export function arePathsEqual(a: string, b: string, ignoreCase?: boolean): boolean {
  if (ignoreCase || (ignoreCase == null && !PlatformUtils.isLinux())) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }
  return normalizePath(a) === normalizePath(b);
}

/**
 * 获取多个路径的公共前缀
 * @param s 路径数组
 * @param delimiter 分隔符
 * @param ignoreCase 是否忽略大小写
 * @returns 公共前缀路径
 */
export function commonBase(s: string[], delimiter: string, ignoreCase?: boolean): string | undefined {
  if (s.length === 0) return undefined;

  let common = s[0];
  for (let i = 1; i < s.length; i++) {
    const index = commonBaseIndex(common, s[i], delimiter, ignoreCase);
    if (index === 0) return undefined;
    common = common.substring(0, index + 1);
  }

  return common;
}

/**
 * 获取两个路径的公共前缀的最后一个分隔符索引
 * @param s1 第一个路径
 * @param s2 第二个路径
 * @param delimiter 分隔符
 * @param ignoreCase 是否忽略大小写
 * @returns 公共前缀的最后一个分隔符索引
 */
export function commonBaseIndex(s1: string, s2: string, delimiter: string, ignoreCase?: boolean): number {
  if (s1.length === 0 || s2.length === 0) return 0;

  if (ignoreCase ?? !PlatformUtils.isLinux()) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
  }

  let char;
  let index = 0;
  for (let i = 0; i < s1.length; i++) {
    char = s1[i];
    if (char !== s2[i]) break;

    if (char === delimiter) {
      index = i;
    }
  }

  return index;
}

/**
 * 获取路径的 URI scheme（如 http、file 等）
 * @param path 路径
 * @returns URI scheme 或 undefined
 */
export function getScheme(path: string): string | undefined {
  return hasSchemeRegex.exec(path)?.[1];
}

/**
 * 判断路径是否为绝对路径
 * @param path 路径
 * @returns 是否为绝对路径
 */
export function isAbsolute(path: string): boolean {
  return !maybeUri(path) && _isAbsolute(path);
}

/**
 * 判断路径是否为文件夹通配符（即以 "*" 结尾）
 * @param path 路径
 * @returns 是否为文件夹通配符
 */
export function isFolderGlob(path: string): boolean {
  return basename(path) === '*';
}

/**
 * 判断路径是否可能是 URI
 * @param path 路径
 * @returns 是否可能是 URI
 */
export function maybeUri(path: string): boolean {
  return hasSchemeRegex.test(path);
}

/**
 * 规范化路径
 * - 替换反斜杠为正斜杠
 * - 移除尾部多余的斜杠（Windows 根目录除外）
 * - 规范化 Windows 驱动器号为小写
 * @param path 路径
 * @returns 规范化后的路径
 */
export function normalizePath(path: string): string {
  if (!path) return path;

  path = path.replace(pathNormalizeRegex, '/');
  if (path.charCodeAt(path.length - 1) === slash) {
    // 不要移除 Windows 根文件夹（例如 z:\）的尾部斜杠
    if (!PlatformUtils.isWindows() || path.length !== 3 || path[1] !== ':') {
      path = path.slice(0, -1);
    }
  }

  if (PlatformUtils.isWindows()) {
    // 确保驱动器的大小写被规范化为小写，并且没有前导斜杠
    path = path.replace(driveLetterNormalizeRegex, (_, _slash, d: string) => d.toLowerCase());
  }

  return path;
}

/**
 * 移除路径中的文件夹通配符（即 "*"）
 * @param path 路径
 * @returns 移除通配符后的路径
 */
export function stripFolderGlob(path: string): string {
  return isFolderGlob(path) ? path.slice(0, -2) : path;
}

export function relative(from: string, to: string, ignoreCase?: boolean): string {
  from = hasSchemeRegex.test(from) ? Uri.parse(from, true).path : normalizePath(from);
  to = hasSchemeRegex.test(to) ? Uri.parse(to, true).path : normalizePath(to);

  const index = commonBaseIndex(`${to}/`, `${from}/`, '/', ignoreCase);
  return index > 0 ? to.substring(index + 1) : to;
}

/**
 * 获取工作区ID
 * @returns 工作区ID
 */
export function getWorkspaceId(): string {
  const workspaceFile = workspace.workspaceFile;
  if (workspaceFile) {
    return md5(path.dirname(workspaceFile.fsPath), 'hex');
  }
  return md5('', 'hex');
}

const workspaceMap = new Map();

/**
 * 获取工作空间
 */
export function getWorkspace(): Workspace {
  try {
    const workspaceFile = vscode.workspace.workspaceFile;
    if (workspaceFile) {
      const wJson = md5(JSON.stringify(vscode.workspace.workspaceFolders));
      if (workspaceMap.has(wJson)) {
        return workspaceMap.get(wJson);
      }
      workspaceMap.clear();
      // const file = workspaceFile.fsPath;
      // const mtime = fileMTime(workspaceFile.fsPath);
      // if (workspaceMap.hasOwnProperty(file)) {
      //   const detail = workspaceMap[file];
      //   if (detail.mtime === mtime) {
      //     return detail.workspace as Workspace;
      //   }
      // }
      const workspace = JSON.parse(FileUtil.readFileSync(workspaceFile.fsPath)) as Workspace;
      workspace.folders = [];
      vscode.workspace.workspaceFolders?.forEach((folder) => {
        // 获取project.json信息
        const projectFileDir = Uri.joinPath(folder.uri, file.project).fsPath;
        if (FileUtil.existsSync(projectFileDir)) {
          const content = FileUtil.readFileSync(projectFileDir);
          if (content) {
            const project = JSON.parse(content) as Project;
            workspace.folders.push({
              uuid: project.uuid,
              path: folder.uri.fsPath
            });
          }
        }
      });
      // workspaceMap[file] = { mtime: mtime, workspace: workspace };
      workspaceMap.set(wJson, workspace);
      return workspace as Workspace;
    }
  } catch (e) {
    console.log(e);
  }
  return {
    folders: [],
    settings: []
  };
}
