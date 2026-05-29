/**
 * BatchCommand —— 将多条命令组合为一个原子操作
 *
 * 所有子命令作为一个整体被撤销/重做。
 * 子命令按加入顺序 execute，按相反顺序 undo（符合命令模式惯例）。
 *
 * @example
 * const batch = new BatchCommand('同时修改姓名和年龄');
 * batch.add(new SetValueCommand(form, 'name', 'Bob'));
 * batch.add(new SetValueCommand(form, 'age', 20));
 * history.execute(batch);
 *
 * // 也支持链式调用
 * history.execute(
 *   new BatchCommand('初始化表单')
 *     .add(new SetValueCommand(form, 'name', 'Alice'))
 *     .add(new SetValueCommand(form, 'age', 18))
 * );
 */

import { Command } from '../Command';
import type { HCommand } from '../types';

export class BatchCommand extends Command {
  override type = 'BatchCommand';
  override updatable = false;

  private readonly commands: HCommand[] = [];

  constructor(name?: string) {
    super();
    this.name = name ?? 'Batch Command';
  }

  /**
   * 向批次中添加一条命令，返回 this 支持链式调用。
   * 注意：子命令由 BatchCommand 统一管理执行，请勿单独调用子命令的 execute()。
   */
  add(cmd: HCommand): this {
    this.commands.push(cmd);
    return this;
  }

  /** 按加入顺序串行执行所有子命令。 */
  async execute(): Promise<void> {
    for (const cmd of this.commands) {
      await cmd.execute();
    }
  }

  /** 按相反顺序串行撤销所有子命令。 */
  async undo(): Promise<void> {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      await this.commands[i].undo();
    }
  }

  /** 返回子命令数量。 */
  get size(): number {
    return this.commands.length;
  }

  override toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      name: this.name,
      commands: this.commands.map((cmd) => cmd.toJSON?.() ?? { type: cmd.type, name: cmd.name })
    };
  }
}
