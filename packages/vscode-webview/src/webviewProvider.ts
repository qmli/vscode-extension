// =============================================================================
//  WebviewProvider 接口（业务逻辑层）
// =============================================================================
import type { Disposable } from 'vscode';
import type { IpcMessage } from '@packages/common/protocol';
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

  /** 初始化的状态对象 */
  includeBootstrap?(): SerializedState | Promise<SerializedState>;

  getState?(): State | Promise<State>;
  setState?(state: State): void | Promise<void>;
  registerCommands?(): Disposable[];
  html: string;
}
