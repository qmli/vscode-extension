import crypto from 'crypto';
import * as fs from 'fs';
import fsPlus from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { glob } from 'fast-glob';
import * as vscode from 'vscode';
import { Uri } from 'vscode';

/**
 * 哈希算法类型枚举
 */
export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA1 = 'sha1',
  MD5 = 'md5'
}

/**
 * 文件写入选项
 */
export interface WriteFileOptions {
  /** 文件不存在时是否创建 */
  create: boolean;
  /** 文件存在时是否覆盖 */
  overwrite: boolean;
}

export interface FileInfo {
  projectId: string;
  path: string;
}

/**
 * 文件工具类
 * 提供文件读写、目录操作、哈希计算等常用文件操作功能
 */
export const FileUtil = {
  /**
   * 同步读取文件
   * @param file 文件路径
   * @param encoding 文件编码，默认为 'utf-8'
   * @returns 文件内容字符串，读取失败返回空字符串
   */
  readFileSync: function (file: string, encoding: BufferEncoding = 'utf-8'): string {
    try {
      return fs.readFileSync(file, encoding);
    } catch (err) {
      console.error(`读取文件失败: ${file}`, err);
      return '';
    }
  },
  readdirSync: function (dir: string): string[] {
    try {
      return fs.readdirSync(dir);
    } catch (err) {
      console.error(`读取目录失败: ${dir}`, err);
      return [];
    }
  },

  /**
   * 同步写入文件
   * @param file 文件路径
   * @param content 文件内容
   * @throws {Error} 写入失败时抛出错误
   */
  writeFileSync: function (file: string, content: string): void {
    try {
      this.mkdir(path.dirname(file));
      fs.writeFileSync(file, content, 'utf8');
    } catch (err) {
      console.error(`写入文件失败: ${file}`, err);
      throw err;
    }
  },

  /**
   * 同步写入文件并设置修改时间
   * @param file 文件路径
   * @param content 文件内容
   * @param modifyTime 修改时间
   * @throws {Error} 写入失败时抛出错误
   */
  writeModifyFileSync: function (file: string, content: string, modifyTime: Date): void {
    try {
      this.mkdir(path.dirname(file));
      fs.writeFileSync(file, content, 'utf8');
      fs.utimesSync(file, modifyTime, modifyTime);
    } catch (err) {
      console.error(`写入文件并设置修改时间失败: ${file}`, err);
      throw err;
    }
  },

  /**
   * 同步追加内容到文件
   * @param file 文件路径
   * @param content 要追加的内容
   * @throws {Error} 追加失败时抛出错误
   */
  appendFileSync: function (file: string, content: string): void {
    try {
      fs.appendFileSync(file, content, 'utf8');
    } catch (err) {
      console.error(`追加文件内容失败: ${file}`, err);
      throw err;
    }
  },

  /**
   * 检查文件或目录是否存在（异步）
   * @param filePath 文件或目录路径
   * @returns Promise<boolean> 存在返回 true，否则返回 false
   */
  exists: async function (filePath: string): Promise<boolean> {
    return exists(filePath);
  },

  /**
   * 检查文件或目录是否存在（同步）
   * @param filePath 文件或目录路径
   * @returns 存在返回 true，否则返回 false
   */
  existsSync: function (filePath: string): boolean {
    return fs.existsSync(filePath);
  },

  /**
   * 创建目录（递归创建）
   * @param folder 目录路径
   * @throws {Error} 创建失败时抛出错误
   */
  mkdir: function (folder: string): void {
    try {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    } catch (err) {
      console.error(`创建目录失败: ${folder}`, err);
      throw err;
    }
  },

  /**
   * 读取文件（VS Code Uri）
   * @param uri 文件 URI
   * @returns Promise<Uint8Array> 文件内容
   */
  readFile: async function (uri: vscode.Uri): Promise<Uint8Array> {
    const buffer = await readFile(uri.fsPath);
    return new Uint8Array(buffer);
  },

  /**
   * 写入文件（VS Code Uri）
   * @param uri 文件 URI
   * @param content 文件内容
   */
  writeFile: async function (uri: vscode.Uri, content: Uint8Array): Promise<void> {
    await this.writeFile1(uri, content, { create: true, overwrite: true });
  },

  /**
   * 删除文件（VS Code Uri）
   * @param uri 文件 URI
   */
  remove: async function (uri: vscode.Uri): Promise<void> {
    try {
      await fsPlus.unlink(uri.fsPath);
    } catch (err) {
      console.error(`删除文件失败: ${uri.fsPath}`, err);
      throw err;
    }
  },

  /**
   * 写入文件（带选项）
   * @param uri 文件 URI
   * @param content 文件内容
   * @param options 写入选项
   */
  writeFile1: async function (uri: vscode.Uri, content: Uint8Array, options: WriteFileOptions): Promise<void> {
    await this._writeFile(uri, content, options);
  },

  /**
   * 内部写入文件实现
   * @param uri 文件 URI
   * @param content 文件内容
   * @param options 写入选项
   */
  _writeFile: async function (uri: vscode.Uri, content: Uint8Array, options: WriteFileOptions): Promise<void> {
    const dir = path.dirname(uri.fsPath);
    await fsPlus.mkdir(dir, { recursive: true });

    const fileExists = await exists(uri.fsPath);
    if (!fileExists) {
      if (!options.create) {
        throw vscode.FileSystemError.FileNotFound();
      }
    } else if (!options.overwrite) {
      throw vscode.FileSystemError.FileExists();
    }

    await writeFile(uri.fsPath, Buffer.from(content));
  },

  /**
   * 从文件路径中获取文件名
   * @param filePath 文件路径
   * @returns 文件名
   */
  getFileName: function (filePath: string): string {
    return path.basename(filePath);
  },

  /**
   * 检查文件是否为空
   * @param filePath 文件路径
   * @returns Promise<boolean> 文件为空返回 true
   */
  isEmpty: async function (filePath: string): Promise<boolean> {
    try {
      const stats = await fsPlus.stat(filePath);
      return stats.size === 0;
    } catch (err) {
      console.error(`检查文件是否为空失败: ${filePath}`, err);
      return false;
    }
  },

  /**
   * 读取目录内容
   * @param dir 目录路径
   * @returns Promise<string[]> 文件名列表
   */
  fsReadDir: async function (dir: string): Promise<string[]> {
    try {
      return await fsPlus.readdir(dir);
    } catch (err) {
      console.error(`读取目录失败: ${dir}`, err);
      throw err;
    }
  },

  /**
   * 获取文件或目录状态
   * @param filePath 文件或目录路径
   * @returns Promise<fs.Stats> 文件状态
   */
  fsStat: async function (filePath: string): Promise<fs.Stats> {
    try {
      return await fsPlus.stat(filePath);
    } catch (err) {
      console.error(`获取文件状态失败: ${filePath}`, err);
      throw err;
    }
  },

  /**
   * 递归搜索文件
   * @param dirPath 搜索的根目录
   * @param callback 找到文件时的回调函数
   */
  fileSearch: async function (dirPath: string, callback: (file: string) => void): Promise<void> {
    try {
      const files = await this.fsReadDir(dirPath);
      const stats = await Promise.all(files.map((file) => this.fsStat(path.join(dirPath, file))));

      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(dirPath, files[i]);
        const stat = stats[i];

        if (stat.isDirectory()) {
          await this.fileSearch(filePath, callback);
        } else if (stat.isFile()) {
          callback(Uri.file(filePath).fsPath);
        }
      }
    } catch (err) {
      console.error(`文件搜索失败: ${dirPath}`, err);
      throw err;
    }
  },

  /**
   * 深度排序 JSON 对象的键，数组元素如果包含 _iSoft.type 则按 type 升序排序
   * @param value 要排序的 JSON 对象
   * @return 排序后的 JSON 对象
   */
  sortJsonKeysDeep: function (value: any): any {
    if (Array.isArray(value)) {
      const arr = value.map((v) => this.sortJsonKeysDeep(v));

      // 若数组元素为 JSON 对象，且包含 _iSoft.type，则按 type 升序排序
      const enriched = arr.map((item, idx) => {
        const hasType = item && typeof item === 'object' && item._iSoft && typeof item._iSoft.type === 'string';
        return {
          item: item,
          idx: idx,
          type: hasType ? (item._iSoft.type as string) : undefined
        };
      });

      const needSort = enriched.some((e) => e.type !== undefined);
      if (needSort) {
        enriched.sort((a, b) => {
          const at = a.type;
          const bt = b.type;
          if (at && bt) {
            const cmp = at.localeCompare(bt);
            return cmp !== 0 ? cmp : a.idx - b.idx; // 同 type 保持原相对顺序
          }
          if (at && !bt) return -1; // 有 type 的排在前面
          if (!at && bt) return 1; // 无 type 的排在后面
          return a.idx - b.idx; // 都无 type，保持原顺序
        });
      }
      return enriched.map((e) => e.item);
    }
    if (value && typeof value === 'object') {
      const out: any = {};
      // 排序（优先key='_iSoft'，其次key='shortName'，然后value=字符串的，如果有多个则按key的升序排，最后是value=对象/{...}）
      const keys = Object.keys(value).sort((a, b) => {
        if (a === '_iSoft') return -1;
        if (b === '_iSoft') return 1;
        if (a === 'shortName') return -1;
        if (b === 'shortName') return 1;
        const aIsString = typeof value[a] === 'string';
        const bIsString = typeof value[b] === 'string';
        if (aIsString && !bIsString) return -1;
        if (!aIsString && bIsString) return 1;
        return a.localeCompare(b);
      });
      // console.log('Sorted keys:', keys);
      for (const k of keys) {
        out[k] = this.sortJsonKeysDeep(value[k]);
      }
      return out;
    }
    return value;
  }
};

/**
 * 转换文件系统错误为 VS Code 文件系统错误
 * @param error 原始错误对象
 * @returns VS Code 文件系统错误
 */
function massageError(error: NodeJS.ErrnoException): Error {
  if (error.code === 'ENOENT') {
    return vscode.FileSystemError.FileNotFound();
  }
  if (error.code === 'EISDIR') {
    return vscode.FileSystemError.FileIsADirectory();
  }
  if (error.code === 'EEXIST') {
    return vscode.FileSystemError.FileExists();
  }
  if (error.code === 'EPERM' || error.code === 'EACCES') {
    return vscode.FileSystemError.NoPermissions();
  }
  return error;
}

/**
 * 处理异步操作结果
 * @param resolve 成功回调
 * @param reject 失败回调
 * @param error 错误对象
 * @param result 结果
 */
function handleResult<T>(
  resolve: (result: T) => void,
  reject: (error: Error) => void,
  error: NodeJS.ErrnoException | null | undefined,
  result: T
): void {
  if (error) {
    reject(massageError(error));
  } else {
    resolve(result);
  }
}

/**
 * 复制文件
 * @param src 源文件路径
 * @param des 目标文件路径
 */
export function copy(src: string, des: string): void {
  fs.createReadStream(src).pipe(fs.createWriteStream(des));
}

/**
 * 读取文件（返回 Buffer）
 * @param filePath 文件路径
 * @returns Promise<Buffer> 文件内容
 */
export async function readFile(filePath: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(filePath, (error, buffer) => handleResult(resolve, reject, error, buffer));
  });
}

/**
 * 写入文件
 * @param filePath 文件路径
 * @param content 文件内容
 * @returns Promise<void>
 */
export async function writeFile(filePath: string, content: Buffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(filePath, content, (error) => handleResult(resolve, reject, error, undefined));
  });
}

/**
 * 检查文件或目录是否存在
 * @param filePath 文件或目录路径
 * @returns Promise<boolean>
 */
export async function exists(filePath: string): Promise<boolean> {
  return fs.existsSync(filePath);
}

/**
 * 读取文件的最后一行
 * @param fileName 文件路径
 * @returns Promise<string> 最后一行内容
 */
export async function readLastLine(fileName: string): Promise<string> {
  try {
    const stats = await fsPlus.stat(fileName);
    if (stats.size === 0) {
      return '';
    }

    const bufferSize = Math.min(1024, stats.size);
    const stream = fs.createReadStream(fileName, {
      start: Math.max(0, stats.size - bufferSize),
      end: stats.size - 1
    });

    const rl = readline.createInterface({
      input: stream,
      terminal: false
    });

    let lastLine = '';
    for await (const line of rl) {
      lastLine = line;
    }

    return lastLine;
  } catch (err) {
    console.error(`读取文件最后一行失败: ${fileName}`, err);
    return '';
  }
}

/**
 * 计算文件的哈希值（Promise 版本）
 * @param filePath 文件路径
 * @param algorithm 哈希算法，默认为 SHA256
 * @returns Promise<string> 哈希值（十六进制字符串）
 * @throws {Error} 文件不存在或不支持的算法时抛出错误
 */
export async function hashFile(filePath: string, algorithm: string = HashAlgorithm.SHA256): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const algorithmLower = algorithm.toLowerCase();
  if (!Object.values(HashAlgorithm).includes(algorithmLower as HashAlgorithm)) {
    throw new Error(`不支持的算法，支持的算法为: ${Object.values(HashAlgorithm).join(', ')}`);
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    const hash = crypto.createHash(algorithmLower);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 计算文件的哈希值（同步版本）
 * @param filePath 文件路径
 * @param algorithm 哈希算法，默认为 SHA256
 * @returns 哈希值（十六进制字符串）
 * @throws {Error} 文件不存在或不支持的算法时抛出错误
 */
export function hashFileSync(filePath: string, algorithm: string = HashAlgorithm.SHA256): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error(`路径不是文件: ${filePath}`);
  }

  const algorithmLower = algorithm.toLowerCase();
  if (!Object.values(HashAlgorithm).includes(algorithmLower as HashAlgorithm)) {
    throw new Error(`不支持的算法，支持的算法为: ${Object.values(HashAlgorithm).join(', ')}`);
  }

  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash(algorithmLower);
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * 计算文件夹的哈希值
 * @param folderPath 文件夹路径
 * @param includeFileData 是否包含文件内容，默认为 false（仅包含文件名和修改时间）
 * @param algorithm 哈希算法，默认为 SHA256
 * @returns Promise<string> 文件夹的哈希值
 */
export async function hashFolder(
  folderPath: string,
  includeFileData: boolean = false,
  algorithm: string = HashAlgorithm.SHA256
): Promise<string> {
  const hash = crypto.createHash(algorithm);

  try {
    const files = await fsPlus.readdir(folderPath, { withFileTypes: true, recursive: true });
    const sortedFiles = files
      .filter((file) => file.isFile())
      .map((file) => ({
        name: file.name,
        path: file.parentPath || ''
      }))
      .sort((a, b) => {
        const pathCompare = a.path.localeCompare(b.path);
        return pathCompare !== 0 ? pathCompare : a.name.localeCompare(b.name);
      });

    for (const file of sortedFiles) {
      hash.update(file.name);

      const filePath = path.join(file.path, file.name);
      const modifyTime = `${fileMTime(filePath)}`;
      hash.update(modifyTime);

      if (includeFileData) {
        const fileData = await fsPlus.readFile(filePath);
        hash.update(fileData);
      }
    }

    return hash.digest('hex');
  } catch (err) {
    console.error(`计算文件夹哈希失败: ${folderPath}`, err);
    throw err;
  }
}

/**
 * 获取文件的修改时间
 * @param filePath 文件路径
 * @returns 修改时间的时间戳（毫秒），获取失败返回 0
 */
export function fileMTime(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.getTime();
  } catch (err) {
    console.error(`获取文件修改时间失败: ${filePath}`, err);
    return 0;
  }
}

/**
 * 递归遍历文件夹（同步）
 * @param dir 根目录
 * @param callback 文件回调函数
 * @param traverse 是否递归遍历子目录，默认为 true
 */
export function traverseFolder(dir: string, callback: (file: string) => void, traverse: boolean = true): void {
  if (!isDir(dir)) {
    return;
  }

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      callback(filePath);

      if (traverse && isDir(filePath)) {
        traverseFolder(filePath, callback, traverse);
      }
    }
  } catch (err) {
    console.error(`遍历文件夹失败: ${dir}`, err);
  }
}

/**
 * 递归遍历文件夹（异步）
 * @param dir 根目录
 * @param callback 文件回调函数（异步）
 * @param traverse 是否递归遍历子目录，默认为 true
 */
export async function traverseFolderAsync(
  dir: string,
  callback: (file: string) => Promise<void>,
  traverse: boolean = true
): Promise<void> {
  try {
    const stats = await fsPlus.stat(dir);
    if (!stats.isDirectory()) {
      return;
    }

    const files = await fsPlus.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      await callback(filePath);

      if (traverse) {
        const stat = await fsPlus.stat(filePath);
        if (stat.isDirectory()) {
          await traverseFolderAsync(filePath, callback, traverse);
        }
      }
    }
  } catch (err) {
    console.error(`异步遍历文件夹失败: ${dir}`, err);
    throw err;
  }
}

/**
 * 递归删除文件夹
 * @param folderPath 文件夹路径
 * @param callback 删除每个文件/目录时的回调函数
 */
export function deleteFolderRecursive(folderPath: string, callback?: (file: string) => void): void {
  if (!fs.existsSync(folderPath)) {
    return;
  }

  try {
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const curPath = path.join(folderPath, file);
      callback?.(curPath);

      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath, callback);
      } else {
        fs.unlinkSync(curPath);
      }
    }
    fs.rmdirSync(folderPath);
  } catch (err) {
    console.error(`删除文件夹失败: ${folderPath}`, err);
    throw err;
  }
}

/**
 * 判断路径是否为文件
 * @param filePath 路径
 * @returns 是文件返回 true，否则返回 false
 */
export function isFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * 判断路径是否为目录
 * @param dirPath 路径
 * @returns 是目录返回 true，否则返回 false
 */
export function isDir(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 获取父目录路径
 * @param filePath 文件或目录路径
 * @returns 父目录路径
 */
export function parentDir(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * 复制文件夹（同步）
 * @param source 源文件夹路径
 * @param target 目标文件夹路径
 * @param isMove 是否移动（移动会删除源文件），默认为 false
 * @param handleFile 自定义文件处理函数，返回 false 时跳过该文件，默认为始终返回 true
 * @param callback 复制每个文件时的回调函数
 */
export function copyFolderSync(
  source: string,
  target: string,
  isMove: boolean = false,
  handleFile: (srcPath: string, destPath: string) => boolean = () => true,
  callback?: (file: string) => void
): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  try {
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(target, entry.name);
      callback?.(destPath);

      if (entry.isDirectory()) {
        copyFolderSync(srcPath, destPath, isMove, handleFile, callback);
      } else if (isMove) {
        fs.renameSync(srcPath, destPath);
      } else if (handleFile(srcPath, destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  } catch (err) {
    console.error(`复制文件夹失败: ${source} -> ${target}`, err);
    throw err;
  }
}

/**
 * 快速文件哈希（使用文件头尾内容 + 修改时间）
 * @param filePath 文件路径
 * @returns Promise<string> 哈希值（SHA1）
 */
export async function fastFileHash(filePath: string): Promise<string> {
  try {
    const stats = await fsPlus.stat(filePath);
    const file = await fsPlus.open(filePath, 'r');

    const headSize = Math.min(512, stats.size);
    const tailSize = Math.min(512, stats.size);
    const bufferHead = Buffer.alloc(headSize);
    const bufferTail = Buffer.alloc(tailSize);

    await file.read(bufferHead, 0, headSize, 0);
    if (stats.size > 512) {
      await file.read(bufferTail, 0, tailSize, Math.max(0, stats.size - tailSize));
    }
    await file.close();

    return crypto
      .createHash('sha1')
      .update(bufferHead)
      .update(bufferTail)
      .update(stats.mtimeMs.toString())
      .digest('hex');
  } catch (err) {
    console.error(`快速文件哈希计算失败: ${filePath}`, err);
    throw err;
  }
}

/**
 * 获取文件夹中所有文件的状态哈希
 * @param fileDir 文件夹路径
 * @returns Promise<string[]> 文件哈希值数组
 */
export async function getCurrentFileStates(fileDir: string): Promise<string[]> {
  try {
    const files = await glob(['**/*'], {
      cwd: fileDir,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**']
    });

    return Promise.all(files.sort().map((filePath) => fastFileHash(filePath)));
  } catch (err) {
    console.error(`获取文件状态失败: ${fileDir}`, err);
    throw err;
  }
}

/**
 * 搜索文件
 * @param fileDir 搜索的根目录
 * @param fileName 要搜索的文件名（可以是多个）
 * @param absolute 返回绝对路径，默认为 true
 * @param ignore 要忽略的目录模式，默认为 ['**node_modules**', '**.git**']
 * @returns Promise<string[]> 匹配的文件路径列表
 */
export async function searchFiles(
  fileDir: string,
  fileName: string[],
  absolute: boolean = true,
  ignore: string[] = ['**/node_modules/**', '**/.git/**']
): Promise<string[]> {
  try {
    return await glob(
      fileName.map((name) => `**/${name}`),
      {
        cwd: fileDir,
        absolute: absolute,
        ignore: ignore
      }
    );
  } catch (err) {
    console.error(`搜索文件失败: ${fileDir}`, err);
    return [];
  }
}

/**
 * 按文件扩展名搜索
 * @param fileDir 文件夹
 * @param ext 文件扩展名
 * @param absolute 返回绝对路径
 * @param ignore 忽略文件夹
 */
export async function searchFilesByExt(
  fileDir: string,
  ext: string,
  absolute: boolean = true,
  ignore: string[] = ['**/node_modules/**', '**/.git/**']
): Promise<{ path: string; name: string }[]> {
  const files = await glob([`**/*.${ext}`], {
    cwd: fileDir,
    absolute: absolute,
    ignore: ignore
  });
  return files.map((file) => ({ path: file, name: path.basename(file) })) || [];
}

/**
 * 计算文件夹的哈希码
 * @param dir 文件夹路径
 * @returns Promise<string> 文件夹的哈希码
 */
export async function folderHashCode(dir: string): Promise<string> {
  try {
    const hashArr = await getCurrentFileStates(dir);
    return crypto.createHash('sha1').update(hashArr.join(':')).digest('hex');
  } catch (err) {
    console.error(`计算文件夹哈希码失败: ${dir}`, err);
    throw err;
  }
}

// ============ 向后兼容的导出 ============

/**
 * @deprecated 请使用 hashFile 替代
 */
export const hashFileSha256 = hashFile;

/**
 * @deprecated 请使用 hashFileSync 替代
 */
export const hashFileSha256Async = hashFileSync;

/**
 * @deprecated 请使用 hashFolder 替代
 */
export const hashFolderSha256 = hashFolder;

/**
 * @deprecated 请使用 traverseFolderAsync 替代（注意：原函数名有误导性，它是异步的）
 */
export const traverseFolderSync = traverseFolderAsync;

/**
 * @deprecated 该函数已移除，请使用 readLastLine
 */
export function readLastLine1(_path: string): Promise<string> {
  return readLastLine(_path);
}

/**
 * @deprecated 请使用 HashAlgorithm 枚举替代
 */
export const algorithmType = {
  sha256: HashAlgorithm.SHA256,
  sha1: HashAlgorithm.SHA1,
  md5: HashAlgorithm.MD5
};
