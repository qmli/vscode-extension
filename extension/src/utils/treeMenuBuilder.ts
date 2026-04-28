/**
 * 树节点菜单构建工具
 */

import type { TreeMoreActionType } from '@shared/webviews/protocol/tree.protocol';
import type { QuickPickItem } from 'vscode';
import { QuickPickItemKind } from 'vscode';
import { EProjectType } from '@/common/constants/constants.project';
import { treeActionLabelMap } from '@/constants/treeActions';

/**
 * 构建操作菜单项
 */
function actionItem(action: Exclude<TreeMoreActionType, 'cancel' | 'create' | 'more'>): QuickPickItem {
  return { label: treeActionLabelMap[action], description: action };
}

/**
 * 根据项目类型构建更多操作菜单项
 */
export function buildTreeMoreActionItems(projectType?: EProjectType, platform?: string): QuickPickItem[] {
  const normalizedPlatform = platform?.trim().toUpperCase();
  const isCp = normalizedPlatform === 'CP';
  const isApFamily = !isCp;

  if (projectType === EProjectType.LIBRARY) {
    if (!isApFamily) {
      return [
        { label: '项目关系', kind: QuickPickItemKind.Separator },
        actionItem('link'),
        actionItem('unlink'),
        actionItem('delete')
      ];
    }
    return [
      { label: '项目关系', kind: QuickPickItemKind.Separator },
      actionItem('link'),
      actionItem('unlink'),
      { label: 'AP已有', kind: QuickPickItemKind.Separator },
      actionItem('delete')
    ];
  }

  if (projectType === EProjectType.APPLICATION) {
    return [
      { label: '项目关系', kind: QuickPickItemKind.Separator },
      actionItem('link'),
      actionItem('unlink'),
      ...(isApFamily
        ? [
            { label: 'AP已有', kind: QuickPickItemKind.Separator },
            actionItem('dep-link'),
            actionItem('generate-code'),
            actionItem('export-project'),
            actionItem('delete')
          ]
        : []),
      { label: 'CP导入', kind: QuickPickItemKind.Separator },
      actionItem('import-json'),
      actionItem('import-arxml'),
      actionItem('import-dbc'),
      actionItem('import-ldf'),
      actionItem('import-odx'),
      { label: 'CP导出/生成', kind: QuickPickItemKind.Separator },
      actionItem('table-export'),
      actionItem('export-project'),
      { label: 'CP校验', kind: QuickPickItemKind.Separator },
      actionItem('validate')
    ];
  }

  if (projectType === EProjectType.INTEGRATED) {
    return [
      { label: '项目关系', kind: QuickPickItemKind.Separator },
      actionItem('link'),
      actionItem('unlink'),
      ...(isApFamily
        ? [
            { label: 'AP已有', kind: QuickPickItemKind.Separator },
            actionItem('dep-link'),
            actionItem('add-integrated'),
            actionItem('make-are-runtime'),
            actionItem('push-are-device'),
            actionItem('export-arxml'),
            actionItem('make-package'),
            actionItem('delete')
          ]
        : []),
      { label: 'CP导入', kind: QuickPickItemKind.Separator },
      actionItem('import-json'),
      actionItem('import-arxml'),
      actionItem('import-eb'),
      { label: 'CP导出/生成', kind: QuickPickItemKind.Separator },
      actionItem('export-service'),
      actionItem('export-project'),
      actionItem('generate-code'),
      actionItem('generate-bswmd'),
      { label: 'CP校验', kind: QuickPickItemKind.Separator },
      actionItem('validate')
    ];
  }

  return [
    { label: '项目关系', kind: QuickPickItemKind.Separator },
    actionItem('link'),
    actionItem('unlink'),
    actionItem('delete')
  ];
}
