import { getDefaultDateTime } from './date';

/**
 * 日志处理
 */
export function splitLog(data: string): string[] {
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}.*?]/;
  const logArr = ['info', getDefaultDateTime(), data];
  let matches = data.match(regex);
  if (matches) {
    const info = matches[0];
    const arr = info.split(' - ');
    const tag = arr[1].toLowerCase().replace(/\s+/g, '');
    if (tag.startsWith('[i')) {
      logArr[0] = 'info';
    } else if (tag.startsWith('[w')) {
      logArr[0] = 'warning';
    } else if (tag.startsWith('[e')) {
      logArr[0] = 'error';
    } else {
      logArr[0] = 'trace';
    }
    logArr[1] = arr[0].trim().replace(',', '.');
    const log = data.replace(regex, '');
    logArr[2] = log.trim();
  } else {
    // 2025/04/17 14:13:25.336341
    const regex = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}.\d{6}/;
    matches = data.match(regex);
    if (matches) {
      logArr[0] = 'info';
      const info = matches[0];
      logArr[1] = info.trim().replace(/\//g, '-');
      const log = data.replace(regex, '');
      logArr[2] = log.trim();
    }
  }
  return logArr;
}
