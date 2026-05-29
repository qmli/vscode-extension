/**
 * RemoveItemCommand —— 从响应式数组中移除元素
 *
 * @example
 * const list = reactive(['a', 'b', 'c']);
 * history.execute(new RemoveItemCommand(list, 1, '删除第2项'));
 */

import { Command } from '../Command';

export class RemoveItemCommand<T = unknown> extends Command {
  override type = 'RemoveItemCommand';
  override updatable = false;

  private readonly array: T[];
  private readonly index: number;
  private readonly removedItem: T;

  /**
   * @param array  目标响应式数组
   * @param index  要删除的元素索引
   * @param name   操作名称
   */
  constructor(array: T[], index: number, name?: string) {
    super();
    if (index < 0 || index >= array.length) {
      throw new RangeError(`RemoveItemCommand: index ${index} out of bounds (length ${array.length})`);
    }
    this.array = array;
    this.index = index;
    this.removedItem = array[index];
    this.name = name ?? 'Remove Item';
  }

  execute(): void {
    this.array.splice(this.index, 1);
  }

  undo(): void {
    this.array.splice(this.index, 0, this.removedItem);
  }

  override toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      name: this.name,
      index: this.index,
      removedItem: this.removedItem
    };
  }
}
