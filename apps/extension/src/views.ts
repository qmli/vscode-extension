import { Disposable } from 'vscode';
import type { Container } from './container';
import type { WebviewsController } from '@orientais/vscode-webview/webviewsController';

export class Views implements Disposable {
  private readonly _disposable: Disposable;

  constructor(_container: Container, _webviews: WebviewsController) {
    this._disposable = Disposable.from();
  }

  dispose(): void {
    this._disposable.dispose();
  }
}
