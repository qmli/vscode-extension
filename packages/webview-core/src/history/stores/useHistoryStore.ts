/**
 * useHistoryStore —— Pinia Store
 *
 * 将 History 的响应式状态提升到 Pinia，方便：
 *  - DevTools 调试（在 Pinia DevTools 中直观查看撤销/重做栈）
 *  - 跨组件共享同一 History 实例和状态（比 provide/inject 更简洁）
 *  - 持久化（配合 pinia-plugin-persistedstate 等插件）
 *
 * ⚠️  此 Store 管理的是「全局共享」History 实例。
 *     若需要组件级独立历史，请直接使用 `useHistory()` composable。
 */

import { defineStore } from 'pinia';
import { computed } from 'vue';
import {
  AddItemCommand,
  BatchCommand,
  MoveItemCommand,
  RemoveItemCommand,
  SetValueCommand,
  SetValuesCommand
} from '../commands';
import { History } from '../History';
import type { HCommand, HistoryOptions } from '../types';

export const useHistoryStore = defineStore('history', () => {
  // ── 单例 History 实例 ──────────────────────────────────────────────────────
  let _history: History | null = null;

  function getOrCreate(options?: HistoryOptions): History {
    if (!_history) {
      _history = new History(options);
    }
    return _history;
  }

  /**
   * 初始化 History 实例（通常在 App 启动时调用一次）。
   * 重复调用时，若实例已存在则忽略。
   */
  function init(options?: HistoryOptions): History {
    return getOrCreate(options);
  }

  /**
   * 获取当前 History 实例（若未初始化则使用默认配置创建）。
   */
  function getInstance(): History {
    return getOrCreate();
  }

  // ── 响应式计算属性（从 history.state 派生）─────────────────────────────────

  const historyState = computed(() => getInstance().state);
  const canUndo = computed(() => historyState.value.canUndo);
  const canRedo = computed(() => historyState.value.canRedo);
  const undoName = computed(() => historyState.value.undoName);
  const redoName = computed(() => historyState.value.redoName);
  const undoCount = computed(() => historyState.value.undoCount);
  const redoCount = computed(() => historyState.value.redoCount);

  // ── 操作方法 ────────────────────────────────────────────────────────────────

  function execute(cmd: HCommand): Promise<void> {
    return getInstance().execute(cmd);
  }

  function undo(): Promise<HCommand | undefined> {
    return getInstance().undo();
  }

  function redo(): Promise<HCommand | undefined> {
    return getInstance().redo();
  }

  function clear(): void {
    getInstance().clear();
  }

  // ── 内置命令快捷方法 ─────────────────────────────────────────────────────────

  function setValue<TObj extends object, TKey extends keyof TObj>(
    object: TObj,
    key: TKey,
    value: TObj[TKey],
    name?: string
  ): Promise<void> {
    return execute(new SetValueCommand(object, key, value, name));
  }

  function setValues<TObj extends object>(object: TObj, values: Partial<TObj>, name?: string): Promise<void> {
    return execute(new SetValuesCommand(object, values, name));
  }

  function addItem<T>(array: T[], item: T, name?: string, index?: number): Promise<void> {
    return execute(new AddItemCommand(array, item, name, index));
  }

  function removeItem<T>(array: T[], index: number, name?: string): Promise<void> {
    return execute(new RemoveItemCommand(array, index, name));
  }

  function moveItem<T>(array: T[], fromIndex: number, toIndex: number, name?: string): Promise<void> {
    return execute(new MoveItemCommand(array, fromIndex, toIndex, name));
  }

  function batch(name: string, fn: (batch: BatchCommand) => void): Promise<void> | void {
    const cmd = new BatchCommand(name);
    fn(cmd);
    if (cmd.size > 0) {
      return execute(cmd);
    }
  }

  return {
    // 实例访问
    init: init,
    getInstance: getInstance,
    // 状态
    canUndo: canUndo,
    canRedo: canRedo,
    undoName: undoName,
    redoName: redoName,
    undoCount: undoCount,
    redoCount: redoCount,
    // 操作
    execute: execute,
    undo: undo,
    redo: redo,
    clear: clear,
    // 内置命令快捷方法
    setValue: setValue,
    setValues: setValues,
    addItem: addItem,
    removeItem: removeItem,
    moveItem: moveItem,
    batch: batch
  };
});

// 导出类型供外部使用
export type { HCommand as ICommand } from '../types';
