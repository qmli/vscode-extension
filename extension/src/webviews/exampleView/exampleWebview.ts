import type { IpcMessage } from '@orientais/shared/protocol';
import type { WebviewHost, WebviewProvider, WebviewShowOptions } from '@orientais/vscode-webview';
import { createIpcDispatcher, ipcCommand, ipcRequest } from '@orientais/vscode-webview';
import type { BatchTransferRequest, BatchTransferResponse } from '@shared/example.protocol';
import { BatchTransferCommand, ExampleQuickPickSelectCommand } from '@shared/example.protocol';
import { env, ExtensionMode, Uri, window } from 'vscode';
import { generateWebviewHtml } from '@/common/htmlcontext';
import type { Container } from '../../container';
import type { State } from './protocol';
import type { ExampleWebviewShowingArgs } from './registration';

export class ExampleWebviewProvider implements WebviewProvider<State, State, ExampleWebviewShowingArgs> {
  // private readonly _disposable: Disposable;

  // 当前编辑器 Provider 关联的 appId 和 rootId
  private _appId: string = '';
  private _rootId: string = '';

  constructor(
    protected readonly container: Container,
    protected readonly host: WebviewHost<'autosar.example'>
  ) {}

  onShowing(_loading: boolean, _options: WebviewShowOptions): [boolean, undefined] {
    return [true, undefined];
  }

  // onReady(): void | Promise<void> {
  //   this.host.notify(EditorTreeInitRequest, { appId: this._appId, rootId: this._rootId });
  // }

  includeBootstrap(): State | Promise<State> {
    console.log('Bootstrapping EditorWebview with appId:', this._appId, 'and rootId:', this._rootId);
    return {
      ...this.host.baseWebviewState,
      version: this.container.version,
      webviewId: 'autosar.example' as const, // 明确指定字面量类型
      appId: this._appId,
      rootId: this._rootId
    };
  }

  get html(): string {
    return generateWebviewHtml({
      extensionUri: this.container.context.extensionUri,
      locale: env.language,
      buildWebviewUri: (pathSegments: string[]) =>
        this.host.asWebviewUri(Uri.joinPath(this.container.context.extensionUri, ...pathSegments)).toString(),
      assetsPath: ['dist', 'example', 'assets'],
      appId: 'app',
      includeMapFiles: true,
      isDev: this.container.context.extensionMode === ExtensionMode.Development,
      devPort: 5185
    });
  }

  dispose(): void {
    // this._disposable.dispose();
  }

  onMessageReceived(e: IpcMessage): void {
    void createIpcDispatcher(this.host, this)(e);
  }

  // -----------------------------------------------------------------------
  // @ipcCommand 用例：即发即弃，处理 webview 发来的命令，无需返回值
  // webview 侧：sendCommand(ExampleQuickPickSelectCommand, undefined)
  // -----------------------------------------------------------------------
  @ipcCommand(ExampleQuickPickSelectCommand)
  private async onExampleQuickPickSelect(): Promise<void> {
    const items = [
      { label: '选项 A', description: '这是选项 A 的描述' },
      { label: '选项 B', description: '这是选项 B 的描述' },
      { label: '选项 C', description: '这是选项 C 的描述' }
    ];
    const picked = await window.showQuickPick(items, {
      placeHolder: '请选择一个项目',
      title: 'Example QuickPick'
    });
    if (picked != null) {
      void window.showInformationMessage(`已选择：${picked.label}`);
    }
  }

  // -----------------------------------------------------------------------
  // @ipcRequest 用例：接收参数并返回响应，框架自动调用 host.respond()
  // webview 侧：requestMessage(BatchTransferCommand, { items, options })
  //            → 收到 BatchTransferResponse
  // -----------------------------------------------------------------------
  @ipcRequest(BatchTransferCommand)
  private async onBatchTransfer(params: BatchTransferRequest): Promise<BatchTransferResponse> {
    const results = params.items.map((item) => ({
      id: item.id,
      success: true as const,
      metadata: item.metadata
    }));

    return {
      success: true,
      totalItems: params.items.length,
      successCount: params.items.length,
      failureCount: 0,
      results: results,
      errors: []
    };
  }
}
