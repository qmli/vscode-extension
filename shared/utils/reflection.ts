/**
 * 反射处理
 * instance：实例
 * methodName：方法名
 * args：参数
 */
export function executeMethod(
  instance: { [key: string]: (...args: any[]) => unknown },
  methodName: string,
  ...args: any
): unknown {
  const method = instance[methodName];

  if (typeof method === 'function') {
    return method(...args); // 调用方法
  }

  // 改进的错误抛出
  throw new Error(`Method '${methodName}' does not exist or is not a function on the given instance.`);
}
