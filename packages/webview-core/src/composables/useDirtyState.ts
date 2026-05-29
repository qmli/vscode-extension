/**
 * useDirtyState — Webview "未保存状态"管理 Composable
 *
 * 封装了与 Extension 之间的 dirty 状态完整双向同步逻辑，同时支持：
 *  - **普通 WebviewPanel 模式**：手动 markDirty / clearDirty，关闭时 Extension 弹对话框
 *  - **CustomEditorProvider 模式**：dirty 由 VS Code 原生接管，Ctrl+S 触发 saveDocument，
 *    关闭时有真正的 Cancel 选项
 *
 * ## 发送方向（Webview → Extension）
 * - `WebviewSetDirtyCommand`  — 通知 Extension 当前 dirty 状态
 * - `WebviewRequestSaveCommand` — 请求 Extension 触发保存（等效 Ctrl+S）
 *
 * ## 接收方向（Extension → Webview）
 * - `DidChangeDirtyStateNotification` — dirty 状态变更通知
 * - `DidSaveDocumentNotification`     — 文档保存成功通知
 *
 * ## 使用示例
 * ```ts
 * const {
 *   isDirty, extensionDirty,
 *   markDirty, clearDirty, requestSave
 * } = useDirtyState({
 *   onSaved: () => console.log('saved!'),
 * });
 *
 * // 数据变更时
 * function onInput() { markDirty(); }
 *
 * // Webview 内保存按钮（CustomEditor 模式下触发原生 Ctrl+S 流程）
 * function onSaveClick() { requestSave(); }
 * ```
 */

import {
  DidChangeDirtyStateNotification,
  DidSaveDocumentNotification,
  WebviewRequestSaveCommand,
  WebviewSetDirtyCommand
} from '@orientais/shared';
import type { Ref } from 'vue';
import { onUnmounted, readonly, ref } from 'vue';
import { useWebviewIPC } from './useWebview';

export interface UseDirtyStateOptions {
  /** 初始 dirty 值，默认 false */
  initialDirty?: boolean;
  /** dirty 状态变化时的回调（本地变化，发送前触发） */
  onChange?: (dirty: boolean) => void;
  /** 收到 DidSaveDocumentNotification（文档保存成功）时的回调 */
  onSaved?: () => void;
  /** 收到 DidChangeDirtyStateNotification（Extension 确认 dirty 状态变更）时的回调 */
  onChangeDirtyState?: (dirty: boolean) => void;
}

export interface UseDirtyStateReturn {
  /** 本地 dirty 状态（发送给 Extension 后立即更新），只读，请通过 markDirty/clearDirty/setDirty 修改 */
  isDirty: Readonly<Ref<boolean>>;
  /** Extension 侧确认的 dirty 状态（收到 DidChangeDirtyStateNotification 后更新，null 表示尚未收到），只读 */
  extensionDirty: Readonly<Ref<boolean | null>>;
  /** 标记为 dirty，发送 WebviewSetDirtyCommand({ dirty: true }) */
  markDirty: () => void;
  /** 清除 dirty，发送 WebviewSetDirtyCommand({ dirty: false }) */
  clearDirty: () => void;
  /** 显式设置 dirty 值（幂等：相同值不重复发送） */
  setDirty: (value: boolean) => void;
  /**
   * 请求 Extension 执行保存（等效于用户按 Ctrl+S）。
   * 发送 WebviewRequestSaveCommand，Extension 触发 VS Code 原生保存流程：
   *  - CustomEditor 模式：调用 provider.saveDocument()，成功后推送 DidSaveDocumentNotification
   *  - 普通模式：workbench.action.files.save（对无 URI 面板通常无实际效果）
   */
  requestSave: () => void;
}

export function useDirtyState(options: UseDirtyStateOptions = {}): UseDirtyStateReturn {
  const { initialDirty = false, onChange, onSaved, onChangeDirtyState } = options;

  const isDirty = ref<boolean>(initialDirty);
  const extensionDirty = ref<boolean | null>(null);

  let ipc: ReturnType<typeof useWebviewIPC> | null = null;
  try {
    ipc = useWebviewIPC();
  } catch {
    console.warn('[useDirtyState] IPC not available, running in standalone mode');
  }

  function setDirty(value: boolean): void {
    if (isDirty.value === value) return;
    isDirty.value = value;
    onChange?.(value);
    try {
      ipc?.sendCommand(WebviewSetDirtyCommand, { dirty: value });
    } catch (err) {
      console.warn('[useDirtyState] sendCommand(SetDirty) failed:', err);
    }
  }

  function markDirty(): void {
    setDirty(true);
  }

  function clearDirty(): void {
    setDirty(false);
  }

  function requestSave(): void {
    try {
      ipc?.sendCommand(WebviewRequestSaveCommand, undefined);
    } catch (err) {
      console.warn('[useDirtyState] sendCommand(RequestSave) failed:', err);
    }
  }

  let disposable: { dispose(): void } | undefined;
  try {
    disposable = ipc?.onMessage((msg) => {
      if (DidChangeDirtyStateNotification.is(msg)) {
        extensionDirty.value = msg.params.dirty;
        onChangeDirtyState?.(msg.params.dirty);
        return;
      }
      if (DidSaveDocumentNotification.is(msg)) {
        isDirty.value = false;
        onSaved?.();
      }
    });
  } catch (err) {
    console.warn('[useDirtyState] onMessage failed:', err);
  }

  onUnmounted(() => {
    disposable?.dispose();
  });

  return {
    isDirty: readonly(isDirty),
    extensionDirty: readonly(extensionDirty),
    markDirty: markDirty,
    clearDirty: clearDirty,
    setDirty: setDirty,
    requestSave: requestSave
  };
}
