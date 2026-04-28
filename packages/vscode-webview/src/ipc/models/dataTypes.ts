// 统一的 IPC 标记类型系统 —— 允许在 IPC 边界上透明地序列化/反序列化特殊类型

import type { UriComponents } from '@orientais/vscode-core/uri';

/** 用于日期的标记类型，序列化为时间戳 */
export interface IpcDate {
  __ipc: 'date';
  value: number;
}

/** 用于 Promise 的标记类型，通过 IPC 异步解析 */
export interface IpcPromise {
  __ipc: 'promise';
  value: {
    id: string;
    method: string;
  };
  __promise: Promise<unknown>;
}

/** 用于 Uri 的标记类型，序列化为 UriComponents */
export interface IpcUri {
  __ipc: 'uri';
  value: UriComponents;
}

export type IpcTaggedType = IpcPromise | IpcDate | IpcUri;
