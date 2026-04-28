/**
 * 获取短UUID
 * @param length {number} 长度
 * @returns {string} 短UUID
 */
export function miniUUID(length: number = 4): string {
  return uuid().slice(0, length); // 生成一个长度为 length 的十六进制字符串
}
/**
 * 获取UUID
 * @returns {string} UUID
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * MD5转UUID
 * @param md5Str MD5值
 */
export function md5ToUuid(md5Str: string): string {
  // 验证MD5字符串格式
  if (!md5Str || typeof md5Str !== 'string') {
    throw new Error('输入必须是字符串');
  }
  // 移除可能存在的分隔符和空格
  const cleanMd5 = md5Str.replace(/[-\s]/g, '').toLowerCase();
  // 验证长度
  if (cleanMd5.length !== 32) {
    throw new Error('MD5字符串长度必须为32位');
  }
  // 验证是否为有效的十六进制字符串
  if (!/^[0-9a-f]{32}$/.test(cleanMd5)) {
    throw new Error('输入不是有效的MD5哈希值');
  }
  // 按照UUID格式重新组织字符串
  return `${cleanMd5.substring(0, 8)}-${cleanMd5.substring(8, 12)}-${cleanMd5.substring(12, 16)}-${cleanMd5.substring(16, 20)}-${cleanMd5.substring(20)}`;
}
