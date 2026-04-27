import { once } from '@orientais/vscode-core/event';
import { BufferedLogChannel, getLoggableName, Logger } from '@orientais/vscode-core/logger';
import * as vscode from 'vscode';
import { env, ExtensionMode, Uri } from 'vscode';
import { Storage } from '@/core/storage';
import { runExample } from '@/examples/basic-usage';
import { registerCommands } from './common/commands/command';
import { loggingJsonReplacer } from './common/json';
import { satisfies } from '@orientais/vscode-core';
import { isWorkspaceFolder } from './common/workspaces';
import { Container } from './container';
import { Configuration } from './core/configuration';
import { ExternalExecutableUsageExample } from './external/examples/usageExample';
import { isWeb } from './utils/platform';
import './command';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const autosarswcVersion: string = context.extension.packageJSON.version;
  const prerelease = satisfies(autosarswcVersion, '> 0.0.1');
  // 该命令已在 package.json 文件中定义
  // 现在使用 registerCommand 提供该命令的实现
  // commandId 参数必须与 package.json 中的 command 字段匹配
  // 动态读取 resources 目录下的 log4js 配置
  const config = vscode.workspace.getConfiguration('station');

  // 读取数据
  const logLevel = config.get<'debug' | 'info' | 'warn' | 'error'>('logLevel', 'info');
  Logger.configure(
    {
      name: 'orientais',
      createChannel: function (name: string) {
        const channel = new BufferedLogChannel(vscode.window.createOutputChannel(name, { log: true }), 500);
        context.subscriptions.push(channel);
        if (logLevel === 'error' || logLevel === 'warn') {
          channel.appendLine(
            `orientais${prerelease ? ' (pre-release)' : ''} v${autosarswcVersion} activating in ${
              env.appName
            } (${vscode.version}) on the ${isWeb ? 'web' : 'desktop'}; language='${
              env.language
            }', logLevel='${logLevel}' (${env.machineId}|${env.sessionId})`,
            'info'
          );
          channel.appendLine(
            '要启用调试日志，请设置 `"orientais.outputLevel": "debug"` 或从命令面板运行 "orientais: Enable Debug Logging"',
            'info'
          );
        }
        return channel;
      },
      toLoggable: function (o: any) {
        if (o instanceof Uri) return `Uri(${o.toString(true)})`;

        if ('rootUri' in o && o.rootUri instanceof Uri) {
          return `ScmRepository(${o.rootUri.toString(true)})`;
        }

        if ('uri' in o && o.uri instanceof Uri) {
          if (isWorkspaceFolder(o)) {
            return `WorkspaceFolder(${o.name}, index=${o.index}, ${o.uri.toString(true)})`;
          }

          return `${getLoggableName(o)}(${o.uri.toString(true)})`;
        }

        return undefined;
      },
      sanitizer: loggingJsonReplacer
    },
    logLevel,
    context.extensionMode === ExtensionMode.Development
  );
  // context.subscriptions.push(disposable);
  //webView = createWebView(context, vscode.ViewColumn.One, vscode.l10n.t('Station'), vscode.l10n.t('en'));
  const storage = new Storage(context);
  const container = Container.create(context, storage, autosarswcVersion);

  await container.initializeExternalProviders();

  Configuration.configure(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('hello', () => {
      const examples = new ExternalExecutableUsageExample(container);
      void examples.registerSampleProvider().then(() => {
        void examples.executeBasicCommands();
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('autosar.sqliteTest', async () => {
      // sqlTest(context);
      await runExample(context);
    })
  );
  once(container.onReady)(() => {
    context.subscriptions.push(...registerCommands(container)); // 注册所有命令
    // 这里可以添加其他初始化逻辑，比如注册事件监听器等
    // container.storage.onDidChangeAny(this.onStorageChanged, this);
    // 需要注册的命令
    Logger.log('Extension is ready');
  });
  container.ready();
}
