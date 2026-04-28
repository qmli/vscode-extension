/**
 * 通知管理器 - 负责协调所有webview的变更通知
 *
 * 主要功能：
 * - 统一管理所有webview的通知发送
 * - 支持主题、语言、配置等全局变更通知
 * - 提供广播机制，支持自定义通知
 * - 管理webview的订阅状态
 */

import { Logger } from '@orientais/vscode-core/logger';
import type { WebviewHost } from '@orientais/vscode-webview/webviewHost';
import type { WebviewsController } from '@orientais/vscode-webview/webviewsController';
import type { AppThemeType, LanguageInfo } from '@shared/global.protocol';
import {
  DidChangeLanguageNotification,
  DidChangeThemeNotification,
  GlobalBroadcastNotification
} from '@shared/global.protocol';
import { DidChangeConfigurationNotification } from '@shared/setting.protocol';
import type { WebviewIds, WebviewViewIds } from '@shared/webviews/constants/constants.views';
import type { Disposable, Event } from 'vscode';
import { EventEmitter, window, workspace } from 'vscode';
import type { Container } from '@/container';

/**
 * 通知类型枚举
 */
export enum NotificationType {
  Theme = 'theme',
  Language = 'language',
  Configuration = 'configuration',
  GlobalBroadcast = 'globalBroadcast'
}

/**
 * 通知订阅信息
 */
export interface NotificationSubscription {
  webviewId: string;
  instanceId?: string;
  channels: string[];
  timestamp: number;
}

/**
 * 通知管理器配置
 */
export interface NotificationManagerConfig {
  /** 是否启用主题变更通知 */
  enableThemeNotifications: boolean;
  /** 是否启用语言变更通知 */
  enableLanguageNotifications: boolean;
  /** 是否启用配置变更通知 */
  enableConfigurationNotifications: boolean;
  /** 是否启用全局广播通知 */
  enableGlobalBroadcast: boolean;
  /** 通知发送超时时间（毫秒） */
  notificationTimeout: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 通知发送结果
 */
export interface NotificationResult {
  success: boolean;
  webviewId: string;
  instanceId?: string;
  error?: string;
  timestamp: number;
}

/**
 * 通知管理器类
 */
export class NotificationManager implements Disposable {
  private readonly _disposables: Disposable[] = [];
  private readonly _subscriptions = new Map<string, NotificationSubscription[]>();
  private readonly _webviewHosts = new Map<string, WebviewHost<any>>();
  private readonly _onDidNotificationSent = new EventEmitter<NotificationResult>();
  private readonly _onDidSubscriptionChanged = new EventEmitter<{ webviewId: string; subscribed: boolean }>();

  private _config: NotificationManagerConfig = {
    enableThemeNotifications: true,
    enableLanguageNotifications: true,
    enableConfigurationNotifications: true,
    enableGlobalBroadcast: true,
    notificationTimeout: 5000,
    maxRetries: 3
  };

  constructor(
    private readonly container: Container,
    private readonly webviewsController: WebviewsController
  ) {
    this.initialize();
  }

  /**
   * 通知发送完成事件
   */
  get onDidNotificationSent(): Event<NotificationResult> {
    return this._onDidNotificationSent.event;
  }

  /**
   * 订阅状态变更事件
   */
  get onDidSubscriptionChanged(): Event<{ webviewId: string; subscribed: boolean }> {
    return this._onDidSubscriptionChanged.event;
  }

  /**
   * 初始化通知管理器
   */
  private initialize(): void {
    // 监听VS Code主题变更
    this._disposables.push(
      window.onDidChangeActiveColorTheme(async (e) => {
        if (this._config.enableThemeNotifications) {
          await this.notifyThemeChanged(e.kind as unknown as AppThemeType);
        }
      })
    );

    // 监听VS Code语言变更
    this._disposables.push(
      workspace.onDidChangeConfiguration(async (e) => {
        if (this._config.enableLanguageNotifications && e.affectsConfiguration('locale')) {
          const locale = workspace.getConfiguration().get<string>('locale');
          if (locale) {
            await this.notifyLanguageChanged({
              code: locale,
              displayName: locale,
              isCurrent: true
            });
          }
        }
      })
    );

    // 监听配置变更
    this._disposables.push(
      workspace.onDidChangeConfiguration(async (e) => {
        if (this._config.enableConfigurationNotifications) {
          await this.notifyConfigurationChanged(e);
        }
      })
    );

    Logger.log('通知管理器已初始化');
  }

  /**
   * 注册webview主机
   */
  registerWebviewHost(webviewId: WebviewIds | WebviewViewIds, host: WebviewHost<any>): void {
    this._webviewHosts.set(webviewId, host);
    Logger.log(`Webview 主机已注册: ${webviewId}`);
  }

  /**
   * 注销webview主机
   */
  unregisterWebviewHost(webviewId: WebviewIds | WebviewViewIds): void {
    this._webviewHosts.delete(webviewId);
    this._subscriptions.delete(webviewId);
    Logger.log(`注销webview主机: ${webviewId}`);
  }

  /**
   * 订阅通知频道
   */
  subscribe(webviewId: WebviewIds | WebviewViewIds, instanceId: string | undefined, channels: string[]): void {
    const subscription: NotificationSubscription = {
      webviewId: webviewId,
      instanceId: instanceId,
      channels: channels,
      timestamp: Date.now()
    };

    const existing = this._subscriptions.get(webviewId) || [];
    const filtered = existing.filter((sub) => sub.instanceId !== instanceId);
    filtered.push(subscription);

    this._subscriptions.set(webviewId, filtered);
    this._onDidSubscriptionChanged.fire({ webviewId: webviewId, subscribed: true });

    Logger.log(`Webview ${webviewId} subscribed to channels: ${channels.join(', ')}`);
  }

  /**
   * 取消订阅通知频道
   */
  unsubscribe(webviewId: WebviewIds | WebviewViewIds, instanceId?: string): void {
    if (instanceId) {
      const existing = this._subscriptions.get(webviewId) || [];
      const filtered = existing.filter((sub) => sub.instanceId !== instanceId);
      this._subscriptions.set(webviewId, filtered);
    } else {
      this._subscriptions.delete(webviewId);
    }

    this._onDidSubscriptionChanged.fire({ webviewId: webviewId, subscribed: false });
    Logger.log(`Webview ${webviewId} unsubscribed from notifications`);
  }

  /**
   * 通知主题变更
   */
  async notifyThemeChanged(theme: AppThemeType): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const [webviewId, subscriptions] of this._subscriptions) {
      const host = this._webviewHosts.get(webviewId);
      if (!host) continue;

      for (const subscription of subscriptions) {
        if (subscription.channels.includes(NotificationType.Theme)) {
          try {
            const success = await this.sendNotificationWithTimeout(host, DidChangeThemeNotification, { theme: theme });

            results.push({
              success: success,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              timestamp: Date.now()
            });
          } catch (error) {
            results.push({
              success: false,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now()
            });
          }
        }
      }
    }

    this._onDidNotificationSent.fire(results[0] || { success: false, webviewId: '', timestamp: Date.now() });
    Logger.log(`Theme change notification sent to ${results.length} webviews`);

    return results;
  }

  /**
   * 通知语言变更
   */
  async notifyLanguageChanged(language: LanguageInfo): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const [webviewId, subscriptions] of this._subscriptions) {
      const host = this._webviewHosts.get(webviewId);
      if (!host) continue;

      for (const subscription of subscriptions) {
        if (subscription.channels.includes(NotificationType.Language)) {
          try {
            const success = await this.sendNotificationWithTimeout(host, DidChangeLanguageNotification, {
              language: language
            });

            results.push({
              success: success,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              timestamp: Date.now()
            });
          } catch (error) {
            results.push({
              success: false,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now()
            });
          }
        }
      }
    }

    this._onDidNotificationSent.fire(results[0] || { success: false, webviewId: '', timestamp: Date.now() });
    Logger.log(`Language change notification sent to ${results.length} webviews`);

    return results;
  }

  /**
   * 通知配置变更
   */
  async notifyConfigurationChanged(configurationChangeEvent: any): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const [webviewId, subscriptions] of this._subscriptions) {
      const host = this._webviewHosts.get(webviewId);
      if (!host) continue;

      for (const subscription of subscriptions) {
        if (subscription.channels.includes(NotificationType.Configuration)) {
          try {
            // 提取变更的配置键
            const affectedKeys = this.extractAffectedConfigurationKeys(configurationChangeEvent);

            for (const key of affectedKeys) {
              const value = workspace.getConfiguration().get(key);
              const success = await this.sendNotificationWithTimeout(host, DidChangeConfigurationNotification, {
                key: key,
                value: value,
                source: 'local'
              });

              results.push({
                success: success,
                webviewId: webviewId,
                instanceId: subscription.instanceId,
                timestamp: Date.now()
              });
            }
          } catch (error) {
            results.push({
              success: false,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now()
            });
          }
        }
      }
    }

    this._onDidNotificationSent.fire(results[0] || { success: false, webviewId: '', timestamp: Date.now() });
    Logger.log(`Configuration change notification sent to ${results.length} webviews`);

    return results;
  }

  /**
   * 发送全局广播通知
   */
  async broadcast(channel: string, payload?: unknown): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const [webviewId, subscriptions] of this._subscriptions) {
      const host = this._webviewHosts.get(webviewId);
      if (!host) continue;

      for (const subscription of subscriptions) {
        if (subscription.channels.includes(channel)) {
          try {
            const success = await this.sendNotificationWithTimeout(host, GlobalBroadcastNotification, {
              channel: channel,
              payload: payload
            });

            results.push({
              success: success,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              timestamp: Date.now()
            });
          } catch (error) {
            results.push({
              success: false,
              webviewId: webviewId,
              instanceId: subscription.instanceId,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now()
            });
          }
        }
      }
    }

    this._onDidNotificationSent.fire(results[0] || { success: false, webviewId: '', timestamp: Date.now() });
    Logger.debug(`广播通知已发送到 ${results.length} 个 webview，在频道: ${channel}`);

    return results;
  }

  /**
   * 发送通知并处理超时
   */
  private async sendNotificationWithTimeout<T>(
    host: WebviewHost<any>,
    notificationType: any,
    params: T
  ): Promise<boolean> {
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Notification timeout')), this._config.notificationTimeout);
    });

    const notificationPromise = host.notify(notificationType, params);

    try {
      return await Promise.race([notificationPromise, timeoutPromise]);
    } catch (error) {
      Logger.error(error, `Failed to send notification to webview ${host.id}`);
      return false;
    }
  }

  /**
   * 提取受影响的配置键
   */
  private extractAffectedConfigurationKeys(_configurationChangeEvent: any): string[] {
    // 这里需要根据实际的ConfigurationChangeEvent结构来实现
    // 暂时返回一个示例实现
    return ['editor.theme', 'workbench.colorTheme'];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<NotificationManagerConfig>): void {
    this._config = { ...this._config, ...config };
    Logger.log('NotificationManager config updated', config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): NotificationManagerConfig {
    return { ...this._config };
  }

  /**
   * 获取订阅统计信息
   */
  getSubscriptionStats(): { totalWebviews: number; totalSubscriptions: number; channels: string[] } {
    const channels = new Set<string>();
    let totalSubscriptions = 0;

    for (const subscriptions of this._subscriptions.values()) {
      totalSubscriptions += subscriptions.length;
      for (const subscription of subscriptions) {
        subscription.channels.forEach((channel) => channels.add(channel));
      }
    }

    return {
      totalWebviews: this._subscriptions.size,
      totalSubscriptions: totalSubscriptions,
      channels: Array.from(channels)
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this._disposables.forEach((d) => d.dispose());
    this._subscriptions.clear();
    this._webviewHosts.clear();
    this._onDidNotificationSent.dispose();
    this._onDidSubscriptionChanged.dispose();
    Logger.log('NotificationManager disposed');
  }
}
