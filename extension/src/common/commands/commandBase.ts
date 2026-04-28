import { CommandBase, EditorCommand } from '@orientais/vscode-core';
import type { GlCommands, GlCommandsDeprecated } from '@shared/webviews/constants/constants.commands';
import type { TextEditor } from 'vscode';
import { parseCommandContext } from './commandBase.utils';
import type { CommandContext } from './commandContext';

export { EditorCommand };

export abstract class GlCommandBase extends CommandBase<GlCommands | GlCommandsDeprecated, CommandContext> {
  constructor(command: GlCommands | GlCommands[], deprecated?: GlCommandsDeprecated[]) {
    const cmds = [...(typeof command === 'string' ? [command] : command), ...(deprecated ?? [])];
    super(cmds, parseCommandContext);
  }
}

//#region ActiveEditorCommand

/**
 * 专门用于处理需要与活动编辑器（TextEditor）相关联的命令。
 * 当命令需要访问当前打开的文件或编辑器内容时，例如文件注释、代码格式化等。
 */
export abstract class ActiveEditorCommand extends GlCommandBase {
  protected override readonly contextParsingOptions = { expectsEditor: true };

  protected override preExecute(context: CommandContext, ...args: any[]): Promise<any> {
    return this.execute(context.editor, context.uri, ...args);
  }

  protected override _execute(command: GlCommands | GlCommandsDeprecated, ...args: any[]): any {
    return super._execute(command, undefined, ...args);
  }

  abstract override execute(editor?: TextEditor, ...args: any[]): any;
}

let lastCommand: { command: string; args: any[] } | undefined = undefined;
export function getLastCommand(): { command: string; args: any[] } | undefined {
  return lastCommand;
}

/**
 * 用于处理与活动编辑器相关的命令，并且会缓存最后执行的命令及其参数。
 */
export abstract class ActiveEditorCachedCommand extends ActiveEditorCommand {
  protected override _execute(command: GlCommands | GlCommandsDeprecated, ...args: any[]): any {
    lastCommand = {
      command: command,
      args: args
    };
    return super._execute(command, ...args);
  }

  abstract override execute(editor: TextEditor, ...args: any[]): any;
}
//#endregion
