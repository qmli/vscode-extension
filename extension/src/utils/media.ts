import { EProjectType } from '@shared/webviews/constants/constants.project';
import { Media } from '@/common/constants/constants';

/**
 * 获取媒体图标
 * @param pType 项目类型
 * @param isOpen 是否展开 默认false
 * @returns 媒体图标
 */
export function getMediaIcon(pType: EProjectType | Media, isOpen: boolean = false): string {
  if (isOpen) {
    if (pType === EProjectType.Application) {
      return Media.applicationOpen;
    } else if (pType === EProjectType.Library) {
      return Media.libraryOpen;
    } else if (pType === EProjectType.Integrated) {
      return Media.integratedOpen;
    }
    return Media.folderOpen;
  }
  if (pType === EProjectType.Application) {
    return Media.application;
  } else if (pType === EProjectType.Library) {
    return Media.library;
  } else if (pType === EProjectType.Integrated) {
    return Media.integrated;
  }
  return Media.folder;
}
