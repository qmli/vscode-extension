/**
 * 生成UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 判断值是否为空
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEmpty(value: any): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/**
 * 判断字符串是否为有效的JSON
 */
export function isJSON(str: string): boolean {
  try {
    if (typeof JSON.parse(str) === 'object') {
      return true;
    }
  } catch (e) {
    // 不是有效JSON
    console.error(`Invalid JSON: ${str}`, e);
    return false;
  }
  return false;
}

/**
 * 安全解析JSON
 */
export function safeJSONParse(str: string, defaultValue: unknown = null): unknown {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error(`Failed to parse JSON: ${str}`, e);
    return defaultValue;
  }
}

/**
 * 构建WHERE子句
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWhereClause(conditions?: { [key: string]: any }): { clause: string; params: unknown[] } {
  if (!conditions || Object.keys(conditions).length === 0) {
    return { clause: '', params: [] };
  }

  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value === null || value === undefined) {
      clauses.push(`${key} IS NULL`);
    } else if (typeof value === 'object') {
      // 处理高级查询条件
      if (value.$in) {
        const placeholders = value.$in.map(() => '?').join(', ');
        clauses.push(`${key} IN (${placeholders})`);
        params.push(...value.$in);
      } else if (value.$nin) {
        const placeholders = value.$nin.map(() => '?').join(', ');
        clauses.push(`${key} NOT IN (${placeholders})`);
        params.push(...value.$nin);
      } else if (value.$like) {
        clauses.push(`${key} LIKE ?`);
        params.push(value.$like);
      } else if (value.$gt !== undefined) {
        clauses.push(`${key} > ?`);
        params.push(value.$gt);
      } else if (value.$gte !== undefined) {
        clauses.push(`${key} >= ?`);
        params.push(value.$gte);
      } else if (value.$lt !== undefined) {
        clauses.push(`${key} < ?`);
        params.push(value.$lt);
      } else if (value.$lte !== undefined) {
        clauses.push(`${key} <= ?`);
        params.push(value.$lte);
      } else if (value.$between) {
        clauses.push(`${key} BETWEEN ? AND ?`);
        params.push(value.$between[0], value.$between[1]);
      } else {
        // 直接相等比较
        clauses.push(`${key} = ?`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    } else {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  return {
    clause: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

/**
 * 构建ORDER BY子句
 */
export function buildOrderClause(order?: { name: string; value: 'ASC' | 'DESC' }): string {
  if (!order || !order.name) {
    return '';
  }
  return ` ORDER BY ${order.name} ${order.value || 'ASC'}`;
}

/**
 * 构建LIMIT子句
 */
export function buildLimitClause(page?: number, size?: number): string {
  if (page === undefined || size === undefined || page < 1 || size < 1) {
    return '';
  }
  const offset = (page - 1) * size;
  return ` LIMIT ${size} OFFSET ${offset}`;
}

/**
 * 处理查询结果中的JSON字段
 */
export function processRowData<T>(row: unknown): T {
  if (!row || typeof row !== 'object') {
    return row as T;
  }

  const processed: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const [key, value] of Object.entries(processed)) {
    if (typeof value === 'string' && isJSON(value)) {
      processed[key] = safeJSONParse(value);
    }
  }
  return processed as T;
}

/**
 * 处理插入/更新数据中的对象字段
 */
export function processInputData(data: { [key: string]: unknown }): { [key: string]: unknown } {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const processed: { [key: string]: unknown } = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      processed[key] = value;
    } else if (typeof value === 'object') {
      processed[key] = JSON.stringify(value);
    } else {
      processed[key] = value;
    }
  }
  return processed;
}

/**
 * 验证表名和字段名安全性（防止SQL注入）
 */
export function validateIdentifier(identifier: string): boolean {
  // 只允许字母、数字、下划线，且不能以数字开头
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * 转义SQL标识符
 * SQLite 支持使用方括号、反引号或双引号来转义标识符
 */
export function escapeIdentifier(identifier: string): string {
  if (!validateIdentifier(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  // SQLite 使用方括号转义标识符
  return `[${identifier}]`;
}

/**
 * 格式化错误信息
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(fn: () => Promise<T>, maxRetries: number = 3, delayMs: number = 1000): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // 指数退避
      }
    }
  }

  throw lastError;
}
