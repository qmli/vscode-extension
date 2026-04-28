import type { Disposable, OutputChannel } from 'vscode';
import { window } from 'vscode';

const ExternalOutputChannelName = 'Orientais External Tools';
const ExternalRuntimeOutputChannelName = 'Orientais External Tools Runtime';

let externalOutputChannel: OutputChannel | undefined;
let externalRuntimeOutputChannel: OutputChannel | undefined;
const runtimeRemainders = new Map<string, string>();

/**
 * 初始化外部工具专用输出通道，并可选注册到扩展生命周期中自动释放。
 *
 * @param disposables 可选的释放集合（通常传入 extensionContext.subscriptions）
 * @returns 外部工具输出通道实例
 */
export function initializeExternalOutputChannel(disposables?: Disposable[]): OutputChannel {
  const channel = getExternalOutputChannel();
  if (disposables != null && !disposables.includes(channel)) {
    disposables.push(channel);
  }
  return channel;
}

/**
 * 初始化外部工具运行日志专用输出通道，并可选注册到扩展生命周期中自动释放。
 *
 * @param disposables 可选的释放集合（通常传入 extensionContext.subscriptions）
 * @returns 外部工具运行日志输出通道实例
 */
export function initializeExternalRuntimeOutputChannel(disposables?: Disposable[]): OutputChannel {
  const channel = getExternalRuntimeOutputChannel();
  if (disposables != null && !disposables.includes(channel)) {
    disposables.push(channel);
  }
  return channel;
}

/**
 * 获取外部工具专用输出通道（懒创建）。
 *
 * @returns 输出通道实例
 */
export function getExternalOutputChannel(): OutputChannel {
  externalOutputChannel ??= window.createOutputChannel(ExternalOutputChannelName);
  return externalOutputChannel;
}

/**
 * 获取外部工具运行日志专用输出通道（懒创建）。
 *
 * @returns 输出通道实例
 */
export function getExternalRuntimeOutputChannel(): OutputChannel {
  externalRuntimeOutputChannel ??= window.createOutputChannel(ExternalRuntimeOutputChannelName);
  return externalRuntimeOutputChannel;
}

/**
 * 向外部工具输出通道写入日志。
 *
 * @param level 日志级别
 * @param message 日志消息
 * @param params 附加参数
 */
export function logExternalMessage(
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  message: string,
  ...params: unknown[]
): void {
  const channel = getExternalOutputChannel();
  const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
  const payload = params.length > 0 ? ` ${params.map(formatParam).join(' ')}` : '';
  channel.appendLine(`[${timestamp}] [${level}] ${message}${payload}`);
}

/**
 * 在外部工具输出通道写入调试日志。
 *
 * @param message 日志消息
 * @param params 附加参数
 */
export function logExternalDebug(message: string, ...params: unknown[]): void {
  logExternalMessage('DEBUG', message, ...params);
}

/**
 * 在外部工具输出通道写入信息日志。
 *
 * @param message 日志消息
 * @param params 附加参数
 */
export function logExternalInfo(message: string, ...params: unknown[]): void {
  logExternalMessage('INFO', message, ...params);
}

/**
 * 在外部工具输出通道写入警告日志。
 *
 * @param message 日志消息
 * @param params 附加参数
 */
export function logExternalWarn(message: string, ...params: unknown[]): void {
  logExternalMessage('WARN', message, ...params);
}

/**
 * 在外部工具输出通道写入错误日志。
 *
 * @param message 日志消息
 * @param params 附加参数
 */
export function logExternalError(message: string, ...params: unknown[]): void {
  logExternalMessage('ERROR', message, ...params);
}

/**
 * 逐行追加外部工具运行输出到独立通道，自动处理分片数据与行缓冲。
 *
 * @param toolName 外部工具名称
 * @param stream 输出流类型
 * @param chunk 输出分片
 */
export function appendExternalRuntimeChunk(toolName: string, stream: 'stdout' | 'stderr', chunk: string): void {
  const channel = getExternalRuntimeOutputChannel();
  const key = `${toolName}:${stream}`;
  const merged = `${runtimeRemainders.get(key) ?? ''}${chunk}`;
  const lines = merged.split(/\r\n|\n|\r/g);
  const remainder = lines.pop() ?? '';
  runtimeRemainders.set(key, remainder);

  for (const line of lines) {
    channel.appendLine(`[${toolName}] [${stream}] ${line}`);
  }
}

/**
 * 刷新指定工具的运行输出缓冲，确保末尾残留内容也写入独立通道。
 *
 * @param toolName 外部工具名称
 */
export function flushExternalRuntimeChunks(toolName: string): void {
  const channel = getExternalRuntimeOutputChannel();
  const streams: Array<'stdout' | 'stderr'> = ['stdout', 'stderr'];
  for (const stream of streams) {
    const key = `${toolName}:${stream}`;
    const remainder = runtimeRemainders.get(key);
    if (remainder != null && remainder.length > 0) {
      channel.appendLine(`[${toolName}] [${stream}] ${remainder}`);
    }
    runtimeRemainders.delete(key);
  }
}

/**
 * 将任意参数安全转换为可读字符串。
 *
 * @param value 待格式化参数
 * @returns 可读字符串
 */
function formatParam(value: unknown): string {
  if (value == null) {
    return String(value);
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Unserializable Object]';
    }
  }
  return String(value);
}
