/**
 * history 模块公共导出入口
 *
 * 用法：
 *   import { useHistory, History, SetValueCommand, ... } from '@webview-core/history';
 *   // 或通过 webview-core 统一入口
 *   import { useHistory } from '@packages/webview-core';
 */

// 核心类
export { History } from './History';
export { Command } from './Command';

// 类型
export type {
  HCommand as ICommand,
  HistoryOptions,
  HistoryState,
  HistoryEvent,
  HistoryEventType,
  HistoryListener
} from './types';

// 内置命令
export { SetValueCommand } from './commands/SetValueCommand';
export { SetValuesCommand } from './commands/SetValuesCommand';
export { AddItemCommand } from './commands/AddItemCommand';
export { RemoveItemCommand } from './commands/RemoveItemCommand';
export { MoveItemCommand } from './commands/MoveItemCommand';
export { BatchCommand } from './commands/BatchCommand';

// Vue3 Composable
export { useHistory, destroySharedHistory } from './useHistory';
export type { UseHistoryOptions, UseHistoryReturn } from './useHistory';

// Pinia Store
export { useHistoryStore } from './stores/useHistoryStore';
