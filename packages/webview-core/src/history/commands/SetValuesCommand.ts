/**
 * SetValuesCommand —— 批量设置对象多个属性值（原子操作）
 *
 * 适合表单"重置"或一次性修改多个字段的场景。
 * 一次撤销即可还原所有字段。
 *
 * @example
 * history.execute(new SetValuesCommand(form, { name: 'Bob', age: 20 }, '批量修改'));
 */

import { Command } from '../Command';

type PartialRecord<T extends object> = Partial<T>;

export class SetValuesCommand<TObj extends object = object> extends Command {
  override type = 'SetValuesCommand';
  override updatable = false;

  private readonly object: TObj;
  private readonly oldValues: PartialRecord<TObj>;
  private readonly newValues: PartialRecord<TObj>;

  constructor(object: TObj, newValues: PartialRecord<TObj>, name?: string) {
    super();
    this.object = object;
    this.newValues = { ...newValues };
    // 快照当前旧值（仅针对即将修改的 key）
    this.oldValues = {} satisfies PartialRecord<TObj>;
    for (const key of Object.keys(newValues) as Array<keyof TObj>) {
      (this.oldValues as TObj)[key] = object[key];
    }
    this.name = name ?? 'Set Values';
  }

  execute(): void {
    for (const key of Object.keys(this.newValues) as Array<keyof TObj>) {
      this.object[key] = (this.newValues as TObj)[key];
    }
  }

  undo(): void {
    for (const key of Object.keys(this.oldValues) as Array<keyof TObj>) {
      this.object[key] = (this.oldValues as TObj)[key];
    }
  }

  override toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      name: this.name,
      oldValues: this.oldValues,
      newValues: this.newValues
    };
  }
}
