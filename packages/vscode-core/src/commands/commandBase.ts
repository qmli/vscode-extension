import type { TextEditor, TextEditorEdit } from 'vscode';
import { commands, Disposable } from 'vscode';

export interface CommandContextParsingOptions {
  expectsEditor: boolean;
}

export interface CommandContextBase<TCommands extends string = string> {
  command: TCommands;
  args: unknown[];
}

/**
 * 泛型命令基类
 *
 * - `TCommands`：命令标识符的字符串联合类型（由 app 层传入）
 * - `TContext`：命令上下文类型（由 app 层传入）
 * - `parseContext`：上下文解析函数，由构造函数注入，保持基类与 app 解耦
 */
export abstract class CommandBase<TCommands extends string, TContext extends CommandContextBase<TCommands>>
  implements Disposable
{
  protected readonly contextParsingOptions: CommandContextParsingOptions = { expectsEditor: false };

  private readonly _disposable: Disposable;

  constructor(
    command: TCommands | TCommands[],
    private readonly _parseContext: (
      command: TCommands,
      options: CommandContextParsingOptions,
      ...args: any[]
    ) => [TContext, any[]]
  ) {
    const cmds = typeof command === 'string' ? [command] : command;
    const subscriptions = cmds.map((cmd) =>
      commands.registerCommand(cmd, (...args: any[]) => this._execute(cmd, ...args), this)
    );
    this._disposable = Disposable.from(...subscriptions);
  }

  dispose(): void {
    this._disposable.dispose();
  }

  protected preExecute(_context: TContext, ...args: any[]): Promise<unknown> {
    return this.execute(...args);
  }

  abstract execute(...args: any[]): any;

  protected _execute(command: TCommands, ...args: any[]): Promise<unknown> {
    const [context, rest] = this._parseContext(command, { ...this.contextParsingOptions }, ...args);
    return this.preExecute(context, ...rest);
  }
}

/**
 * 直接注册 TextEditorCommand，不依赖上下文解析机制。
 * 泛型 TCommands 约束命令标识符，默认为 string 保持向后兼容。
 */
export abstract class EditorCommand<TCommands extends string = string> implements Disposable {
  private readonly _disposable: Disposable;

  constructor(command: TCommands | TCommands[]) {
    const cmds = typeof command === 'string' ? [command] : command;
    const subscriptions = cmds.map((cmd) =>
      commands.registerTextEditorCommand(
        cmd,
        (editor: TextEditor, edit: TextEditorEdit, ...args: any[]) => this._executeCore(cmd, editor, edit, ...args),
        this
      )
    );
    this._disposable = Disposable.from(...subscriptions);
  }

  dispose(): void {
    this._disposable.dispose();
  }

  private _executeCore(_command: string, editor: TextEditor, edit: TextEditorEdit, ...args: any[]): any {
    return this.execute(editor, edit, ...args);
  }

  abstract execute(editor: TextEditor, edit: TextEditorEdit, ...args: any[]): any;
}
