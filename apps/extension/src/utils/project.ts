import { l10n } from 'vscode';
import { EProjectType } from '@/common/constants';

/**
 * 通过项目类型枚举获取分组展示文案。
 */
export function getProjectTypeLabel(type: EProjectType): string {
  switch (type) {
    case EProjectType.LIBRARY:
      return l10n.t('project.type.library');
    case EProjectType.APPLICATION:
      return l10n.t('project.type.application');
    case EProjectType.INTEGRATED:
      return l10n.t('project.type.integrated');
    default:
      return type;
  }
}
