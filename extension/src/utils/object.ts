import type { KeyValue } from '@/models/metadata';

export function areEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;

  const aType = typeof a;
  if (aType === typeof b && (aType === 'string' || aType === 'number' || aType === 'boolean')) return false;

  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 深拷贝对象
 * @param obj 要深拷贝的对象
 * @param hash 用于处理循环引用的 WeakMap
 * @returns 深拷贝后的对象
 */
export const deepCloneByWeakMap = <T>(obj: T, hash = new WeakMap<object, T>()): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (hash.has(obj)) return hash.get(obj)!;

  let clone: T;

  if (Array.isArray(obj)) {
    clone = [] as T;
    hash.set(obj, clone);
    obj.forEach((item, index) => {
      (clone as KeyValue<T>)[index] = deepCloneByWeakMap(item, hash);
    });
  } else if (obj instanceof Date) {
    clone = new Date(obj.getTime()) as T;
  } else if (obj instanceof RegExp) {
    clone = new RegExp(obj) as T;
  } else {
    clone = Object.create(Object.getPrototypeOf(obj)) as T;
    hash.set(obj, clone);
    Object.getOwnPropertyNames(obj).forEach((key) => {
      (clone as KeyValue<T>)[key] = deepCloneByWeakMap((obj as any)[key], hash);
    });
  }

  return clone;
};
