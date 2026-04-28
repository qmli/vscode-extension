import crypto from 'crypto';

/**
 * 生成长度为64的随机十六进制字符串（32字节 = 64字符）
 * @returns {string} 随机字符串
 */
export const generateRandomString = (): string => crypto.randomBytes(32).toString('hex');

/**
 * 使用 AES-128-CBC 模式进行字符串加密
 * @param {string} plaintext - 明文字符串
 * @param {string} [key='this is a 16 key'] - 密钥（将自动截断为16字节）
 * @returns {string} 加密后的 base64 字符串
 */
export const encryptCBC = (plaintext: string, key = 'this is a 16 key'): string => {
  // 确保key和iv都是16字节（AES-128）
  const realKey = Buffer.from(key).slice(0, 16);
  const iv = realKey; // 使用key作为IV
  // 创建加密器
  const cipher = crypto.createCipheriv('aes-128-cbc', realKey, iv);
  // 自动PKCS7填充并加密
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
};

/**
 * 使用 AES-128-CBC 解密字符串
 * @param {string} encrypted - 已加密的 base64 字符串
 * @param {string} [key='this is a 16 key'] - 解密密钥（必须与加密相同）
 * @returns {string} 解密后的明文字符串
 */
export const decryptCBC = (encrypted: string, key = 'this is a 16 key'): string => {
  // 同加密部分获取key和iv
  const realKey = Buffer.from(key).slice(0, 16);
  const iv = realKey;
  const decipher = crypto.createDecipheriv('aes-128-cbc', realKey, iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
