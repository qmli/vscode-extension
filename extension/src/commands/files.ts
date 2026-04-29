import { Logger } from '@orientais/vscode-core';
import type { GlCommands } from '@shared/webviews/constants/constants.commands';
import { TextEditor, Uri, window, workspace } from 'vscode';
import { command } from '@/common/commands/command';
import { GlCommandBase } from '@/common/commands/commandBase';
import { CommandContext } from '@/common/commands/commandContext';
import { Container } from '@/container';

export interface RenameQuickCommitCommandArgs {
  repoPath?: string;
  sha?: string;
  newMessage?: string;
}

@command()
export class RenameFileCommand extends GlCommandBase {
  constructor(private readonly container: Container) {
    super('autosar.file.rename' as GlCommands);
  }

  protected override preExecute(context: CommandContext, args?: RenameQuickCommitCommandArgs): Promise<void> {
    // 这里可以根据 context 提取 sha、repoPath 等参数
    if (context.type === 'viewItem') {
      args = { ...args };
      args.sha = context.node.uri.sha;
    }
    return this.execute(context.editor, args);
  }

  override async execute(editor?: TextEditor, ..._args: any[]): Promise<void> {
    try {
      // 从上下文中获取文件夹路径
      const folderUri = editor?.document.uri;
      if (!folderUri) {
        Logger.warn('无法获取文件夹路径');
        void window.showErrorMessage('无法获取文件夹路径');
        return;
      }

      // 提示用户输入新的文件夹名称
      const currentFolderName = folderUri.path.split('/').pop() ?? '';
      const newFolderName = await window.showInputBox({
        prompt: `重命名文件夹 "${currentFolderName}"`,
        value: currentFolderName,
        placeHolder: '输入新的文件夹名称'
      });

      // 如果用户取消或未输入新名称
      if (!newFolderName || newFolderName.trim() === currentFolderName) {
        Logger.log('重命名操作已取消或未更改名称');
        return;
      }

      // 执行重命名操作
      const newFolderUri = Uri.joinPath(
        folderUri.with({ path: folderUri.path.replace(currentFolderName, newFolderName) })
      );
      await window.showInformationMessage(`重命名文件夹 "${currentFolderName}" 为 "${newFolderName}"...`);

      // 执行重命名操作
      await workspace.fs.rename(folderUri, newFolderUri, { overwrite: false });
      Logger.log(`文件夹从 "${currentFolderName}" 重命名为 "${newFolderName.trim()}"`);
      void window.showInformationMessage(`文件夹 "${currentFolderName}" 已重命名为 "${newFolderName.trim()}"`);
    } catch (error) {
      Logger.error(error, '执行 RenameFolderCommand 时发生错误');
      void window.showErrorMessage('重命名文件夹失败');
    }
  }
}
