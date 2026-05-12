import type { WebviewCommands, WebviewViewCommands } from '@shared/webviews/constants/constants.commands';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';

/**
 * 将应用特定的 Webview ID / 命令类型注入到 @orientais/vscode-webview 的类型注册表。
 *
 * 此文件是应用层与库层之间的「类型桥接」：
 *   - 库 (vscode-webview) 保持零业务耦合，内部使用 WebviewTypeRegistry 中的类型
 *   - 应用层在此处通过 module augmentation 收窄为具体联合类型
 *   - 所有使用 AnyWebviewId / AnyWebviewCommand 的库 API 自动获得强类型校验
 */
declare module '@orientais/vscode-webview' {
  interface WebviewTypeRegistry {
    webviewId: WebviewIds | WebviewViewIds;
    webviewCommand: WebviewCommands | WebviewViewCommands;
  }
}
