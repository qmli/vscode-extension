import type { DebounceOptions } from '../debounce';
import { debounce as _debounce } from '../debounce';

/**
 * 防抖装饰器 - 为类方法添加防抖功能
 *
 * @template F - 函数类型
 * @param {number} wait - 防抖延迟时间（毫秒）
 * @param {DebounceOptions<F>} options - 防抖选项配置
 * @returns {PropertyDescriptor} 返回修改后的属性描述符
 */
export function debounce<F extends (...args: any[]) => ReturnType<F>>(wait: number, options?: DebounceOptions<F>) {
  return (_target: any, key: string, descriptor: PropertyDescriptor & Record<string, any>): PropertyDescriptor => {
    // 检查装饰器是否应用在方法上
    if (typeof descriptor.value !== 'function') {
      throw new Error(`@debounce 装饰器只能用于方法，而不能用于 ${typeof descriptor.value} 类型`);
    }

    const original = descriptor.value; // 保存原始方法

    // 用一个函数替换描述符的值，该函数为每个实例创建原始方法的防抖版本
    descriptor.value = function (...args: any[]) {
      // 实例特定的存储键名
      const debounceKey = `__debounced_${key}`;

      // 如果该实例上不存在防抖函数，则创建一个
      this[debounceKey] ??= _debounce(
        (...innerArgs: any[]) => original.apply(this, innerArgs) as ReturnType<F>,
        wait,
        options
      );

      // 调用该实例的防抖函数
      return this[debounceKey](...args) as ReturnType<F>;
    };

    return descriptor;
  };
}
