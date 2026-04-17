/**
 * 抽象基类，用于实现 Autosar 命令逻辑
 *
 * 主要特点：
 * - 定义 `GlCommandBase` 作为所有 Autosar 命令的基础。
 * - 提供命令注册、上下文解析（`CommandContext`）以及生命周期管理。
 * - 支持扩展命令执行逻辑，例如 `ActiveEditorCommand` 和 `EditorCommand`。
 *
 * 职责：
 * - 命令注册：自动将命令注册到 VS Code 的命令系统中。
 * - 上下文解析：使用 `parseCommandContext` 解析命令上下文（例如活动编辑器、文件 URI）。
 * - 抽象执行逻辑：定义 `execute` 方法，供子类实现具体的命令行为。
 * - 生命周期管理：实现 `Disposable` 接口，确保扩展卸载时正确清理资源。
 */
import type { TextEditor, TextEditorEdit } from 'vscode';
import { commands, Disposable } from 'vscode';
import type { GlCommands, GlCommandsDeprecated } from '@packages/common/webviews/constants/constants.commands';
import { registerCommand } from './command';
import { parseCommandContext } from './commandBase.utils';
import type { CommandContext } from './commandContext';
import type { CommandContextParsingOptions } from './commandContext.utils';

export abstract class GlCommandBase implements Disposable {
  protected readonly contextParsingOptions: CommandContextParsingOptions = { expectsEditor: false };

  private readonly _disposable: Disposable;

  constructor(command: GlCommands | GlCommands[], deprecated?: GlCommandsDeprecated[]) {
    const commands = [...(typeof command === 'string' ? [command] : command), ...(deprecated ?? [])];

    const subscriptions = commands.map((cmd) =>
      registerCommand(cmd, (...args: any[]) => this._execute(cmd, ...args), this)
    );
    this._disposable = Disposable.from(...subscriptions);
  }

  dispose(): void {
    this._disposable.dispose();
  }

  protected preExecute(_context: CommandContext, ...args: any[]): Promise<unknown> {
    return this.execute(...args);
  }

  abstract execute(...args: any[]): any;

  protected _execute(command: GlCommands | GlCommandsDeprecated, ...args: any[]): Promise<unknown> {
    const [context, rest] = parseCommandContext(command, { ...this.contextParsingOptions }, ...args);
    return this.preExecute(context, ...rest);
  }
}
//#region ActiveEditorCommand

/**
 * 专门用于处理需要与活动编辑器（TextEditor）相关联的命令。
 * 当命令需要访问当前打开的文件或编辑器内容时，例如文件注释、代码格式化等。
 */
export abstract class ActiveEditorCommand extends GlCommandBase {
  protected override readonly contextParsingOptions: CommandContextParsingOptions = { expectsEditor: true };

  protected override preExecute(context: CommandContext, ...args: any[]): Promise<any> {
    return this.execute(context.editor, context.uri, ...args);
  }

  protected override _execute(command: GlCommands, ...args: any[]): any {
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
  protected override _execute(command: GlCommands, ...args: any[]): any {
    lastCommand = {
      command: command,
      args: args
    };
    return super._execute(command, ...args);
  }

  abstract override execute(editor: TextEditor, ...args: any[]): any;
}

/**
 * 用于处理与编辑器相关的命令，但不依赖于 GlCommandBase 的上下文解析机制。(	无上下文解析)
 * 直接注册为 VS Code 的 TextEditorCommand。
 */
export abstract class EditorCommand implements Disposable {
  private readonly _disposable: Disposable;

  constructor(command: GlCommands | GlCommands[]) {
    if (!Array.isArray(command)) {
      command = [command];
    }

    const subscriptions = [];
    for (const cmd of command) {
      subscriptions.push(
        commands.registerTextEditorCommand(
          cmd,
          (editor: TextEditor, edit: TextEditorEdit, ...args: any[]) => this.executeCore(cmd, editor, edit, ...args),
          this
        )
      );
    }
    this._disposable = Disposable.from(...subscriptions);
  }

  dispose(): void {
    this._disposable.dispose();
  }

  private executeCore(_command: string, editor: TextEditor, edit: TextEditorEdit, ...args: any[]): any {
    return this.execute(editor, edit, ...args);
  }

  abstract execute(editor: TextEditor, edit: TextEditorEdit, ...args: any[]): any;
}
//#endregion
