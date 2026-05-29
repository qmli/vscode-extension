// =============================================================================
//  WebviewProvider 接口（业务逻辑层）
// =============================================================================
import type { CancellationToken, CustomDocumentBackup, CustomDocumentBackupContext, Disposable, Uri } from 'vscode';
import type { IpcMessage } from '@orientais/shared';
import type { WebviewShowOptions } from './webviewHost';

export type WebviewShowingArgs<T extends unknown[], SerializedState> = T | [{ state: Partial<SerializedState> }] | [];
export interface WebviewProvider<State, SerializedState = State, ShowingArgs extends unknown[] = unknown[]>
  extends Disposable {
  /**
   * 判断是否可以复用 webview 实例
   * @returns 如果应该复用 webview 则返回 `true`，如果不应该复用则返回 `false`，如果可以复用但不理想则返回 `undefined`
   */
  canReuseInstance?(...args: WebviewShowingArgs<ShowingArgs, SerializedState>): boolean | undefined;
  onShowing?(
    loading: boolean,
    options: WebviewShowOptions,
    ...args: WebviewShowingArgs<ShowingArgs, SerializedState>
  ):
    | [boolean, Record<`context.${string}`, string | number | boolean | undefined> | undefined]
    | Promise<[boolean, Record<`context.${string}`, string | number | boolean | undefined> | undefined]>;

  // 生命周期钩子
  onReady?(): void | Promise<void>;
  onRefresh?(force?: boolean): void;
  onReloaded?(): void;
  onMessageReceived?(message: IpcMessage): void;
  onActiveChanged?(active: boolean): void;
  onVisibilityChanged?(visible: boolean): void;
  onFocusChanged?(focused: boolean): void;
  onWindowFocusChanged?(focused: boolean): void;
  /**
   * 【CustomEditorProvider 模式】
   * Ctrl+S 或 VS Code 全局保存时调用。
   *
   * - **成功**（正常返回）：VS Code 自动将文档标记为"已保存"（清除 `●`）
   * - **失败**（抛出异常）：VS Code 向用户展示错误提示，文档保持 dirty 状态不关闭
   *
   * @param cancellation 取消令牌，长时间保存应定期检查是否已取消
   */
  saveDocument?(cancellation: CancellationToken): void | Promise<void>;

  /**
   * 【CustomEditorProvider 模式】
   * "另存为"时调用。
   *
   * @param destination 保存目标 URI
   * @param cancellation 取消令牌
   */
  saveDocumentAs?(destination: Uri, cancellation: CancellationToken): void | Promise<void>;

  /**
   * 【CustomEditorProvider 模式】
   * VS Code 触发"还原文件"操作时调用（如 `workbench.action.revert`）。
   * 实现应将数据重置回最后一次保存的状态，并调用 `host.clearDirty()` 或
   * 让控制器自动通过 IPC 同步。
   *
   * @param cancellation 取消令牌
   */
  revertDocument?(cancellation: CancellationToken): void | Promise<void>;

  /**
   * 【CustomEditorProvider 模式】（可选）
   * VS Code 需要备份文档内容时调用（如热重启前）。
   * 若未实现，控制器提供一个空备份（无热重启恢复能力）。
   *
   * @param context 备份上下文，包含目标 URI
   * @param cancellation 取消令牌
   */
  backupDocument?(
    context: CustomDocumentBackupContext,
    cancellation: CancellationToken
  ): CustomDocumentBackup | Promise<CustomDocumentBackup>;

  /** 初始化的状态对象 */
  includeBootstrap?(): SerializedState | Promise<SerializedState>;

  getState?(): State | Promise<State>;
  setState?(state: State): void | Promise<void>;
  registerCommands?(): Disposable[];
  html: string;
}
