import vscode, { Uri } from 'vscode';
import { Media } from '@/common/constants/constants';
import { ISoftDataType } from '@/common/constants/constants.isoft';
import { errorManager } from '@/core/errors';
import { getMediaIcon } from '@/utils/media';
import { EProjectType, ProjectType } from '@packages/common/webviews/constants/constants.project';
import type { ProjectInfo } from '@packages/common/webviews/models/projects/projectInfo';
// TODO: 需要实现 Media 和 GlobalState 模块
// import { getMediaIcon, Media } from '../base/common/Media';
// import { GlobalState } from '../core/GlobalState';

export class TreeNode extends vscode.TreeItem {
  date: string;
  uuid: string;
  type: string;
  nodeId: string;
  name: string;
  isDel: boolean;

  constructor(
    readonly projectInfo: ProjectInfo,
    light: Uri,
    dark: Uri,
    icon: string = Media.folder,
    command?: Record<string, string>
  ) {
    super(projectInfo.name, vscode.TreeItemCollapsibleState.None);
    // 存在操作指令
    if (command) {
      this.command = {
        command: command.command,
        title: command.title,
        arguments: [{ id: projectInfo.id, type: projectInfo.type, name: projectInfo.displayName }]
      };
    }
    // 随机ID
    this.id = projectInfo.nodeId;
    // 工程ID
    this.uuid = projectInfo.id;
    // 工程名称
    this.name = projectInfo.name;
    // 节点Id
    this.nodeId = projectInfo.nodeId || '';
    // 类型
    this.type = projectInfo.type || '';
    // 创建时间
    this.date = projectInfo.date;
    // 是否删除
    this.isDel = false;
    // 项目处理
    if (this.projectInfo.pType in ProjectType) {
      const platform = projectInfo.platform ? `[${projectInfo.platform}]` : '';
      this.label =
        this.uuid in ProjectType
          ? this.projectInfo.name
          : // : '[' + getProjectType(projectInfo.pType) + ']' + platform + projectInfo.name;
            platform + projectInfo.name;
      if (!projectInfo.type) {
        // 项目右侧操作标识
        if (!(this.uuid in ProjectType)) {
          this.contextValue = ISoftDataType.Project;
          let folderIcon: string = getMediaIcon(Media.folder, false);
          const errorProjectSet = errorManager.getProjectErrors();
          if (errorProjectSet?.has(this.uuid)) {
            folderIcon = Media.error;
          }
          this.iconPath = {
            light: Uri.joinPath(light, folderIcon),
            dark: Uri.joinPath(dark, folderIcon)
          };
        } else {
          const folderIcon: string = getMediaIcon(projectInfo.pType, false);
          this.iconPath = {
            light: Uri.joinPath(light, folderIcon),
            dark: Uri.joinPath(dark, folderIcon)
          };
        }
        // 是否存在子集
        this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
      }
    }
    const fileEditor = vscode.l10n.t('file.Editor');
    const fileModelFile = vscode.l10n.t('file.ModelFile');
    const fileReference = vscode.l10n.t('file.Reference');
    const fileUnit = vscode.l10n.t('file.Unit');
    if (
      this.type === fileEditor ||
      this.type === fileModelFile ||
      this.type === fileReference ||
      this.type === fileUnit
    ) {
      let iconR = icon;
      const errorProjectSet = errorManager.getProjectErrors();
      if (
        (icon === Media.linkP && errorProjectSet?.has(this.uuid)) ||
        (this.type !== fileReference && errorProjectSet?.has(this.uuid))
      ) {
        iconR = Media.error;
      }
      this.iconPath = { light: Uri.joinPath(light, iconR), dark: Uri.joinPath(dark, iconR) };
    }
    if (this.type === fileUnit && projectInfo.pType !== EProjectType.System) {
      this.contextValue = 'rename';
      this.iconPath = { light: Uri.joinPath(light, icon), dark: Uri.joinPath(dark, icon) };
    }
    if (projectInfo.pType === EProjectType.System) {
      this.contextValue = 'more';
    }
  }
}
