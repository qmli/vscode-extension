import type { WebviewHost, WebviewPanelsProxy, WebviewsController } from '@orientais/vscode-webview';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
import { Disposable, ViewColumn } from 'vscode';
import { registerCommand } from '@/common/commands/command';
import type { Container } from '../../container';
import type { State } from './protocol';

export type ExampleWebviewShowingArgs = [];

export function registerExampleWebviewPanel(
  controller: WebviewsController<Container, WebviewIds, WebviewViewIds>
): WebviewPanelsProxy<'autosar.example', ExampleWebviewShowingArgs, State> {
  return controller.registerWebviewPanel<
    'autosar.example',
    ExampleWebviewShowingArgs,
    State,
    ExampleWebviewShowingArgs
  >(
    {
      id: 'autosar.example',
      iconPath: 'images/swc-icon.png',
      title: 'Example',
      contextKeyPrefix: `autosar:webview:example`,
      type: 'example',
      column: ViewColumn.Active,
      allowMultipleInstances: true
    },
    async (container: Container, host: WebviewHost<'autosar.example'>) => {
      const { ExampleWebviewProvider } = await import(/* webpackChunkName: "webview-example" */ './exampleWebview');
      return new ExampleWebviewProvider(container, host);
    }
  );
}

/**
 * 开发模式使用示例：
 * `await vscode.commands.executeCommand('autosar.example', { appId: 'demo-app', rootId: 'root' });`
 */
export function registerExampleWebviewCommands<T>(
  _container: Container,
  panels: WebviewPanelsProxy<'autosar.example', ExampleWebviewShowingArgs, T>
): Disposable {
  return Disposable.from(
    registerCommand('autosar.example', () => {
      // 无参调用（如命令面板）不要创建面板：否则 onShowing 无法解析 appId，bootstrap 中 _appId 恒为空。
      void panels.show({
        column: ViewColumn.Active
      });
    })
  );
}
