/**
 * 比较两个值是否相等（深比较，适用于简单数据和对象/数组）
 * @param a 任意值
 * @param b 任意值
 * @returns 是否相等
 */
export function areEqual(a: any, b: any): boolean {
  // 基本类型相等直接返回 true
  if (a === b) return true;
  // 如果其中一个为 null/undefined，则必然不等
  if (a == null || b == null) return false;

  const aType = typeof a;
  // 两者均为基本类型(string/number/boolean)但内容不同，直接返回 false
  if (aType === typeof b && (aType === 'string' || aType === 'number' || aType === 'boolean')) return false;

  // 对象和复杂类型通过 JSON.stringify 比较内容
  return JSON.stringify(a) === JSON.stringify(b);
}

// 辅助类型：给路径添加前缀（用于对象扁平化时构造路径名）
type AddPrefix<P extends string | undefined, K extends string> = P extends '' | undefined ? K : `${P}.${K}`;

// 辅助类型：数组扁平化时拼接下标
type AddArrayIndex<P extends string | undefined, I extends number> = P extends '' | undefined ? `[${I}]` : `${P}[${I}]`;

// 辅助类型：类型合并，将联合类型合并成一个类型
type Merge<U> = MergeUnion<U extends object ? { [K in keyof U]: U[K] } : never>;
type MergeUnion<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void
  ? { [K in keyof I]: I[K] }
  : never;

// 数组类型扁平化生成对应键类型映射
type FlattenArray<T extends object, P extends string | undefined> = T extends (infer U)[]
  ? U extends object
    ? { [Key in `${AddArrayIndex<P, number>}.${string}`]: string | number | boolean }
    : { [Key in AddArrayIndex<P, number>]: string | number | boolean }
  : T extends object
    ? { [Key in `${AddArrayIndex<P, number>}.${string}`]: string | number | boolean }
    : { [Key in AddArrayIndex<P, number>]: string | number | boolean };

// 辅助类型：递归扁平化对象（不拼接数组）
type FlattenSpread<T extends object, P extends string | undefined> =
  T extends ReadonlyArray<any>
    ? FlattenArray<T, P>
    : {
        [K in keyof T]: T[K] extends ReadonlyArray<any>
          ? FlattenArray<T[K], AddPrefix<P, Extract<K, string>>>
          : T[K] extends object
            ? FlattenSpread<T[K], AddPrefix<P, Extract<K, string>>>
            : {
                [Key in AddPrefix<P, Extract<K, string>>]: T[K] extends string | number | boolean ? T[K] : string;
              };
      }[keyof T];

// 辅助类型：递归扁平化对象（数组直接拼接为字符串）
type FlattenJoin<T extends object, P extends string | undefined> = {
  [K in keyof T]: T[K] extends ReadonlyArray<any>
    ? { [Key in AddPrefix<P, Extract<K, string>>]: string }
    : T[K] extends object
      ? FlattenJoin<T[K], AddPrefix<P, Extract<K, string>>>
      : {
          [Key in AddPrefix<P, Extract<K, string>>]: T[K] extends string | number | boolean ? T[K] : string;
        };
}[keyof T];

/**
 * 对象扁平化类型定义
 * @typeParam T 要处理对象类型
 * @typeParam P 前缀
 * @typeParam JoinArrays 是否将数组合并为字符串
 */
export type Flatten<
  T extends object | null | undefined,
  P extends string | undefined,
  JoinArrays extends boolean
> = T extends object ? Merge<JoinArrays extends true ? FlattenJoin<T, P> : FlattenSpread<T, P>> : object;

// 扁平化对象的配置项
type FlattenOptions = {
  joinArrays?: boolean; // 是否把数组合并为字符串
  skipPaths?: string[]; // 扁平化时跳过的属性路径
};

/**
 * 将对象多层嵌套结构扁平化，支持跳过指定路径和数组拼接
 * @param o 待扁平化对象
 * @param prefix 键名前缀
 * @param options 可选配置项
 * @returns 扁平化后的对象
 */
export function flatten<T extends object | null | undefined, P extends string | undefined, O extends FlattenOptions>(
  o: T,
  prefix?: P,
  options?: O
): Flatten<T, P, NonNullable<O['joinArrays']> extends true ? true : false> {
  // 是否数组用字符串拼接
  const joinArrays = options?.joinArrays ?? false;

  // 需要跳过的路径，按照 prefix 拼接
  const skipPaths = options?.skipPaths?.length
    ? prefix
      ? options.skipPaths.map((p) => `${prefix}.${p}`)
      : options.skipPaths
    : undefined;

  /**
   * 递归核心函数，将属性展平成扁平结构
   * @param flattened 结果对象
   * @param key 当前路径
   * @param value 当前值
   */
  function flattenCore(flattened: Record<string, any>, key: string, value: any) {
    // 跳过指定路径
    if (skipPaths?.includes(key)) return;

    // 基本类型赋值
    if (Object(value) !== value) {
      // 跳过 null/undefined
      if (value == null) return;
      // 直接赋值，非对象/数组类型
      flattened[key] =
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? value
            : JSON.stringify(value);
    } else if (Array.isArray(value)) {
      // 数组处理
      const len = value.length;
      if (len === 0) return;

      if (joinArrays) {
        // 数组拼接为字符串，逗号分隔
        flattened[key] = value.join(',');
      } else {
        // 数组每一项递归
        for (let i = 0; i < len; i++) {
          flattenCore(flattened, `${key}[${i}]`, value[i]);
        }
      }
    } else {
      // 对象递归每个键
      const entries = Object.entries(value);
      if (entries.length === 0) return;

      for (const [k, v] of entries) {
        flattenCore(flattened, key ? `${key}.${k}` : k, v);
      }
    }
  }

  // 初始化返回对象
  const flattened: Record<string, any> = Object.create(null);
  // 从 prefix 开始递归
  flattenCore(flattened, prefix ?? '', o);
  // 断言类型为扁平化后的类型
  return flattened as Flatten<T, P, NonNullable<O['joinArrays']> extends true ? true : false>;
}

/**
 * Typed Object.entries，类型安全的 entries
 * @param o 对象
 * @returns 键值对数组
 */
export function entries<TKey extends PropertyKey, TVal>(o: Partial<Record<TKey, TVal>>): [TKey, TVal][] {
  return Object.entries(o) as [TKey, TVal][];
}

/**
 * 获取对象的所有完整路径（点分隔），用于遍历所有叶子属性
 * @param o 对象
 * @param path 当前路径
 * @returns 所有路径的数组
 */
export function paths(o: Record<string, any>, path?: string): string[] {
  const results = [];

  for (const key in o) {
    const child = o[key];
    // 若为对象则递归
    if (typeof child === 'object') {
      results.push(...paths(child, path === undefined ? key : `${path}.${key}`));
    } else {
      // 叶子节点直接返回路径
      results.push(path === undefined ? key : `${path}.${key}`);
    }
  }

  return results;
}

/**
 * 便捷地对对象的键进行新增、更新、删除操作（根据 value）
 * @param obj 源对象，如果没有会自动创建
 * @param key 目标键
 * @param value 目标值，undefined or false 时删除该属性
 * @returns 新的对象副本
 */
export function updateRecordValue<T>(
  obj: Record<string, T> | undefined,
  key: string,
  value: T | undefined
): Record<string, T> {
  // 如果 obj 不存在，初始化为空对象
  if (obj == null) {
    obj = Object.create(null) as Record<string, T>;
  }

  // 添加或更新
  // value 为 true/非 false 的布尔 或 非 undefined 时，设置/更新属性
  if (value != null && (typeof value !== 'boolean' || value)) {
    if (typeof value === 'object') {
      // 对象则浅拷贝
      obj[key] = { ...value };
    } else {
      // 基本类型直接赋值
      obj[key] = value;
    }
  } else {
    // value 为 undefined/null/false，删除属性
    // 使用解构移除 key 属性，返回剩余对象
    const { [key]: _, ...rest } = obj;
    obj = rest;
  }
  return obj;
}

/**
 * 将对象中的空字符串转换为 undefined 源文件 convertToNull
 * @param object 原始对象
 */
export function convertEmptyStringToUndefined<T extends Record<string, unknown>>(object: T): T {
  const result = { ...object };
  for (const key of Object.keys(result) as Array<keyof T>) {
    if (result[key] === '') {
      result[key] = undefined as unknown as T[keyof T];
    }
  }
  return result;
}

/**
 * 从给定的对象中提取指定的属性，返回一个新对象，仅包含这些属性。替换类似源代码serializePickProjectAppNode的函数
 *
 * @param obj - 要提取属性的对象。
 * @param keys - 一个包含属性名的数组，指定要提取的属性。
 * @param convertEmpty - 是否将空字符串转换为 undefined。默认转换，避免传递undefined导致接口报错
 * @returns 返回一个新对象，只包含指定的属性。
 *
 * @example
 * const obj = { command: 'COMMAND_1', data: { foo: 'bar' }, extraField: 'value' };
 *
 * // 提取 'command' 和 'data' 属性
 * const result = pickPropertiesFromObject(obj, ['command', 'data']);
 * console.log(result); // 输出: { command: 'COMMAND_1', data: { foo: 'bar' } }
 *
 * // 提取 'command' 和 'extraField' 属性
 * const result2 = pickPropertiesFromObject(obj, ['command', 'extraField']);
 * console.log(result2); // 输出: { command: 'COMMAND_1', extraField: 'value' }
 */
export function pickPropertiesFromObject<T extends object>(
  obj: T,
  keys: (keyof T)[],
  convertEmpty: boolean = true
): Partial<T> {
  const result: Partial<T> = {};

  // 遍历指定的键数组，将匹配的键值对提取到新对象中
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });

  return convertEmpty ? convertEmptyStringToUndefined(result) : result;
}

/**
 * 从给定的对象中排除指定的属性，返回一个新对象，不包含这些属性。 替换类似源代码serializeOmitProject的函数
 *
 * @param obj - 要排除属性的对象。
 * @param keys - 一个包含属性名的数组，指定要排除的属性。
 * @param convertEmpty - 是否将空字符串转换为 undefined。默认不转换，避免传递undefined导致接口报错
 * @returns 返回一个新对象，不包含指定的属性。
 *
 * @example
 * const obj = { command: 'COMMAND_1', data: { foo: 'bar' }, extraField: 'value' };
 *
 * // 排除 'command' 和 'data' 属性
 * const result = omitPropertiesFromObject(obj, ['command', 'data']);
 * console.log(result); // 输出: { extraField: 'value' }
 *
 * // 排除 'command' 和 'extraField' 属性
 * const result2 = omitPropertiesFromObject(obj, ['command', 'extraField']);
 * console.log(result2); // 输出: { data: { foo: 'bar' } }
 */
export function omitPropertiesFromObject<T extends object>(
  obj: T,
  keys: (keyof T)[],
  convertEmpty: boolean = false
): Partial<T> {
  const result: Partial<T> = {};

  // 遍历对象的所有键，排除在 keys 数组中的键
  Object.keys(obj).forEach((key) => {
    if (!keys.includes(key as keyof T)) {
      result[key as keyof T] = obj[key as keyof T];
    }
  });

  return convertEmpty ? convertEmptyStringToUndefined(result) : result;
}

/**
 * 根据值获取key
 * args：参数
 * @param obj 原始对象
 * @param val 值
 */
export function getKeyByVal(obj: Record<string, string>, val: string): string {
  for (const key in obj) {
    if (obj[key] === val) {
      return key;
    }
  }
  return '';
}

/**
 * 根据值获取key
 * args：参数
 * @param obj 原始对象
 * @param val 值
 * @param callback
 */
export function getKeyByVal1(
  obj: Record<string, string>,
  val: string,
  callback: (a: () => string, b: string) => boolean
): string {
  for (const key in obj) {
    if (callback(() => obj[key], val)) {
      return key;
    }
  }
  return '';
}

import { typeCheck } from './type';

/**
 * 判断对象是否为空
 * @param val 原始数据
 */
export function isObjEmpty(val: any): boolean {
  return (
    val === null ||
    val === undefined ||
    val.trim().length === 0 ||
    (typeCheck.isObject(val) && Object.keys(val).length === 0) ||
    (typeCheck.isArray(val) && Object.keys(val).length === 0)
  );
}
