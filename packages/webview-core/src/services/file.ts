// // 文件服务

// import { useVSCodeStore } from '../stores/vscode';
// import type { FileInfo } from './types';

// class FileService {
//   private vscodeStore = useVSCodeStore();

//   // 通过VSCode API读取文件
//   async readFile(filePath: string): Promise<string | null> {
//     if (!this.vscodeStore.isConnected) {
//       console.warn('VSCode API not connected');
//       return null;
//     }

//     try {
//       const messageId = this.vscodeStore.readFile(filePath);

//       // 等待响应 (这里需要实现消息响应机制)
//       const result = await this.waitForResponse<string>(messageId, 'file:read');
//       return result;
//     } catch (error) {
//       console.error('Failed to read file:', error);
//       return null;
//     }
//   }

//   // 通过VSCode API写入文件
//   async writeFile(filePath: string, content: string): Promise<boolean> {
//     if (!this.vscodeStore.isConnected) {
//       console.warn('VSCode API not connected');
//       return false;
//     }

//     try {
//       const messageId = this.vscodeStore.writeFile(filePath, content);

//       // 等待响应
//       const result = await this.waitForResponse<string>(messageId, 'file:write');
//       return result === 'success';
//     } catch (error) {
//       console.error('Failed to write file:', error);
//       return false;
//     }
//   }

//   // 获取文件信息
//   async getFileInfo(filePath: string): Promise<FileInfo | null> {
//     if (!this.vscodeStore.isConnected) {
//       return null;
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('get-file-info', { filePath: filePath });
//       return await this.waitForResponse<FileInfo | null>(messageId, 'file:info');
//     } catch (error) {
//       console.error('Failed to get file info:', error);
//       return null;
//     }
//   }

//   // 列出目录内容
//   async listDirectory(dirPath: string): Promise<FileInfo[]> {
//     if (!this.vscodeStore.isConnected) {
//       return [];
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('list-directory', { dirPath: dirPath });
//       const result = await this.waitForResponse<FileInfo[]>(messageId, 'directory:list');
//       return result;
//     } catch (error) {
//       console.error('Failed to list directory:', error);
//       return [];
//     }
//   }

//   // 创建文件
//   async createFile(filePath: string, content = ''): Promise<boolean> {
//     return this.writeFile(filePath, content);
//   }

//   // 创建目录
//   async createDirectory(dirPath: string): Promise<boolean> {
//     if (!this.vscodeStore.isConnected) {
//       return false;
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('create-directory', { dirPath: dirPath });
//       const result = await this.waitForResponse<string>(messageId, 'directory:create');
//       return result === 'success';
//     } catch (error) {
//       console.error('Failed to create directory:', error);
//       return false;
//     }
//   }

//   // 删除文件或目录
//   async delete(path: string): Promise<boolean> {
//     if (!this.vscodeStore.isConnected) {
//       return false;
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('delete-path', { path: path });
//       const result = await this.waitForResponse<string>(messageId, 'path:delete');
//       return result === 'success';
//     } catch (error) {
//       console.error('Failed to delete path:', error);
//       return false;
//     }
//   }

//   // 重命名文件或目录
//   async rename(oldPath: string, newPath: string): Promise<boolean> {
//     if (!this.vscodeStore.isConnected) {
//       return false;
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('rename-path', { oldPath: oldPath, newPath: newPath });
//       const result = await this.waitForResponse<string>(messageId, 'path:rename');
//       return result === 'success';
//     } catch (error) {
//       console.error('Failed to rename path:', error);
//       return false;
//     }
//   }

//   // 复制文件或目录
//   async copy(sourcePath: string, targetPath: string): Promise<boolean> {
//     if (!this.vscodeStore.isConnected) {
//       return false;
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('copy-path', { sourcePath: sourcePath, targetPath: targetPath });
//       const result = await this.waitForResponse<string>(messageId, 'path:copy');
//       return result === 'success';
//     } catch (error) {
//       console.error('Failed to copy path:', error);
//       return false;
//     }
//   }

//   // 检查文件或目录是否存在
//   async exists(path: string): Promise<boolean> {
//     if (!this.vscodeStore.isConnected) {
//       return false;
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('check-exists', { path: path });
//       const result = await this.waitForResponse<boolean>(messageId, 'path:exists');
//       return result;
//     } catch (error) {
//       console.error('Failed to check path exists:', error);
//       return false;
//     }
//   }

//   // 搜索文件
//   async searchFiles(pattern: string, directory?: string): Promise<FileInfo[]> {
//     if (!this.vscodeStore.isConnected) {
//       return [];
//     }

//     try {
//       const messageId = this.vscodeStore.postMessage('search-files', { pattern: pattern, directory: directory });
//       const result = await this.waitForResponse<FileInfo[]>(messageId, 'files:search');
//       return result;
//     } catch (error) {
//       console.error('Failed to search files:', error);
//       return [];
//     }
//   }

//   // 获取工作区文件夹
//   async getWorkspaceFolders(): Promise<string[]> {
//     if (!this.vscodeStore.isConnected) {
//       return [];
//     }

//     try {
//       const messageId = this.vscodeStore.getWorkspaceFolders();
//       const result = await this.waitForResponse<string[]>(messageId, 'workspace:folders');
//       return result;
//     } catch (error) {
//       console.error('Failed to get workspace folders:', error);
//       return [];
//     }
//   }

//   // 打开文件
//   openFile(filePath: string): boolean {
//     if (!this.vscodeStore.isConnected) {
//       return false;
//     }

//     try {
//       this.vscodeStore.openFile(filePath);
//       return true;
//     } catch (error) {
//       console.error('Failed to open file:', error);
//       return false;
//     }
//   }

//   // 文件路径工具方法
//   getFileName(filePath: string): string {
//     return filePath.split(/[/\\]/).pop() || '';
//   }

//   getFileExtension(filePath: string): string {
//     const fileName = this.getFileName(filePath);
//     const lastDot = fileName.lastIndexOf('.');
//     return lastDot > 0 ? fileName.slice(lastDot + 1) : '';
//   }

//   getDirectoryPath(filePath: string): string {
//     const parts = filePath.split(/[/\\]/);
//     parts.pop();
//     return parts.join('/');
//   }

//   joinPath(...parts: string[]): string {
//     return parts.join('/').replace(/\/+/g, '/');
//   }

//   normalizePath(path: string): string {
//     return path.replace(/\\/g, '/').replace(/\/+/g, '/');
//   }

//   isAbsolutePath(path: string): boolean {
//     return /^([a-zA-Z]:)?[/\\]/.test(path);
//   }

//   // 等待消息响应的辅助方法
//   private async waitForResponse<T>(messageId: string, eventType: string, timeout = 5000): Promise<T> {
//     return new Promise((resolve, reject) => {
//       const timer = setTimeout(() => {
//         reject(new Error(`Timeout waiting for ${eventType} response`));
//       }, timeout);

//       // 这里需要实现消息响应机制
//       // 实际实现时，应该监听来自VSCode的响应消息
//       const cleanup = () => {
//         clearTimeout(timer);
//       };

//       // 模拟响应 (实际实现时需要替换)
//       setTimeout(() => {
//         cleanup();
//         resolve('success' as unknown as T);
//       }, 100);
//     });
//   }
// }

// // 创建文件服务实例
// export const createFileService = (): FileService => {
//   return new FileService();
// };

// // 导出类
// export { FileService };
