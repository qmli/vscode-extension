/**
 * MoveItemCommand —— 在响应式数组中移动元素（拖拽排序）
 *
 * @example
 * const list = reactive(['a', 'b', 'c', 'd']);
 * // 将索引 3 的元素移动到索引 1
 * history.execute(new MoveItemCommand(list, 3, 1, '拖拽排序'));
 */

import { Command } from '../Command';

export class MoveItemCommand<T = unknown> extends Command {
  override type = 'MoveItemCommand';
  override updatable = false;

  private readonly array: T[];
  private readonly fromIndex: number;
  private readonly toIndex: number;

  constructor(array: T[], fromIndex: number, toIndex: number, name?: string) {
    super();
    const len = array.length;
    if (fromIndex < 0 || fromIndex >= len) {
      throw new RangeError(`MoveItemCommand: fromIndex ${fromIndex} out of bounds (length ${len})`);
    }
    if (toIndex < 0 || toIndex >= len) {
      throw new RangeError(`MoveItemCommand: toIndex ${toIndex} out of bounds (length ${len})`);
    }
    this.array = array;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
    this.name = name ?? `Move Item (${fromIndex} → ${toIndex})`;
  }

  execute(): void {
    MoveItemCommand.move(this.array, this.fromIndex, this.toIndex);
  }

  undo(): void {
    MoveItemCommand.move(this.array, this.toIndex, this.fromIndex);
  }

  private static move<T>(array: T[], from: number, to: number): void {
    if (from === to) return;
    const [item] = array.splice(from, 1);
    array.splice(to, 0, item);
  }

  override toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      name: this.name,
      fromIndex: this.fromIndex,
      toIndex: this.toIndex
    };
  }
}
