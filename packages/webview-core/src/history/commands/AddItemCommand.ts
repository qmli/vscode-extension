/**
 * AddItemCommand —— 向响应式数组中追加元素
 *
 * @example
 * const list = reactive<string[]>([]);
 * history.execute(new AddItemCommand(list, 'new item', '添加项目'));
 *
 * // 也支持在指定索引插入
 * history.execute(new AddItemCommand(list, 'new item', '插入项目', 2));
 */

import { Command } from '../Command';

export class AddItemCommand<T = unknown> extends Command {
  override type = 'AddItemCommand';
  override updatable = false;

  private readonly array: T[];
  private readonly item: T;
  private readonly index: number;

  /**
   * @param array  目标响应式数组
   * @param item   要添加的元素
   * @param name   操作名称（用于撤销提示）
   * @param index  插入位置（默认追加到末尾）
   */
  constructor(array: T[], item: T, name?: string, index?: number) {
    super();
    const insertAt = index ?? array.length;
    if (insertAt < 0 || insertAt > array.length) {
      throw new RangeError(`AddItemCommand: index ${insertAt} out of bounds (length ${array.length})`);
    }
    this.array = array;
    this.item = item;
    this.index = insertAt;
    this.name = name ?? 'Add Item';
  }

  execute(): void {
    this.array.splice(this.index, 0, this.item);
  }

  undo(): void {
    this.array.splice(this.index, 1);
  }

  override toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      name: this.name,
      index: this.index,
      item: this.item
    };
  }
}
