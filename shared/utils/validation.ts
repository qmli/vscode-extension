/**
 * ip格式正确定校验
 * @param ipAddress IP地址
 */
export function isValidIp(ipAddress: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ipAddress.trim());
}

/**
 * 是否是合法命名
 * @param name 名称
 */
export function isValidateNormalName(name: string): boolean {
  const regex = /^[\w!@$%^&'()\-+,.=[\]{}~]{1,255}$/i;
  return regex.test(name.trim());
}
