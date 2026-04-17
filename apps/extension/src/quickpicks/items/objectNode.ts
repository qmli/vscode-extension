import type { QuickInputButton, QuickPickItem } from 'vscode';
import * as vscode from 'vscode';
import { generateAdvancedSVGCircle } from '@/utils/ImageUtils';

/**
 * 对象节点 QuickPick 选择项
 * 扩展 QuickPickItem，用于 QuickPick 交互中展示模板对象节点
 *
 * 包含节点层级信息和选中状态，支持：
 * - 多选模式（canSelectMany）
 * - 层级导航（children + onDidTriggerItemButton）
 * - 选中状态传播（active + propagation）
 */
export interface ObjectNodeQuickPickItem extends QuickPickItem {
  id: string;
  parentId: string;
  isNode: boolean;
  isL1Node?: boolean;
  active: boolean;
  children?: ObjectNodeQuickPickItem[];
}

/**
 * 创建下一级子节点导航按钮
 */
export function createNextChildrenButton(): QuickInputButton {
  return {
    iconPath: new vscode.ThemeIcon('chevron-right'),
    tooltip: vscode.l10n.t('button.next')
  };
}

/**
 * 创建子项数量指示按钮（SVG 数字圆形图标）
 */
export function createCountButton(count: number): QuickInputButton {
  const imageDataUrl = generateAdvancedSVGCircle({ number: count, size: 20 });
  return {
    iconPath: vscode.Uri.parse(imageDataUrl),
    tooltip: vscode.l10n.t('object.count', String(count))
  };
}

/**
 * 为 ObjectNodeQuickPickItem 设置 description 以直接显示子项数量
 * QuickInputButton 不支持按钮上渲染文字，因此将数量写入 item.description
 */
export function applyChildCountDescription(item: ObjectNodeQuickPickItem): void {
  if (item.children && item.children.length > 0) {
    item.description = vscode.l10n.t('object.count', String(item.children.length));
  }
}
