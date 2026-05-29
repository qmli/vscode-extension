/**
 * Command 抽象基类
 *
 * 所有可撤销命令都应继承此类，并实现 `execute()` 与 `undo()`。
 */

import type { HCommand } from './types';

export abstract class Command implements HCommand {
  id: number = -1;
  type: string = 'Command';
  name: string = 'Unknown Command';
  updatable: boolean = false;

  abstract execute(): void | Promise<void>;
  abstract undo(): void | Promise<void>;

  /**
   * 将 `newCmd` 的状态合并进自身（仅当 updatable = true 时生效）。
   * 子类若支持合并，需覆盖此方法。
   */

  update(_newCmd: HCommand): void {
    // 默认不做任何事，由子类覆盖
  }

  /**
   * 精细化合并守卫，默认返回 true（由子类覆盖以添加额外限制）。
   * History 在 type 匹配后会调用此方法做二次判断。
   */

  canMergeWith(_cmd: HCommand): boolean {
    return true;
  }

  /** 默认序列化实现，子类可覆盖以提供更完整的数据。 */
  toJSON(): Record<string, unknown> {
    return { type: this.type, name: this.name };
  }
}
