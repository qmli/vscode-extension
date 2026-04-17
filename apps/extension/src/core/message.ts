import type { MessageItem } from 'vscode';
import { window } from 'vscode';
import type { SuppressedMessages } from '@/common/config';
import { openUrl } from '@/common/uris';
import { urls } from '@packages/common/webviews/constants/constants';
import { Logger } from './logger';

/**
 * 显示集成服务因请求过多而断开连接的错误消息
 * @param providerName 集成服务名称
 */
export function showIntegrationDisconnectedTooManyFailedRequestsWarningMessage(
  providerName: string
): Promise<MessageItem | undefined> {
  return showMessage(
    'error',
    `由于请求失败次数过多，与 ${providerName} 的丰富集成已在此会话中断开连接。`,
    'suppressIntegrationDisconnectedTooManyFailedRequestsWarning',
    undefined,
    {
      title: '确定'
    }
  );
}

/**
 * 显示集成服务 500 错误消息
 * @param message 错误内容
 */
export function showIntegrationRequestFailed500WarningMessage(message: string): Promise<MessageItem | undefined> {
  return showMessage('error', message, 'suppressIntegrationRequestFailed500Warning', undefined, {
    title: '确定'
  });
}

/**
 * 显示集成服务请求超时的错误消息
 * @param providerName 集成服务名称
 */
export function showIntegrationRequestTimedOutWarningMessage(providerName: string): Promise<MessageItem | undefined> {
  return showMessage('error', `${providerName} 请求超时。`, 'suppressIntegrationRequestTimedOutWarning', undefined, {
    title: '确定'
  });
}

/**
 * 显示“新版本发布”消息，带有查看发布说明的按钮
 * @param majorVersion 主版本号
 */
export async function showWhatsNewMessage(majorVersion: string): Promise<void> {
  const confirm = { title: 'OK', isCloseAffordance: true }; // “确定”按钮
  const releaseNotes = { title: '查看发布说明' }; // “查看发布说明”按钮
  const result = await showMessage(
    'info',
    `已升级到 autosar ${majorVersion}${majorVersion === '17' ? '，包含全新的 (https://网址) 功能' : ' — 查看新功能。'}`,
    undefined,
    null,
    releaseNotes,
    confirm
  );

  if (result === releaseNotes) {
    // 用户点击了“查看发布说明”按钮，打开发布说明链接
    void openUrl(urls.releaseNotes);
  }
}

export async function showGenericErrorMessage(message: string): Promise<void> {
  if (Logger.enabled('error')) {
    const result = await showMessage('error', `${message}。请查看输出通道获取更多详细信息。`, undefined, null, {
      title: '打开输出通道'
    });

    if (result != null) {
      Logger.showOutputChannel();
    }
  } else {
    const result = await showMessage(
      'error',
      `${message}。如果该错误持续出现，请启用调试日志并重试。`,
      undefined,
      null,
      {
        title: '启用调试日志'
      }
    );

    if (result != null) {
      //void executeCommand('autosar.enableDebugLogging');
    }
  }
}

/**
 * 消息统一封装函数
 * 支持单参数调用（默认info类型）和多参数调用
 */

// 函数重载：单参数调用，默认使用 'info' 类型
export async function showMessage(message: string): Promise<MessageItem | undefined>;

// 函数重载：完整参数调用
export async function showMessage(
  type: 'info' | 'warn' | 'error',
  message: string,
  suppressionKey?: SuppressedMessages,
  dontShowAgain?: MessageItem | null,
  ...actions: MessageItem[]
): Promise<MessageItem | undefined>;

// 函数实现
export async function showMessage(
  typeOrMessage: 'info' | 'warn' | 'error' | string,
  messageOrSuppressionKey?: string | SuppressedMessages,
  suppressionKeyOrDontShowAgain?: SuppressedMessages | MessageItem | null,
  dontShowAgain?: MessageItem | null,
  ...actions: MessageItem[]
): Promise<MessageItem | undefined> {
  // 判断是单参数调用还是多参数调用
  let type: 'info' | 'warn' | 'error';
  let message: string;
  let suppressionKey: SuppressedMessages | undefined;
  let finalDontShowAgain: MessageItem | null;

  if (typeof typeOrMessage === 'string' && !['info', 'warn', 'error'].includes(typeOrMessage)) {
    // 单参数调用：typeOrMessage 是 message
    type = 'info';
    message = typeOrMessage;
    suppressionKey = undefined;
    finalDontShowAgain = { title: '不在显示' };
  } else {
    // 多参数调用：typeOrMessage 是 type
    type = typeOrMessage as 'info' | 'warn' | 'error';
    message = messageOrSuppressionKey as string;
    suppressionKey = suppressionKeyOrDontShowAgain as SuppressedMessages | undefined;
    finalDontShowAgain = dontShowAgain ?? { title: '不在显示' };
  }

  // Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(finalDontShowAgain)})`);

  // 如果 suppressionKey 已被配置为抑制，则直接跳过显示
  // if (suppressionKey != null && configuration.get(`advanced.messages.${suppressionKey}` as const)) {
  //   Logger.log(`ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(finalDontShowAgain)}) skipped`);
  //   return undefined;
  // }

  // 如果支持"不要再显示"，则将其加入 actions
  if (suppressionKey != null && finalDontShowAgain !== null) {
    actions.push(finalDontShowAgain);
  }

  let result: MessageItem | undefined = undefined;
  switch (type) {
    case 'info':
      // 信息消息
      result = await window.showInformationMessage(message, ...actions);
      break;

    case 'warn':
      // 警告消息
      result = await window.showWarningMessage(message, ...actions);
      break;

    case 'error':
      // 错误消息
      result = await window.showErrorMessage(message, ...actions);
      break;
  }

  // 如果 suppressionKey 存在，并且用户点击了"不要再显示"或没有提供该按钮，则更新配置抑制后续显示
  if (suppressionKey != null && (finalDontShowAgain === null || result === finalDontShowAgain)) {
    Logger.log(
      `ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(finalDontShowAgain)}) 用户请求不再显示`
    );
    await suppressedMessage(suppressionKey);

    // 如果用户点击了"不要再显示"，则返回 undefined
    if (result === finalDontShowAgain) return undefined;
  }

  Logger.log(
    `ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(finalDontShowAgain)}) returned ${
      result != null ? result.title : result
    }`
  );
  return result;
}

/**
 * 将 suppressionKey 标记为已抑制，更新到全局配置
 * @param suppressionKey 抑制消息的 key 更新用户不在显示
 */
async function suppressedMessage(_suppressionKey: SuppressedMessages) {
  // const messages = { ...configuration.get('advanced.messages') };
  // messages[suppressionKey] = true;
  // // 只保留值为 true 的 key，清理无效项
  // for (const [key, value] of Object.entries(messages)) {
  //   if (value !== true) {
  //     // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  //     delete messages[key as keyof typeof messages];
  //   }
  // }
  // // 更新全局配置
  // return configuration.update('advanced.messages', messages, ConfigurationTarget.Global);
}

// ...existing code...
