/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IpcDate, IpcPromise, IpcTaggedType, IpcUri } from '../models/dataTypes.js';

/**
 * @returns 如果值是 IPC 标记类型则返回该类型，否则返回 undefined
 * 比起多次调用 isIpc* 函数，当你需要处理不同类型时更高效
 */
export function getIpcTaggedType(value: unknown): IpcTaggedType | undefined {
  if (typeof value !== 'object' || value == null) return undefined;

  const ipc = (value as any).__ipc;
  if (ipc == null) return undefined;

  switch (ipc) {
    case 'date':
      return typeof (value as IpcDate).value === 'number' ? (value as IpcDate) : undefined;
    case 'promise':
      return typeof (value as IpcPromise).value === 'object' &&
        typeof (value as IpcPromise).value.id === 'string' &&
        typeof (value as IpcPromise).value.method === 'string'
        ? (value as IpcPromise)
        : undefined;
    case 'uri':
      return typeof (value as IpcUri).value === 'object' && typeof (value as IpcUri).value?.scheme === 'string'
        ? (value as IpcUri)
        : undefined;
    default:
      return undefined;
  }
}

export function isIpcTaggedType(value: unknown): value is IpcTaggedType {
  return getIpcTaggedType(value) != null;
}

export function isIpcDate(value: unknown): value is IpcDate {
  return getIpcTaggedType(value)?.__ipc === 'date';
}

export function isIpcPromise(value: unknown): value is IpcPromise {
  return getIpcTaggedType(value)?.__ipc === 'promise';
}

export function isIpcUri(value: unknown): value is IpcUri {
  return getIpcTaggedType(value)?.__ipc === 'uri';
}
