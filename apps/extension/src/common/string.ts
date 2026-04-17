import { hrtime } from 'process';

let compareCollator: Intl.Collator | undefined;

/**
 * 比较两个字符串（忽略大小写）。
 * @param a - 第一个字符串。
 * @param b - 第二个字符串。
 * @returns 0 如果相等，-1 如果 a < b，1 如果 a > b。
 */
export function compareIgnoreCase(a: string, b: string): 0 | -1 | 1 {
  if (compareCollator == null) {
    compareCollator = new Intl.Collator(undefined, { sensitivity: 'accent' });
  }

  const result = compareCollator.compare(a, b);
  // Intl.Collator.compare 在所有平台上不保证总是返回 1 或 -1，因此需要将其标准化
  return result === 0 ? 0 : result > 0 ? 1 : -1;
}

/**
 * 将字符串填充或截断到指定长度。
 * @param s - 要处理的字符串。
 * @param maxLength - 目标长度。
 * @param fillString - 用于填充的字符串（可选）。
 * @returns 处理后的字符串。
 */
export function padOrTruncateEnd(s: string, maxLength: number, fillString?: string): string {
  if (s.length === maxLength) return s;
  if (s.length > maxLength) return s.substring(0, maxLength);
  return s.padEnd(maxLength, fillString);
}

/**
 * 计算从指定时间点开始的持续时间（毫秒）。
 * @param start - 起始时间点，由 process.hrtime() 返回。
 * @returns 持续时间（毫秒）。
 */
export function getDurationMilliseconds(start: [number, number]): number {
  const [secs, nanosecs] = hrtime(start);
  return secs * 1000 + Math.floor(nanosecs / 1000000);
}
