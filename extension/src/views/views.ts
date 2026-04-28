import { Disposable } from 'vscode';
import type { Container } from '@/container';
import type { WebviewsController } from '@orientais/vscode-webview/webviewsController';

export class Views implements Disposable {
  private readonly _disposable: Disposable;

  constructor(
    private readonly container: Container,
    webviews: WebviewsController
  ) {
    this._disposable = Disposable.from(
      ...this.registerViews(),
      ...this.registerWebviewViews(webviews),
      ...this.registerCommands()
    );
  }

  dispose(): void {
    this._disposable.dispose();
  }

  /**
   * 注册与视图相关的命令，并将这些命令绑定到具体的功能逻辑上。
   *
   * 主要作用：
   * - 命令注册：使用 registerCommand 方法将命令与具体功能绑定，每个命令对应一个操作，如切换视图分组、显示/隐藏视图、设置默认视图等。
   * - 视图交互：通过注册的命令，用户可通过命令面板、快捷键或右键菜单与视图进行交互。
   * - 动态控制：注册的命令可动态更新视图状态，如切换分组、显示欢迎通知等，通过调用其他方法（如 toggleScmViewGrouping、updateScmGroupedViewsInConfig）实现视图的动态行为。
   */
  private registerCommands(): Disposable[] {
    return [];
  }

  /**
   *  显示欢迎通知。
   *  该方法用于在扩展首次激活时向用户展示欢迎信息或提示。
   *  可以在此处添加更多的欢迎内容或指引，帮助用户了解如何使用扩展。
   *
   *  注意：目前该方法未实现具体逻辑，实际使用时可以根据需求添加相关功能。
   */
  private async showWelcomeNotification() {}

  /**
   * 内置的视图和 Webview 视图注册方法。
   */
  private registerViews(): Disposable[] {
    return [];
  }
  /**
   * 注册 Webview 视图
   * @param webviews WebviewsController 实例
   * @returns Disposable 对象
   */
  private registerWebviewViews(_webviews: WebviewsController) {
    return [];
  }
}
