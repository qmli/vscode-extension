/**
 * 按位数前置补0
 * @return 00
 * @param num 原始值
 * @param length 总位数
 */
function padWithZeros(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * 当前时间
 * @returns { year: string, month: string, day: string, hours: string, minutes: string, seconds: string, milliseconds: string }
 */
export function currentDateTime(): {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
  milliseconds: string;
} {
  const now = new Date();
  const year = padWithZeros(now.getFullYear(), 4);
  const month = padWithZeros(now.getMonth() + 1, 2); // 月份是从0开始的
  const day = padWithZeros(now.getDate(), 2);
  const hours = padWithZeros(now.getHours(), 2);
  const minutes = padWithZeros(now.getMinutes(), 2);
  const seconds = padWithZeros(now.getSeconds(), 2);
  const milliseconds = padWithZeros(now.getMilliseconds(), 3);

  return {
    year: year,
    month: month,
    day: day,
    hours: hours,
    minutes: minutes,
    seconds: seconds,
    milliseconds: milliseconds
  };
}

/**
 * 获取系统默认时间
 * @return yyyy-MM-dd HH:mm:ss.SSS
 */
export function getDefaultDateTime(): string {
  let time = '';
  Object.values(currentDateTime()).forEach((item: any, index) => {
    if (index === 0 || index === 1) {
      time += `${item}-`;
    } else if (index === 2) {
      time += `${item} `;
    } else if (index === 3 || index === 4) {
      time += `${item}:`;
    } else if (index === 5) {
      time += `${item}.`;
    } else {
      time += item;
    }
  });
  return time;
}

/**
 * 获取系统时间
 * @return yyyyMMddHHmmss
 */
export function getDateTime(): string {
  return Object.values(currentDateTime()).join('').slice(0, 14);
}

/**
 * 获取系统时间
 * @return yyyyMMddHHmmssSSS
 */
export function getDateTimeMill(): string {
  return Object.values(currentDateTime()).join('');
}

/**
 * 格式化日期时间字符串
 *
 * @param value 待格式化的日期时间值，支持数字、字符串和 Date 类型，默认为当前时间戳
 * @param format 格式化字符串，默认为'YYYY-MM-DD HH:mm:ss'，支持格式化参数：YY：年，M：月，D：日，H：时，m：分钟，s：秒，SSS：毫秒
 * @returns 返回格式化后的日期时间字符串
 */
export function dateFormat(
  value: number | string | Date = Date.now(),
  format: string = 'YYYY-MM-DD HH:mm:ss.SSS'
): string {
  try {
    let date: Date;
    if (typeof value === 'number' || typeof value === 'string') {
      date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
    } else {
      date = value;
    }
    const padZero = (value: number, len: number = 2): string => {
      // 左侧补零函数
      return String(value).padStart(len, '0');
    };
    const replacement = (match: string) => {
      switch (match) {
        case 'YYYY':
          return padZero(date.getFullYear());
        case 'YY':
          return padZero(date.getFullYear()).slice(2, 4);
        case 'MM':
          return padZero(date.getMonth() + 1);
        case 'M':
          return String(date.getMonth() + 1);
        case 'DD':
          return padZero(date.getDate());
        case 'D':
          return String(date.getDate());
        case 'HH':
          return padZero(date.getHours());
        case 'H':
          return String(date.getHours());
        case 'mm':
          return padZero(date.getMinutes());
        case 'm':
          return String(date.getMinutes());
        case 'ss':
          return padZero(date.getSeconds());
        case 's':
          return String(date.getSeconds());
        case 'SSS':
          return padZero(date.getMilliseconds(), 3);
        default:
          return match;
      }
    };
    return format.replace(/(YYYY|YY|M{1,2}|D{1,2}|H{1,2}|m{1,2}|s{1,2}|SSS)/g, replacement);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}
