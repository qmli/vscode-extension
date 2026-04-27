// 已迁移至 @orientais/vscode-core —— 此文件仅作转发
import type { Keys } from '@/common/constants/constants';

export {
  createQuickPickSeparator,
  createQuickPickItemOfT,
  CommandQuickPickItem,
  ActionQuickPickItem
} from '@orientais/vscode-core';
export type { QuickPickSeparator, QuickPickItemOfT, QuickPickResult } from '@orientais/vscode-core';

/**
 * 扩展 VSCode QuickPickItem，支持选中回调和按键回调。
 * 保留在 extension 侧以维持 Keys 类型约束。
 * @internal 仅用于类型声明
 */
declare module 'vscode' {
  interface QuickPickItem {
    /** 选中该项时触发 */
    onDidSelect?(): void;
    /** 在该项上按下按键时触发 */
    onDidPressKey?(key: Keys): Promise<void>;
  }
}
