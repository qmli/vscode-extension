import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { Uri } from 'vscode';
import { window } from 'vscode';
import { WebviewReloadCommand } from '@packages/common/protocol';
import type { ViewIds, WebviewIds } from '@packages/common/webviews//constants/constants.views';

export interface HtmlGeneratorOptions {
  extensionUri: Uri;
  /**
   * 语言设置，默认为 'en'
   */
  locale: string;
  /**
   * 主题设置
   */
  theme?: string;
  /**
   * 用于生成 webview URI 的函数
   * @param pathSegments 路径段数组
   */
  buildWebviewUri: (pathSegments: string[]) => string;
  /**
   * 资源路径段，默认为 ['dist', 'assets']
   * 可以根据需要修改为其他路径
   */
  assetsPath?: string[]; // 资源路径段，默认为 ['dist', 'assets']
  /**
   * app容器ID，默认为 'app'
   * 可以根据需要修改为其他容器ID
   */
  appId?: string; // app容器ID，默认为 'app'
  /**
   * 是否包含 .map 文件，默认为 true
   * 如果不需要 .map 文件，可以设置为 false
   */
  includeMapFiles?: boolean; // 是否包含 .map 文件，默认为 false
  /**
   * WebviewIds 用于指定特定的 Webview ID
   */
  WebviewIds?: WebviewIds | ViewIds;
  /**
   * 可选的 webviewInstance，用于指定特定的 Webview 实例 ID
   */
  webviewInstance?: string;
  /**
   * 是否处于开发模式（启用 HMR 热更新）
   * 当为 true 时，将尝试连接本地开发服务器
   */
  isDev?: boolean;
  /**
   * 开发服务器host（仅在 isDev 为 true 时有效）
   * 默认为 127.0.0.1
   */
  devHost?: string;
  /**
   * 开发服务器端口（仅在 isDev 为 true 时有效）
   * 默认为 5173
   */
  devPort?: number;
  /**
   * 开发服务器入口文件路径（仅在 isDev 为 true 时有效）
   * 例如 'src/main.ts'
   */
  devEntry?: string;
}

export function generateWebviewHtml(options: HtmlGeneratorOptions): string {
  const {
    extensionUri,
    locale,
    buildWebviewUri,
    assetsPath = ['dist', 'assets'],
    appId = 'app',
    includeMapFiles = false,
    isDev = false,
    devHost = '127.0.0.1',
    devPort = 5173,
    devEntry = 'src/main.ts'
  } = options;

  if (isDev) {
    const devUrl = `http://${devHost}:${devPort}`;
    const nonce = generateNonce();
    // 开发模式下的 HTML 生成（支持 HMR）
    return `<!DOCTYPE html>
    <html lang="${locale}" data-language="${locale}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="csp-nonce" content="${nonce}">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${devUrl} ws://${devHost}:${devPort} http: https: ws: wss:; style-src 'unsafe-inline' ${devUrl}; script-src 'nonce-${nonce}' 'unsafe-eval' ${devUrl}; img-src data: ${devUrl} http: https:; font-src ${devUrl}; media-src ${devUrl}; frame-src ${devUrl}; worker-src ${devUrl};">
        <title>Local Development</title>
        <script nonce="${nonce}" type="module">
          // 注入 VS Code API 模拟或热重载逻辑
          // Hack: 确保 acquireVsCodeApi 是单例，防止旧界面脚本与此脚本同时获取导致错误
          const originalAcquire = window.acquireVsCodeApi;
          let vsCodeApi = undefined;
          window.acquireVsCodeApi = function() {
            if (!vsCodeApi && originalAcquire) {
              vsCodeApi = originalAcquire();
            }
            return vsCodeApi;
          };

          const vscode = window.acquireVsCodeApi();

          window.addEventListener('load', () => {
             console.log('Webview loaded in dev mode connecting to ${devUrl}');
          });

          // 向VSCode发送reload信号，解决热更新时页面刷新导致状态丢失或无法重连的问题
          function sendReloadSignalToVSCode(e) {
            e.preventDefault();
            vscode.postMessage({
              scope: "${WebviewReloadCommand.scope}",
              method: "${WebviewReloadCommand.method}",
              timestamp: Date.now(),
            });
            return false;
          }
          window.addEventListener('beforeunload', sendReloadSignalToVSCode);
        </script>
        <script nonce="${nonce}" type="module" src="${devUrl}/@vite/client"></script>
        <script nonce="${nonce}" type="module" src="${devUrl}/${devEntry}"></script>
    </head>
    <body style="padding:0px!important" class="auto-theme-container" data-vscode-context='{ "preventDefaultContextMenuItems": true, "webview": "${options.WebviewIds}", "webviewInstance": "${options.webviewInstance}" }'>
      <div id="${appId}"></div>
    </body>
    </html>`;
  }

  const fullAssetsPath = join(extensionUri.fsPath, ...assetsPath);
  if (!existsSync(fullAssetsPath)) {
    window.showErrorMessage(`Directory not found: ${fullAssetsPath}`); // 目录不存在
    return '';
  }

  const files = readdirSync(fullAssetsPath);

  // 动态过滤脚本文件
  const scriptFilter = includeMapFiles
    ? (file: string) => file.endsWith('.js') || file.includes('.map')
    : (file: string) => file.endsWith('.js');

  const assetsScripts = files.filter(scriptFilter).map((item: string): string => {
    return `<script src="${buildWebviewUri([...assetsPath, item])}"></script>`;
  });

  const assetsCss = files
    .filter((file: string) => file.endsWith('.css'))
    .map((item: string) => {
      return `<link rel="stylesheet" href="${buildWebviewUri([...assetsPath, item])}">`;
    });

  const html = `<!DOCTYPE html>
       <html  data-language="${locale}">
       <head>
       <meta charset="UTF-8">
       <meta http-equiv="X-UA-Compatible" content="IE=edge">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       ${assetsCss.join('')}
       </head>
       <body style="padding:0px!important" class="auto-theme-container" data-vscode-context='{ "preventDefaultContextMenuItems": true, "webview": "${options.WebviewIds}", "webviewInstance": "${options.webviewInstance}" }'>
        <div id="${appId}"></div>
       </body>
       ${assetsScripts.join('')}
       </html>
   `;
  return html;
}

export function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
