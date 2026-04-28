export type TreeViewTypes = 'SWCTree' | 'APTree' | 'BSWTree';

export type TreeViewIds<T extends TreeViewTypes = TreeViewTypes> = `autosar.views.${T}`;

export type TreeViewTypeFromId<T extends TreeViewIds> = T extends `autosar.views.${infer U}` ? U : never;

export type GroupableTreeViewTypes = Extract<TreeViewTypes, 'worktree'>;

export type GroupableTreeViewIds<T extends GroupableTreeViewTypes = GroupableTreeViewTypes> = TreeViewIds<T>;

/**
 * 独立 webview 面板类型
 */
export type WebviewTypes = 'graph' | 'home' | 'editor' | 'settings' | 'merge' | 'example';

/**
 * 统一处理所有 webview 面板类型
 */
export type WebviewIds = `autosar.${WebviewTypes}`;

/**
 * 侧边栏/面板嵌入式 webview 视图类型
 */
export type WebviewViewTypes = 'tree' | 'webview';

/**
 * 侧边栏/面板嵌入式 webview 视图类型
 */
export type WebviewViewIds<T extends WebviewViewTypes = WebviewViewTypes> = `autosar.views.${T}`;

//	统一处理所有视图类型
export type ViewTypes = TreeViewTypes | WebviewViewTypes | WebviewTypes | 'worktree';

export type ViewIds = TreeViewIds | WebviewViewIds;

/**
 * 自定义视图容器分组
 */
export type ViewContainerTypes = 'autosarswc' | 'autosar_terminal';
export type ViewContainerIds = `workbench.view.extension.${ViewContainerTypes}`;

/**
 *  表示 VS Code 内置的（原生的）视图容器类型
 */
export type CoreViewContainerTypes = 'scm';
export type CoreViewContainerIds = `workbench.view.${CoreViewContainerTypes}`;

/**
 * 统一处理所有视图容器类型
 */
export const viewIdsByDefaultContainerId = new Map<ViewContainerIds | CoreViewContainerIds, ViewTypes[]>([
  ['workbench.view.scm', ['worktree']],
  ['workbench.view.extension.autosarswc', ['editor', 'tree']],
  ['workbench.view.extension.autosar_terminal', ['worktree']]
]);

/**
 * 视图节点类型
 */
export type TreeViewNodeTypes = 'file' | 'folder' | 'project' | 'system' | 'editor';
