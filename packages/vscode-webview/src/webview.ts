// =============================================================================
// Webview 上下文与命令链接工具模块
// 通过 WebviewTypeRegistry 模块扩充注入应用特定类型，保持包本身零业务耦合。
// =============================================================================

/**
 * 可扩充的 Webview 类型注册表。
 *
 * 在应用层通过 declare module 注入具体业务类型，从而在不引入应用依赖的前提下
 * 获得端到端的强类型校验。
 *
 * @example
 * // 在应用的类型声明文件（如 types/webview.d.ts）中：
 * import type { WebviewCommands, WebviewViewCommands } from '@shared/webviews/constants/constants.commands';
 * import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
 *
 * declare module '@orientais/vscode-webview' {
 *   interface WebviewTypeRegistry {
 *     webviewId: WebviewIds | WebviewViewIds;
 *     webviewCommand: WebviewCommands | WebviewViewCommands;
 *   }
 * }
 */
export interface WebviewTypeRegistry {
  // 所有 webview / webviewView 面板 ID
  webviewId: string;
  // 所有与 webview 相关的命令 ID
  webviewCommand: string;
}

/** 当前已注册的 Webview ID 类型（默认 `string`，扩充后收窄为具体联合类型）*/
export type AnyWebviewId = WebviewTypeRegistry['webviewId'];

/** 当前已注册的 Webview 命令类型（默认 `string`，扩充后收窄为具体联合类型）*/
export type AnyWebviewCommand = WebviewTypeRegistry['webviewCommand'];

export function createWebviewCommandLink<T>(
  command: AnyWebviewCommand,
  webviewId: AnyWebviewId,
  webviewInstanceId: string | undefined,
  args?: T
): string {
  return `command:${command}?${encodeURIComponent(
    JSON.stringify({ webview: webviewId, webviewInstance: webviewInstanceId, ...args } satisfies WebviewContext)
  )}`;
}

export interface WebviewContext {
  webview: AnyWebviewId;
  webviewInstance: string | undefined;
}

export function isWebviewContext(item: object | null | undefined): item is WebviewContext {
  if (item == null) return false;

  return 'webview' in item && item.webview != null;
}

export interface WebviewItemContext<TValue = unknown> extends Partial<WebviewContext> {
  webviewItem: string;
  webviewItemValue: TValue;
  webviewItemsValues?: { webviewItem: string; webviewItemValue: TValue }[];
}

export function isWebviewItemContext<TValue = unknown>(
  item: object | null | undefined
): item is WebviewItemContext<TValue> & WebviewContext {
  if (item == null) return false;

  return 'webview' in item && item.webview != null && 'webviewItem' in item;
}

export interface WebviewItemGroupContext<TValue = unknown> extends Partial<WebviewContext> {
  webviewItemGroup: string;
  webviewItemGroupValue: TValue;
}

export function isWebviewItemGroupContext<TValue = unknown>(
  item: object | null | undefined
): item is WebviewItemGroupContext<TValue> & WebviewContext {
  if (item == null) return false;

  return 'webview' in item && item.webview != null && 'webviewItemGroup' in item;
}

export function serializeWebviewItemContext<T = WebviewItemContext | WebviewItemGroupContext>(context: T): string {
  return JSON.stringify(context);
}
