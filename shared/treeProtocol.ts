import { IpcRequest, scope } from './protocol';

// 批量传输相关的类型定义
export interface ContextItem {
  id: string;
  viewItemType: 'File' | 'clearContext';
}

// 批量传输的 IPC 请求
export const ContextMenuCommand = new IpcRequest<ContextItem>(scope, 'contextmenu/contextItem');
