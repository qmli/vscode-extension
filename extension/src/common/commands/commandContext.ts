// =============================================================================
//  类型安全 - 为不同类型的命令调用提供类型约束
//  上下文传递 - 封装命令执行时的环境信息
//  参数验证 - 确保命令接收到正确的上下文数据
// =============================================================================
import type { SourceControl, SourceControlResourceGroup, SourceControlResourceState, TextEditor, Uri } from 'vscode';
import type { GlCommands, GlCommandsDeprecated } from '@packages/common/webviews/constants/constants.commands';
import type { TreeNode } from '@packages/common/webviews/viewNode';

export type CommandContext =
  | CommandEditorLineContext
  | CommandScmContext
  | CommandScmGroupsContext
  | CommandScmStatesContext
  | CommandUnknownContext
  | CommandUriContext
  | CommandUrisContext
  | CommandWebViewNodeContext
  | CommandWebViewNodesContext;

export interface CommandContextBase {
  command: GlCommands | GlCommandsDeprecated;
  editor?: TextEditor;
  uri?: Uri;

  readonly args: unknown[];
}

export interface CommandEditorLineContext extends CommandContextBase {
  readonly type: 'editorLine';
  readonly line: number;
  readonly uri: Uri;
}

export interface CommandScmContext extends CommandContextBase {
  readonly type: 'scm';
  readonly scm: SourceControl;
}

export interface CommandScmGroupsContext extends CommandContextBase {
  readonly type: 'scm-groups';
  readonly scmResourceGroups: SourceControlResourceGroup[];
}

export interface CommandScmStatesContext extends CommandContextBase {
  readonly type: 'scm-states';
  readonly scmResourceStates: SourceControlResourceState[];
}

export interface CommandUnknownContext extends CommandContextBase {
  readonly type: 'unknown';
}

export interface CommandUriContext extends CommandContextBase {
  readonly type: 'uri';
}

export interface CommandUrisContext extends CommandContextBase {
  readonly type: 'uris';
  readonly uris: Uri[];
}

export interface CommandWebViewNodeContext extends CommandContextBase {
  readonly type: 'viewItem';
  readonly node: TreeNode;
}

export interface CommandWebViewNodesContext extends CommandContextBase {
  readonly type: 'viewItems';
  readonly node: TreeNode;
  readonly nodes: TreeNode[];
}
