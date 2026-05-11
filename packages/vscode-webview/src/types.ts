/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Uri } from 'vscode';
import type { WebviewHost } from './webviewHost';

export interface IWebviewContainer {
  context: { extensionUri: Uri; extensionPath: string };
  notificationManager: {
    registerWebviewHost(id: string, host: WebviewHost<any>): void;
    unregisterWebviewHost?(id: string): void;
  };
}
