// =============================================================================
//  命令注册 - 提供 VS Code 命令注册时使用的 ID
//  类型约束 - GlCommands 类型确保只能调用已定义的命令
//  中心化管理 - 所有命令 ID 集中定义，避免重复和冲突
// =============================================================================
import type {
  CoreViewContainerIds,
  TreeViewIds,
  TreeViewTypes,
  ViewContainerIds,
  ViewIds,
  WebviewTypes,
  WebviewViewTypes
} from '@shared/webviews/constants/constants.views';
import type { ContributedCommands, ContributedPaletteCommands } from './constants.commands.generated';

export const actionCommandPrefix = 'autosar.action.';

/**
 * 用是管理已弃用命令的类型定义，确保向后兼容性的同时为用户提供平滑的迁移路径。
 */
export type GlCommandsDeprecated = '';

type InternalCommands =
  | 'autosar.file.rename'
  | 'autosar.file.move'
  | 'autosar.file.copy'
  | 'autosar.file.delete'
  | 'autosar.file.save' // I_SOFT_GLOBAL.COMMAND.SAVE
  | 'autosar.tree.project.create' //新建项目 APP_SECTION_TREE_VIEW_COMMAND_LEAF_CONTEXTMENU isoft-orientais-studio.cmd.createProject
  | 'autosar.tree.project.createSWC' // 新建SWC isoft-orientais-studio.cmd.createSWC
  // | 'autosar.tree.project.link' //项目关联 APP_SECTION_TREE_VIEW_COMMAND_PROJECT_LINK isoft-orientais-studio.cmd.projectLink
  | 'autosar.tree.project.refresh' //刷新 APP_SECTION_TREE_VIEW_COMMAND_REFRESH isoft-orientais-studio.cmd.refresh
  | 'autosar.tree.project.node.refresh' // 项目节点刷新 APP_SECTION_TREE_VIEW_COMMAND_PROJECT_REFERENCES_DELTA isoft-orientais-studio.cmd.projectReferencesDelta
  // | 'autosar.tree.leaf.rename' // 树节点重命名 APP_SECTION_TREE_VIEW_COMMAND_LEAF_RENAME
  | 'autosar.task.switch' // 任务管理面板 SWITCH: 'SWITCH'
  | 'autosar.task.handler' //  HANDLER: 'HANDLER'
  | 'autosar.workspace' //  AppWorkspaceConfig.Command.WORKSPACE: 'isoft-orientais-studio.cmd.workspace'
  | 'autosar.workspace.switch' //  SWITCH_WORKSPACE: 'isoft-orientais-studio.cmd.workspace.switch'
  // ================= 树节点右键菜单命令 =================
  | 'autosar.tree.rename' // 重命名节点
  | 'autosar.tree.delete' // 删除节点
  | 'autosar.tree.copy' // 复制节点
  | 'autosar.tree.paste' // 粘贴节点
  | 'autosar.tree.clone' // 克隆节点
  | 'autosar.tree.toggleAll' // 切换展开全部
  | 'autosar.tree.sortAsc' // 按名称升序排序
  | 'autosar.tree.sortDesc' // 按名称降序排序
  | 'autosar.tree.sortManual' // 手动排序
  | 'autosar.tree.link' // 引用工程
  | 'autosar.tree.unlink' // 取消引用工程
  | 'autosar.tree.createNode' // 创建节点
  // ================= 通知相关命令（主题、语言、配置、全局广播） =================
  | 'autosar.theme.getCurrent' // 获取当前主题
  | 'autosar.theme.getAvailable' // 获取可用主题列表
  | 'autosar.theme.change' // 切换主题
  | 'autosar.language.getCurrent' // 获取当前语言
  | 'autosar.language.getAvailable' // 获取可用语言列表
  | 'autosar.language.getLocalizedString' // 获取本地化字符串
  | 'autosar.language.change' // 切换语言
  | 'autosar.configuration.get' // 获取配置信息
  | 'autosar.configuration.update' // 更新配置信息
  | 'autosar.configuration.watch' // 监听配置变化
  | 'autosar.broadcast.subscribe' // 订阅全局广播频道
  | 'autosar.broadcast.unsubscribe' // 取消订阅全局广播频道
  | 'autosar.broadcast.send' // 发送全局广播消息
  | 'autosar.merge.show' // 打开合并视图
  | 'autosar.merge.close'; // 关闭合并视图

type InternalHomeWebviewViewCommands = 'autosar.views.home' | 'autosar.example';

type InternalModelCommands =
  | 'autosar.model.editorN' // 模型N编辑 MODEL_EDIT_N: 'isoft-orientais-studio.cmd.model.edit.n',
  | 'autosar.model.editorA' // 模型A编辑  MODEL_EDIT_A: 'isoft-orientais-studio.cmd.model.edit.a',
  | 'autosar.model.list' // List视图 DESIGNER_LIST: 'AppModelDesignerView.command.designer.list'
  | 'autosar.model.search' // 搜索 SEARCH: 'AppModelDesignerView.command.designer.search',
  | 'autosar.model.searchHistory' // 搜索历史  SEARCH_HISTORY: 'AppModelDesignerView.command.designer.search.history'
  | 'autosar.model.dummyNode'; // 影子节点   DUMMY_NODE: 'AppModelDesignerView.command.designer.dummy.node'
type InternalProjectCommands =
  | 'autosar.project.create' // AppProjectConfig.Command.PROJECT
  | 'autosar.project.open' // 打开项目
  | 'autosar.project.close' // 关闭项目
  | 'autosar.project.delete'
  | 'autosar.project.rename' // AppProjectConfig.Command.PROJECT_RENAME
  | 'autosar.project.copy' // 工程复制（项目树更多操作）
  | 'autosar.project.paste' // 工程粘贴（项目树更多操作）
  | 'autosar.project.clone' // 工程克隆（项目树更多操作）
  | 'autosar.project.cut' // 工程剪切（项目树更多操作）
  | 'autosar.project.sync' // 工程同步（项目树更多操作）
  | 'autosar.project.architecture' // AppProjectConfig.Command.PROJECT_ARCHITECTURE
  | 'autosar.project.application' // AppProjectConfig.Command.PROJECT_APPLICATION;
  | 'autosar.project.library' // AppProjectConfig.Command.PROJECT_LIBRARY;
  | 'autosar.project.integrated' // AppProjectConfig.Command.PROJECT_INTEGRATED;
  | 'autosar.project.moreAction' // AppProjectConfig.Command.PROJECT_MORE_ACTION,
  | 'autosar.project.reference' // AppProjectConfig.Command.PROJECT_REFERENCE,
  | 'autosar.project.unreference' // AppProjectConfig.Command.PROJECT_UNREFERENCE,
  | 'autosar.project.genCode' // AppProjectConfig.Command.PROJECT_GEN_CODE,
  | 'autosar.project.generateBswmd'
  | 'autosar.project.exportArxml' // AppProjectConfig.Command.PROJECT_EXPORT_ARXML 导出 ARXML 文件
  | 'autosar.project.makePackage' // AppProjectConfig.Command.PROJECT_MAKE_PACKAGE 制作包
  | 'autosar.project.makeAreRuntime' // AppProjectConfig.Command.PROJECT_MAKE_ARE_RUNTIME 制作 ARE Runtime
  | 'autosar.project.pushAreDevice' // AppProjectConfig.Command.PROJECT_PUSH_ARE_DEVICE 推送 ARE 到设备
  | 'autosar.project.deleteProject' // AppProjectConfig.Command.PROJECT_DELETE_PROJECT 删除项目
  | 'autosar.project.deleteIntegrated' // AppProjectConfig.Command.PROJECT_DELETE_INTEGRATED 删除集成项
  | 'autosar.project.deleteUnit' // AppProjectConfig.Command.PROJECT_DELETE_UNIT // 删除单元
  | 'autosar.project.settings' // 项目设置
  | 'autosar.project.export' // 导出项目 AppProjectConfig.Command.EXPORT_PRJ 'isoft-orientais-studio.cmd.project.export.prj'
  | 'autosar.project.import' // 导入项目 AppProjectConfig.Command.IMPORT_PRJ
  | 'autosar.project.exportService' // AppProjectConfig.Command.EXPORT_SVC //服务封装
  | 'autosar.project.exportExtract' // AppProjectConfig.Command.EXPORT_EXT //萃取导出
  | 'autosar.project.importJson' // 导入 JSON AppProjectConfig.Command.IMPORT_JSON
  | 'autosar.project.importArxml' // 导入 ARXML AppProjectConfig.Command.IMPORT_ARXML
  | 'autosar.project.importEb' //  AppProjectConfig.Command.IMPORT_EB 导入 EB ARXML
  | 'autosar.project.importDbc'
  | 'autosar.project.importLdf'
  | 'autosar.project.importOdx'
  | 'autosar.project.validate' // 工程验证 AppProjectConfig.Command.PROJECT_VALIDATE
  | 'autosar.project.build' // AppProjectConfig.Command.BUILD_PROJECT
  | 'autosar.project.compile' // AppProjectConfig.Command.COMPILE_PROJECT
  | 'autosar.project.update' // AppProjectConfig.Command.UPDATE_PROJECT
  | 'autosar.project.addIntegrated'
  | 'autosar.project.node.create'
  | 'autosar.project.node.delete'
  | 'autosar.project.node.copy'
  | 'autosar.project.node.paste'
  | 'autosar.project.node.clone'
  | 'autosar.project.node.cut'
  | 'autosar.project.node.sync'
  | 'autosar.project.depLink' // AppProjectConfig.Command.DEP_PROJECT_LINK
  | 'autosar.project.depConsistency' // AppProjectConfig.Command.DEP_PROJECT_CONSISTENCY 'isoft-orientais-studio.cmd.project.dep.project.depDesignConsistency',
  | 'autosar.project.addNode'; // AppProjectConfig.Command.ADD_NODE 'isoft-orientais-studio.cmd.project.addNode'

type InternalGlCommands =
  | `autosar.action.${string}`
  | InternalCommands
  | InternalHomeWebviewViewCommands
  | InternalModelCommands
  | InternalProjectCommands;

export type GlCommands = ContributedCommands | InternalGlCommands | ExternalExecutableCommands;
export type GlPaletteCommands = ContributedPaletteCommands;

type ExternalExecutableCommands =
  | 'autosar.executeExternal'
  | 'autosar.manageExternal'
  | 'autosar.external.start'
  | 'autosar.external.stop'
  | 'autosar.external.restart'
  | 'autosar.external.execute';
/**
 * VS Code 核心命令的类型集合,用于在 autosar 扩展中安全地调用 VS Code 内置命令。
 */
export type CoreCommands =
  | 'cursorMove'
  | 'editor.action.showHover'
  | 'editor.action.showReferences'
  | 'editor.action.webvieweditor.showFind'
  | 'editorScroll'
  | 'list.collapseAllToFocus'
  | 'openInIntegratedTerminal'
  | 'openInTerminal'
  | 'revealFileInOS'
  | 'revealInExplorer'
  | 'revealLine'
  | 'setContext'
  | 'vscode.open'
  | 'vscode.openFolder'
  | 'vscode.openWith'
  | 'vscode.changes'
  | 'vscode.diff'
  | 'vscode.executeCodeLensProvider'
  | 'vscode.executeDocumentSymbolProvider'
  | 'vscode.moveViews'
  | 'vscode.previewHtml'
  | 'workbench.action.closeActiveEditor'
  | 'workbench.action.closeAllEditors'
  | 'workbench.action.closePanel'
  | 'workbench.action.closeWindow'
  | 'workbench.action.focusRightGroup'
  | 'workbench.action.nextEditor'
  | 'workbench.action.newGroupRight'
  | 'workbench.action.openSettings'
  | 'workbench.action.openWalkthrough'
  | 'workbench.action.toggleMaximizedPanel'
  | 'workbench.extensions.action.switchToRelease'
  | 'workbench.extensions.installExtension'
  | 'workbench.extensions.uninstallExtension'
  | 'workbench.files.action.focusFilesExplorer'
  | 'workbench.view.explorer'
  | 'workbench.view.scm'
  | `${ViewContainerIds | CoreViewContainerIds}.resetViewContainerLocation`
  | `${ViewIds}.${'focus' | 'open' | 'removeView' | 'resetViewLocation' | 'toggleVisibility'}`;

type ExtractSuffix<Prefix extends string, U> = U extends `${Prefix}${infer V}` ? V : never;
type FilterCommands<Prefix extends string, U, Suffix extends string = ''> = U extends `${Prefix}${infer V}${Suffix}`
  ? U extends `${Prefix}${V}${Suffix}`
    ? U
    : never
  : never;

export type TreeViewCommands =
  | FilterCommands<`autosar.views.${TreeViewTypes}`, GlCommands>
  | FilterCommands<`autosar.`, GlCommands, ':views'>;

export type TreeViewCommandsByViewId<T extends TreeViewIds> = FilterCommands<T, GlCommands>;
export type TreeViewCommandsByViewType<T extends TreeViewTypes> = FilterCommands<`autosar.views.${T}.`, GlCommands>;
export type TreeViewCommandSuffixesByViewType<T extends TreeViewTypes> = ExtractSuffix<
  `autosar.views.${T}.`,
  TreeViewCommandsByViewType<T>
>;

/**
 * WebviewCommands 是一个类型集合，包含了所有与 Webview 相关的命令。
 */
export type WebviewCommands =
  | FilterCommands<`autosar.${WebviewTypes}`, GlCommands>
  | FilterCommands<'autosar.', GlCommands, `:${WebviewTypes}`>;
export type WebviewViewCommands =
  | FilterCommands<`autosar.views.${WebviewViewTypes}`, GlCommands>
  | FilterCommands<'autosar.views.', GlCommands, `:${WebviewViewTypes}`>;
