/**
 * 判断是否为空
 * @param val 原始数据
 */
export function isEmpty(val: any): boolean {
  return val === null || val === undefined || val.trim().length === 0;
}

/**
 * 提取关键字
 * @param data 原始字符
 * @param keyword 关键字
 */
export function hitKeyword(data: string, keyword: string): boolean {
  const regex = new RegExp(keyword, 'gi');
  return regex.test(data);
}

/**
 * 获取正常label显示值
 * @param text 值
 * @returns 正常显示值
 * @example
 * getDisplayName('[Group::]ComSignal[*]') // 'ComSignal'
 */
export function getDisplayName(text: string): string {
  return text.replace(/(\[)|(Group::)|(])|(\*)+/g, '');
}

/**
 * 替换最后一个中括号内容
 * @param str 原始
 * @param newContent 新值
 */
export function replaceLastBracket(str: string, newContent: string): string {
  const regex = /\[([^]]*)\](?=[^[]*$)/;
  return str.replace(regex, `[${newContent}]`);
}

/**
 * 生成唯一ID 源于NonceUtils.ts
 * 用于请求标识
 */
export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * 计算从 0 开始的连续数字的数量 来源StringUtils.ts
 *
 * @param inputArray 包含字符串的数组，例如 ['ComSignal_0', 'ComSignal_1', 'ComSignal_2']
 * @param prefix 字符串前缀，例如 'ComSignal'
 * @returns 从 0 开始的连续数字的数量
 */
export function getContinuousCount(inputArray: string[], prefix: string): number {
  // 转义前缀中的特殊字符，用于正则表达式
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 创建匹配模式的正则表达式
  const pattern = new RegExp(`^${escapedPrefix}_(\\d+)$`);

  // 提取严格匹配 prefix_数字 格式的数字
  const numbers = inputArray
    .map((item) => {
      const match = item.match(pattern);
      return match ? parseInt(match[1], 10) : -1;
    })
    .filter((num) => num >= 0) // 过滤有效数字
    .sort((a, b) => a - b); // 升序排序

  // 去重，避免重复数字影响连续计数
  const uniqueNumbers = [...new Set(numbers)];

  // 查找从0开始的连续数字
  let count = 0;
  for (const num of uniqueNumbers) {
    if (num === count) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * 获取shortName`_`后缀的索引值  来源StringUtils.ts
 * @param shortName
 * @returns Number or null when not match
 */
export function getShortNameSuffixIndex(shortName?: string): number | null {
  const m = shortName?.match(/_(\d+)$/);
  return m ? Number(m[1]) : null;
}
