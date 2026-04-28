import * as vscode from 'vscode';

/**
 * 项目类型枚举
 * 定义系统支持的所有项目类型
 */
export enum EProjectType {
  Architecture = 'architecture',
  Application = 'application',
  Library = 'library',
  Integrated = 'integrated',
  Unit = 'unit',
  System = 'system'
}

/**
 * 项目类型配置对象
 * 提供项目类型的国际化标签映射
 *
 * 注意：此对象使用函数形式以支持延迟计算国际化字符串
 */
export const ProjectType = Object.freeze({
  /** LIB库工程 */
  library: () => vscode.l10n.t('project.type.library'),
  /** 应用工程 */
  application: () => vscode.l10n.t('project.type.application'),
  /** ECU配置工程 */
  integrated: () => vscode.l10n.t('project.type.integrated'),
  /** 配置单元 */
  unit: () => vscode.l10n.t('project.type.unit')
} as const);
