/**
 * 树操作相关常量和映射
 */

import type { GlCommands } from '@shared/webviews/constants/constants.commands';
import type { TreeMoreActionType } from '@shared/webviews/protocol/tree.protocol';

/**
 * 树操作命令映射表
 */
export const treeActionCommandMap: Record<Exclude<TreeMoreActionType, 'cancel' | 'create' | 'more'>, GlCommands> = {
  rename: 'autosar.project.rename',
  delete: 'autosar.project.delete',
  copy: 'autosar.project.copy',
  paste: 'autosar.project.paste',
  cut: 'autosar.project.cut',
  clone: 'autosar.project.clone',
  sync: 'autosar.project.sync',
  link: 'autosar.project.reference',
  unlink: 'autosar.project.unreference',
  'import-json': 'autosar.project.importJson',
  'import-arxml': 'autosar.project.importArxml',
  'import-eb': 'autosar.project.importEb',
  'import-dbc': 'autosar.project.importDbc',
  'import-ldf': 'autosar.project.importLdf',
  'import-odx': 'autosar.project.importOdx',
  'export-project': 'autosar.project.export',
  'export-service': 'autosar.project.exportService',
  'export-arxml': 'autosar.project.exportArxml',
  'model-export': 'autosar.project.export',
  'table-export': 'autosar.project.exportExtract',
  'generate-code': 'autosar.project.genCode',
  'generate-bswmd': 'autosar.project.generateBswmd',
  'make-package': 'autosar.project.makePackage',
  'make-are-runtime': 'autosar.project.makeAreRuntime',
  'push-are-device': 'autosar.project.pushAreDevice',
  'dep-link': 'autosar.project.depLink',
  build: 'autosar.project.build',
  compile: 'autosar.project.compile',
  update: 'autosar.project.update',
  'add-integrated': 'autosar.project.addIntegrated',
  'delete-unit': 'autosar.project.deleteUnit',
  'delete-integrated': 'autosar.project.deleteIntegrated',
  validate: 'autosar.project.validate'
};

/**
 * 树操作标签映射（中文）
 */
export const treeActionLabelMap: Record<Exclude<TreeMoreActionType, 'cancel' | 'create' | 'more'>, string> = {
  rename: '重命名',
  delete: '删除工程',
  copy: '复制',
  paste: '粘贴',
  cut: '剪切',
  clone: '克隆',
  sync: '同步',
  link: '引用工程',
  unlink: '取消引用工程',
  'import-json': '导入 JSON',
  'import-arxml': '导入 ARXML',
  'import-eb': '导入 EB ARXML',
  'import-dbc': '导入 DBC',
  'import-ldf': '导入 LDF',
  'import-odx': '导入 ODX',
  'export-project': '工程导出',
  'export-service': '服务封装导出',
  'export-arxml': '导出 ARXML',
  'model-export': '模型导出',
  'table-export': '萃取导出',
  'generate-code': '生成代码',
  'generate-bswmd': '生成 BSWMD',
  'make-package': '制作车包',
  'make-are-runtime': '生成 ARE Runtime',
  'push-are-device': '推送 ARE 到设备',
  'dep-link': 'DEP 配置关联',
  build: '构建工程',
  compile: '编译工程',
  update: '更新工程',
  'add-integrated': '添加配置单元',
  'delete-unit': '删除配置单元',
  'delete-integrated': '删除集成工程',
  validate: '校验'
};

/**
 * 判断操作是否需要触发工作区增量事件
 */
export function shouldEmitWorkspaceDeltaForAction(action: TreeMoreActionType): boolean {
  return action !== 'link' && action !== 'unlink';
}

/**
 * 判断操作后是否需要重建项目节点
 */
export function shouldRebuildProjectNodeAfterAction(action: TreeMoreActionType): boolean {
  return [
    'create',
    'delete',
    'copy',
    'paste',
    'cut',
    'clone',
    'sync',
    'link',
    'unlink',
    'rename',
    'import-json',
    'import-arxml',
    'import-eb',
    'import-dbc',
    'import-ldf',
    'import-odx',
    'export-project',
    'export-service',
    'export-arxml',
    'model-export',
    'table-export',
    'generate-code',
    'generate-bswmd',
    'make-package',
    'make-are-runtime',
    'push-are-device',
    'dep-link',
    'build',
    'compile',
    'update',
    'add-integrated',
    'delete-unit',
    'delete-integrated',
    'validate'
  ].includes(action);
}

/**
 * 计算工作区项目变更增量
 */
export function computeWorkspaceProjectDelta(
  beforeProjectIds: string[],
  afterProjectIds: string[]
): { removedProjectIds: string[]; addedProjectIds: string[] } {
  const beforeSet = new Set(beforeProjectIds);
  const afterSet = new Set(afterProjectIds);
  return {
    removedProjectIds: beforeProjectIds.filter((id) => !afterSet.has(id)),
    addedProjectIds: afterProjectIds.filter((id) => !beforeSet.has(id))
  };
}
