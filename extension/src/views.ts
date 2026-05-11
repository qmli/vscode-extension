import type { WebviewsController } from '@orientais/vscode-webview';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
import { Disposable } from 'vscode';
import type { Container } from './container';

export class Views implements Disposable {
  private readonly _disposable: Disposable;

  constructor(_container: Container, _webviews: WebviewsController<Container, WebviewIds, WebviewViewIds>) {
    this._disposable = Disposable.from();
  }

  dispose(): void {
    this._disposable.dispose();
  }
}
