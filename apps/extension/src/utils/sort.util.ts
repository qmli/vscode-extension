/**
 * 版本排序
 */
export const sortVersion = (a: string, b: string): number => {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
};

/**
 * 纯数组
 */
export function isArrayWithoutObjects(arr: string[]): boolean {
  return !arr.some((item) => typeof item === 'object' && item !== null);
}

/**
 * 按键名字母顺序排序对象
 */
export function sortByKeys(obj: any, deep = false): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    if (!isArrayWithoutObjects(obj)) {
      return obj.map((item) => (deep ? sortByKeys(item, deep) : item));
    }
    return [...obj].sort();
  }

  const sorted: any = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = deep ? sortByKeys(obj[key], deep) : obj[key];
    });

  return sorted;
}
