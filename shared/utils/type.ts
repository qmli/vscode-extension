type Primitive = string | number | boolean | symbol | undefined | null;

/**
 * 类型检查工具
 */
export const typeCheck = {
  /**
   * 判断是否是字符串
   * @param val 值
   */
  isString: function (val: unknown): val is string {
    return typeof val === 'string';
  },

  /**
   * 判断是否是数字
   * @param val 值
   */
  isNumber: function (val: unknown): val is number {
    return typeof val === 'number' && !isNaN(val);
  },

  /**
   * 判断是否是布尔值
   * @param val 值
   */
  isBoolean: function (val: unknown): val is boolean {
    return typeof val === 'boolean';
  },

  /**
   * 判断是否是数组
   * @param val 值
   */
  isArray: function (val: unknown): val is any[] {
    return Array.isArray(val);
  },

  /**
   * 判断是否是对象
   * @param val 值
   */
  isObject: function (val: unknown): val is object {
    return val !== null && typeof val === 'object';
  },

  /**
   * 判断是否是日期对象
   * @param val 值
   */
  isDate: function (val: unknown): val is Date {
    return val instanceof Date;
  },

  /**
   * 判断是否是正则表达式
   * @param val 值
   */
  isRegExp: function (val: unknown): val is RegExp {
    return val instanceof RegExp;
  },

  /**
   * 判断是否是 JSON 格式
   * @param json 字符串值
   */
  isJSON: function (json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  },

  /**
   * 判断是否是纯中文字符串
   * @param str 字符串
   */
  isPureChinese: function (str: string): boolean {
    return /^[\u4e00-\u9fa5]+$/.test(str);
  },

  /**
   * 使用正则表达式验证字符串
   * @param input 输入字符串
   * @param pattern 正则表达式字符串
   */
  validateString: function (input: string, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(input);
    } catch {
      console.error('Invalid regular expression');
      return false;
    }
  },

  /**
   * 判断是否是原始类型（String, Number, Boolean, Symbol, Undefined, Null）
   * @param val 值
   */
  isPrimitive: function (val: unknown): val is Primitive {
    return val === null || ['string', 'number', 'boolean', 'symbol', 'undefined'].includes(typeof val);
  }
};
