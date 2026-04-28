/**
 * 提取关键字值数组
 * @param dataArr 原始数组（对象数组）
 * @param tag 提取关键字key
 */
export function getIds<T = any>(dataArr: Array<Record<string, T>>, tag: string): T[] {
  return dataArr.reduce<T[]>((acc: T[], curr: Record<string, T>) => {
    acc.push(curr[tag]);
    return acc;
  }, []);
}

/**
 * 根据属性去重
 * @param items 原始数字
 * @param key 属性名称
 */
export function uniqueBy<T extends Record<string, unknown>>(items: T[], key: string): T[] {
  const uniqueItems = new Map<unknown, T>();
  items.forEach((item) => uniqueItems.set(item[key], item));
  return Array.from(uniqueItems.values());
}
