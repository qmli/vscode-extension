import type { MessageItem } from 'vscode';
import { window } from 'vscode';
import { Logger } from './logger';
import { openUrl } from './uri';

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
 * 显示"新版本发布"消息，带有查看发布说明的按钮
 * @param majorVersion 主版本号
 * @param releaseNotesUrl 发布说明链接
 */
export async function showWhatsNewMessage(majorVersion: string, releaseNotesUrl: string): Promise<void> {
  const confirm = { title: 'OK', isCloseAffordance: true };
  const releaseNotes = { title: '查看发布说明' };
  const result = await showMessage(
    'info',
    `已升级到 autosar ${majorVersion}${majorVersion === '17' ? '，包含全新的 (https://网址) 功能' : ' — 查看新功能。'}`,
    undefined,
    null,
    releaseNotes,
    confirm
  );

  if (result === releaseNotes) {
    void openUrl(releaseNotesUrl);
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

// 函数重载：单参数调用，默认使用 'info' 类型
export async function showMessage(message: string): Promise<MessageItem | undefined>;

// 函数重载：完整参数调用
export async function showMessage(
  type: 'info' | 'warn' | 'error',
  message: string,
  suppressionKey?: string,
  dontShowAgain?: MessageItem | null,
  ...actions: MessageItem[]
): Promise<MessageItem | undefined>;

// 函数实现
export async function showMessage(
  typeOrMessage: 'info' | 'warn' | 'error' | string,
  messageOrSuppressionKey?: string,
  suppressionKeyOrDontShowAgain?: string | MessageItem | null,
  dontShowAgain?: MessageItem | null,
  ...actions: MessageItem[]
): Promise<MessageItem | undefined> {
  let type: 'info' | 'warn' | 'error';
  let message: string;
  let suppressionKey: string | undefined;
  let finalDontShowAgain: MessageItem | null;

  if (typeof typeOrMessage === 'string' && !['info', 'warn', 'error'].includes(typeOrMessage)) {
    type = 'info';
    message = typeOrMessage;
    suppressionKey = undefined;
    finalDontShowAgain = { title: '不在显示' };
  } else {
    type = typeOrMessage as 'info' | 'warn' | 'error';
    message = messageOrSuppressionKey as string;
    suppressionKey = suppressionKeyOrDontShowAgain as string | undefined;
    finalDontShowAgain = dontShowAgain ?? { title: '不在显示' };
  }

  if (suppressionKey != null && finalDontShowAgain !== null) {
    actions.push(finalDontShowAgain);
  }

  let result: MessageItem | undefined = undefined;
  switch (type) {
    case 'info':
      result = await window.showInformationMessage(message, ...actions);
      break;
    case 'warn':
      result = await window.showWarningMessage(message, ...actions);
      break;
    case 'error':
      result = await window.showErrorMessage(message, ...actions);
      break;
  }

  if (suppressionKey != null && (finalDontShowAgain === null || result === finalDontShowAgain)) {
    Logger.log(
      `ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(finalDontShowAgain)}) 用户请求不再显示`
    );
    await suppressedMessage(suppressionKey);

    if (result === finalDontShowAgain) return undefined;
  }

  Logger.log(
    `ShowMessage(${type}, '${message}', ${suppressionKey}, ${JSON.stringify(finalDontShowAgain)}) returned ${
      result != null ? result.title : result
    }`
  );
  return result;
}

async function suppressedMessage(_suppressionKey: string) {
  // 预留：可更新全局配置以抑制后续显示
}
