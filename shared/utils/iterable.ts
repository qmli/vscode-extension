/**
 * 可迭代对象工具函数库
 *
 * 本文件提供了一系列用于处理可迭代对象和迭代器的实用函数，
 * 包括但不限于：分块、过滤、映射、分组、聚合、排序等操作。
 * 这些函数采用惰性求值的方式，通过生成器函数实现高效的内存使用。
 *
 * 主要功能分类：
 * - 分块与切片：chunk, chunkByStringLength, slice, take, skip
 * - 过滤与映射：filter, map, flatMap, filterMap
 * - 连接与合并：concat, union, flatten
 * - 查找与测试：find, findIndex, has, some, every
 * - 分组与聚合：groupBy, groupByMap, groupByFilterMap
 * - 数值计算：count, sum, min, max, flatCount
 * - 工具函数：first, last, next, join, isIterable, uniqueBy
 */

/**
 * 将数组分割成指定大小的块
 * @param source 源数组
 * @param size 每个块的大小
 * @returns 返回分割后的块的迭代器
 */
export function* chunk<T>(source: T[], size: number): Iterable<T[]> {
  let chunk: T[] = [];

  for (const item of source) {
    if (chunk.length < size) {
      chunk.push(item);
      continue;
    }

    yield chunk;
    chunk = [];
  }

  if (chunk.length > 0) {
    yield chunk;
  }
}

/**
 * 根据字符串长度将字符串数组分割成块
 * @param source 源字符串数组
 * @param maxLength 每个块的最大字符串长度
 * @returns 返回分割后的字符串块的迭代器
 */
export function* chunkByStringLength(source: string[], maxLength: number): Iterable<string[]> {
  let chunk: string[] = [];

  let chunkLength = 0;
  for (const item of source) {
    let length = chunkLength + item.length;
    if (length > maxLength && chunk.length > 0) {
      yield chunk;

      chunk = [];
      length = item.length;
    }

    chunk.push(item);
    chunkLength = length;
  }

  if (chunk.length > 0) {
    yield chunk;
  }
}

/**
 * 连接多个可迭代对象
 * @param sources 要连接的可迭代对象数组
 * @returns 返回连接后的迭代器
 */
export function* concat<T>(...sources: (Iterable<T> | IterableIterator<T>)[]): Iterable<T> {
  for (const source of sources) {
    yield* source;
  }
}

/**
 * 计算可迭代对象中满足条件的元素数量
 * @param source 源可迭代对象
 * @param predicate 可选的谓词函数，用于过滤元素
 * @returns 返回满足条件的元素数量
 */
export function count<T>(
  source: Iterable<T> | IterableIterator<T> | undefined,
  predicate?: (item: T) => boolean
): number {
  if (source == null) return 0;

  let count = 0;
  for (const item of source) {
    if (predicate == null || predicate(item)) {
      count++;
    }
  }
  return count;
}

/**
 * 检查是否所有元素都满足指定条件
 * @param source 源可迭代对象
 * @param predicate 谓词函数，用于测试每个元素
 * @returns 如果所有元素都满足条件则返回 true，否则返回 false
 */
export function every<T>(source: Iterable<T> | IterableIterator<T>, predicate: (item: T) => boolean): boolean {
  for (const item of source) {
    if (!predicate(item)) return false;
  }
  return true;
}

/**
 * 过滤掉 null 和 undefined 值
 * @param source 源可迭代对象
 * @returns 返回过滤后的非空值迭代器
 */
export function filter<T>(
  source: Iterable<T | undefined | null> | IterableIterator<T | undefined | null>
): Iterable<NonNullable<T>>;
/**
 * 使用类型谓词过滤元素
 * @param source 源可迭代对象
 * @param predicate 类型谓词函数
 * @returns 返回过滤后的迭代器
 */
export function filter<T, U extends T>(
  source: Iterable<T> | IterableIterator<T>,
  predicate: (item: T) => item is U
): Iterable<U>;
/**
 * 使用谓词函数过滤元素
 * @param source 源可迭代对象
 * @param predicate 谓词函数
 * @returns 返回过滤后的迭代器
 */
export function filter<T>(source: Iterable<T> | IterableIterator<T>, predicate: (item: T) => boolean): Iterable<T>;
export function* filter<T, U extends T = T>(
  source: Iterable<T> | IterableIterator<T>,
  predicate?: ((item: T) => item is U) | ((item: T) => boolean)
): Iterable<T | U> {
  if (predicate === undefined) {
    for (const item of source) {
      if (item != null) yield item;
    }
  } else {
    for (const item of source) {
      if (predicate(item)) yield item;
    }
  }
}

/**
 * 过滤并映射元素，只保留非空的映射结果
 * @param source 源可迭代对象
 * @param predicateMapper 谓词映射函数，返回 null/undefined 的元素会被过滤掉
 * @returns 返回过滤映射后的迭代器
 */
export function* filterMap<T, TMapped>(
  source: Iterable<T> | IterableIterator<T>,
  predicateMapper: (item: T) => TMapped | undefined | null
): Iterable<TMapped> {
  for (const item of source) {
    const mapped = predicateMapper(item);
    if (mapped != null) yield mapped;
  }
}

/**
 * 遍历每个元素并执行指定函数
 * @param source 源可迭代对象
 * @param fn 要执行的函数，接收元素和索引作为参数
 */
export function forEach<T>(source: Iterable<T> | IterableIterator<T>, fn: (item: T, index: number) => void): void {
  let i = 0;
  for (const item of source) {
    fn(item, i);
    i++;
  }
}

/**
 * 查找满足条件的第一个元素
 * @param source 源可迭代对象
 * @param predicate 谓词函数，用于测试元素
 * @returns 返回第一个满足条件的元素，如果没有找到则返回 undefined
 */
export function find<T>(source: Iterable<T> | IterableIterator<T>, predicate: (item: T) => boolean): T | undefined {
  for (const item of source) {
    if (predicate(item)) return item;
  }
  return undefined;
}

/**
 * 查找满足条件的第一个元素的索引
 * @param source 源可迭代对象
 * @param predicate 谓词函数，用于测试元素
 * @returns 返回第一个满足条件的元素的索引，如果没有找到则返回 -1
 */
export function findIndex<T>(source: Iterable<T> | IterableIterator<T>, predicate: (item: T) => boolean): number {
  let i = 0;
  for (const item of source) {
    if (predicate(item)) return i;
    i++;
  }
  return -1;
}

/**
 * 获取第一个元素
 * @param source 源可迭代对象
 * @returns 返回第一个元素，如果没有元素则返回 undefined
 */
export function first<T>(source: Iterable<T> | IterableIterator<T>): T | undefined {
  return source[Symbol.iterator]().next().value as T | undefined;
}

/**
 * 扁平化计数，使用累加器函数计算每个元素的数值并求和
 * @param source 源可迭代对象
 * @param accumulator 累加器函数，用于从每个元素中提取数值
 * @returns 返回累加后的总数
 */
export function flatCount<T>(
  source: Iterable<T> | IterableIterator<T> | undefined,
  accumulator: (item: T) => number
): number {
  if (source == null) return 0;

  let count = 0;
  for (const item of source) {
    count += accumulator(item);
  }
  return count;
}

/**
 * 扁平化映射，将每个元素映射为一个可迭代对象并展平
 * @param source 源可迭代对象
 * @param mapper 映射函数，将每个元素映射为可迭代对象
 * @returns 返回扁平化后的迭代器
 */
export function* flatMap<T, TMapped>(
  source: Iterable<T> | IterableIterator<T>,
  mapper: (item: T) => Iterable<TMapped>
): IterableIterator<TMapped> {
  for (const item of source) {
    yield* mapper(item);
  }
}

/**
 * 扁平化嵌套的可迭代对象
 * @param source 嵌套的可迭代对象
 * @returns 返回扁平化后的迭代器
 */
export function flatten<T>(source: Iterable<Iterable<T>> | IterableIterator<IterableIterator<T>>): IterableIterator<T> {
  return flatMap(source, (i) => i);
}

/**
 * 按键分组，返回一个对象，键为分组键，值为该组的元素数组
 * @param source 源可迭代对象
 * @param getGroupingKey 获取分组键的函数
 * @returns 返回分组后的对象
 */
export function groupBy<T, K extends PropertyKey>(
  source: Iterable<T> | IterableIterator<T>,
  getGroupingKey: (item: T) => K
): Record<string, T[]> {
  const result: Record<K, T[]> = Object.create(null);

  for (const current of source) {
    const key = getGroupingKey(current);

    const group = result[key];
    if (group == null) {
      result[key] = [current];
    } else {
      group.push(current);
    }
  }

  return result;
}

/**
 * 按键分组，返回一个 Map，键为分组键，值为该组的元素数组
 * @param source 源可迭代对象
 * @param getGroupingKey 获取分组键的函数
 * @param options 选项对象
 * @param options.filterNullGroups 是否过滤空的分组键
 * @returns 返回分组后的 Map
 */
export function groupByMap<TKey, TValue>(
  source: Iterable<TValue> | IterableIterator<TValue>,
  getGroupingKey: (item: TValue) => TKey,
  options?: { filterNullGroups?: boolean }
): Map<TKey, TValue[]> {
  const result = new Map<TKey, TValue[]>();

  const filterNullGroups = options?.filterNullGroups ?? false;

  for (const current of source) {
    const key = getGroupingKey(current);
    if (key == null && filterNullGroups) continue;

    const group = result.get(key);
    if (group == null) {
      result.set(key, [current]);
    } else {
      group.push(current);
    }
  }

  return result;
}

/**
 * 按键分组并过滤映射，只保留映射后的非空值
 * @param source 源可迭代对象
 * @param getGroupingKey 获取分组键的函数
 * @param predicateMapper 谓词映射函数，返回 null/undefined 的元素会被过滤掉
 * @returns 返回分组后的 Map，值为映射后的元素数组
 */
export function groupByFilterMap<TKey, TValue, TMapped>(
  source: Iterable<TValue> | IterableIterator<TValue>,
  getGroupingKey: (item: TValue) => TKey,
  predicateMapper: (item: TValue) => TMapped | null | undefined
): Map<TKey, TMapped[]> {
  const result = new Map<TKey, TMapped[]>();

  for (const current of source) {
    const mapped = predicateMapper(current);
    if (mapped == null) continue;

    const key = getGroupingKey(current);
    const group = result.get(key);
    if (group == null) {
      result.set(key, [mapped]);
    } else {
      group.push(mapped);
    }
  }

  return result;
}

/**
 * 检查可迭代对象中是否包含指定项
 * @param source 源可迭代对象
 * @param item 要查找的项
 * @returns 如果包含该项则返回 true，否则返回 false
 */
export function has<T>(source: Iterable<T> | IterableIterator<T>, item: T): boolean {
  return some(source, (i) => i === item);
}

/**
 * 检查对象是否为可迭代对象
 * @param source 要检查的对象
 * @returns 如果是可迭代对象则返回 true，否则返回 false
 */
export function isIterable(source: Iterable<any>): boolean {
  return typeof source[Symbol.iterator] === 'function';
}

/**
 * 使用指定分隔符连接可迭代对象中的所有元素
 * @param source 源可迭代对象
 * @param separator 分隔符字符串
 * @returns 返回连接后的字符串
 */
export function join(source: Iterable<any>, separator: string): string {
  const iterator = source[Symbol.iterator]();
  let next = iterator.next();
  if (next.done) return '';

  let result = String(next.value);
  while (true) {
    next = iterator.next();
    if (next.done) break;

    result += `${separator}${next.value}`;
  }

  return result;
}

/**
 * 获取最后一个元素
 * @param source 源可迭代对象
 * @returns 返回最后一个元素，如果没有元素则返回 undefined
 */
export function last<T>(source: Iterable<T>): T | undefined {
  let item: T | undefined;
  for (item of source) {
    /* noop */
  }
  return item;
}

/**
 * 映射每个元素到新的值
 * @param source 源可迭代对象
 * @param mapper 映射函数
 * @returns 返回映射后的迭代器
 */
export function* map<T, TMapped>(
  source: Iterable<T> | IterableIterator<T>,
  mapper: (item: T) => TMapped
): IterableIterator<TMapped> {
  for (const item of source) {
    yield mapper(item);
  }
}

/**
 * 查找数字序列中的最大值
 * @param source 数字序列
 * @returns 返回最大值
 */
export function max(source: Iterable<number> | IterableIterator<number>): number;
/**
 * 查找序列中的最大值，使用指定函数提取数值
 * @param source 源可迭代对象
 * @param getValue 从每个元素中提取数值的函数
 * @returns 返回最大值
 */
export function max<T>(source: Iterable<T> | IterableIterator<T>, getValue: (item: T) => number): number;
export function max<T>(source: Iterable<T> | IterableIterator<T>, getValue?: (item: T) => number): number {
  let max = Number.NEGATIVE_INFINITY;
  if (getValue == null) {
    for (const item of source as Iterable<number> | IterableIterator<number>) {
      if (item > max) {
        max = item;
      }
    }
  } else {
    for (const item of source) {
      const value = getValue(item);
      if (value > max) {
        max = value;
      }
    }
  }
  return max;
}

/**
 * 查找数字序列中的最小值
 * @param source 数字序列
 * @returns 返回最小值
 */
export function min(source: Iterable<number> | IterableIterator<number>): number;
/**
 * 查找序列中的最小值，使用指定函数提取数值
 * @param source 源可迭代对象
 * @param getValue 从每个元素中提取数值的函数
 * @returns 返回最小值
 */
export function min<T>(source: Iterable<T> | IterableIterator<T>, getValue: (item: T) => number): number;
export function min<T>(source: Iterable<T> | IterableIterator<T>, getValue?: (item: T) => number): number {
  let min = Number.POSITIVE_INFINITY;
  if (getValue == null) {
    for (const item of source as Iterable<number> | IterableIterator<number>) {
      if (item < min) {
        min = item;
      }
    }
  } else {
    for (const item of source) {
      const value = getValue(item);
      if (value < min) {
        min = value;
      }
    }
  }
  return min;
}

/**
 * 获取迭代器的下一个值
 * @param source 迭代器
 * @returns 返回下一个值
 */
export function next<T>(source: IterableIterator<T>): T {
  return source.next().value as T;
}

/**
 * 跳过指定数量的元素
 * @param source 源可迭代对象
 * @param count 要跳过的元素数量
 * @returns 返回跳过指定数量元素后的迭代器
 */
export function* skip<T>(source: Iterable<T> | IterableIterator<T>, count: number): IterableIterator<T> {
  let i = 0;
  for (const item of source) {
    if (i >= count) yield item;
    i++;
  }
}

/**
 * 切片操作，提取指定范围的元素
 * @param source 源可迭代对象
 * @param start 开始位置
 * @param end 结束位置
 * @returns 返回切片后的迭代器
 */
export function slice<T>(source: Iterable<T> | IterableIterator<T>, start: number, end: number): Iterable<T> {
  return skip(take(source, end), start);
}

/**
 * 检查是否至少有一个元素满足条件
 * @param source 源可迭代对象
 * @param predicate 可选的谓词函数，用于测试元素
 * @returns 如果至少有一个元素满足条件则返回 true，否则返回 false
 */
export function some<T>(source: Iterable<T> | IterableIterator<T>, predicate?: (item: T) => boolean): boolean {
  for (const item of source) {
    if (predicate == null || predicate(item)) return true;
  }
  return false;
}

/**
 * 计算数字序列的总和
 * @param source 数字序列
 * @returns 返回总和
 */
export function sum<T extends number>(source: Iterable<T> | IterableIterator<T> | undefined): number;
/**
 * 计算序列的总和，使用指定函数提取数值
 * @param source 源可迭代对象
 * @param getValue 从每个元素中提取数值的函数
 * @returns 返回总和
 */
export function sum<T>(source: Iterable<T> | IterableIterator<T> | undefined, getValue: (item: T) => number): number;
export function sum<T>(source: Iterable<T> | IterableIterator<T> | undefined, getValue?: (item: T) => number): number {
  if (source == null) return 0;

  let sum = 0;
  if (getValue == null) {
    for (const item of source as Iterable<number> | IterableIterator<number>) {
      sum += item;
    }
  } else {
    for (const item of source) {
      sum += getValue(item);
    }
  }
  return sum;
}

/**
 * 取前面指定数量的元素
 * @param source 源可迭代对象
 * @param count 要取的元素数量
 * @returns 返回前面指定数量元素的迭代器
 */
export function* take<T>(source: Iterable<T> | IterableIterator<T>, count: number): Iterable<T> {
  if (count > 0) {
    let i = 0;
    for (const item of source) {
      yield item;
      i++;
      if (i >= count) break;
    }
  }
}

/**
 * 合并多个可迭代对象，保持元素顺序
 * @param sources 要合并的可迭代对象数组
 * @returns 返回合并后的迭代器
 */
export function* union<T>(...sources: (Iterable<T> | IterableIterator<T> | undefined)[]): Iterable<T> {
  for (const source of sources) {
    if (source == null) continue;

    for (const item of source) {
      yield item;
    }
  }
}

/**
 * 根据唯一键去重，当遇到重复项时调用回调函数处理
 * @param source 源可迭代对象
 * @param getUniqueKey 获取唯一键的函数
 * @param onDuplicate 处理重复项的回调函数，返回更新后的值或 void
 * @returns 返回去重后的迭代器
 */
export function uniqueBy<TKey, TValue>(
  source: Iterable<TValue> | IterableIterator<TValue>,
  getUniqueKey: (item: TValue) => TKey,
  onDuplicate: (original: TValue, current: TValue) => TValue | void
): IterableIterator<TValue> {
  const result = new Map<TKey, TValue>();

  for (const current of source) {
    const key = getUniqueKey(current);

    const original = result.get(key);
    if (original === undefined) {
      result.set(key, current);
    } else {
      const updated = onDuplicate(original, current);
      if (updated !== undefined) {
        result.set(key, updated);
      }
    }
  }

  return result.values();
}

/**
 * 数组迭代器类
 */
export class ArrayIterator<T> {
  private array: T[];
  private index: number;

  constructor(array: T[]) {
    this.array = array;
    this.index = 0;
  }

  hasNext(): boolean {
    return this.index < this.array.length;
  }

  next(): T {
    return this.array[this.index++];
  }

  remove(): void {
    if (this.index > 0) {
      this.array.splice(this.index - 1, 1);
      this.index--;
    } else {
      throw new Error('No element to remove');
    }
  }
}
