/**
 * SetValueCommand —— 设置对象单个属性值
 *
 * 这是最常用的命令，用于追踪表单字段的输入变化。
 * 支持合并：在 mergeWindow 时间窗口内对同一属性的连续修改会合并为一条历史记录。
 *
 * @example
 * const form = reactive({ name: 'Alice', age: 18 });
 * history.execute(new SetValueCommand(form, 'name', 'Bob', '修改姓名'));
 */

import { Command } from '../Command';
import type { HCommand } from '../types';

export class SetValueCommand<TObj extends object = object, TKey extends keyof TObj = keyof TObj> extends Command {
  override type = 'SetValueCommand';
  override updatable = true;

  // protected：供 canMergeWith 跨实例比对
  protected readonly object: TObj;
  protected readonly attributeName: TKey;
  private readonly oldValue: TObj[TKey];
  private newValue: TObj[TKey];

  /**
   * @param object         目标响应式对象
   * @param attributeName  要设置的属性名
   * @param newValue       新值
   * @param name           操作名称（用于撤销提示）
   * @param oldValue       显式指定旧值；若省略则从 object[attributeName] 读取。
   *                       当与 v-model + @change 配合使用时，@change 触发前 v-model
   *                       已更新对象，此时需由调用方（如 trackInput）传入正确的旧值。
   */
  constructor(object: TObj, attributeName: TKey, newValue: TObj[TKey], name?: string, oldValue?: TObj[TKey]) {
    super();
    this.object = object;
    this.attributeName = attributeName;
    this.oldValue = oldValue !== undefined ? oldValue : object[attributeName];
    this.newValue = newValue;
    this.name = name ?? `Set ${String(attributeName)}`;
  }

  execute(): void {
    this.object[this.attributeName] = this.newValue;
  }

  undo(): void {
    this.object[this.attributeName] = this.oldValue;
  }

  /**
   * 精细化合并守卫：必须是同一对象的同一属性才允许合并，
   * 否则 History 会压入新条目。
   */
  override canMergeWith(cmd: HCommand): boolean {
    const other = cmd as SetValueCommand<TObj, TKey>;
    return other.object === this.object && other.attributeName === this.attributeName;
  }

  /**
   * 将后续同属性的修改合并进来：
   * 更新 newValue 并立即应用，这样撤销时仍能回到最初的 oldValue。
   */
  override update(newCmd: HCommand): void {
    const cmd = newCmd as SetValueCommand<TObj, TKey>;
    this.newValue = cmd.newValue;
    this.execute();
  }

  override toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      name: this.name,
      attributeName: String(this.attributeName),
      oldValue: this.oldValue,
      newValue: this.newValue
    };
  }
}
