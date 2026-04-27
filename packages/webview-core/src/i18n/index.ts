// 共享国际化配置

import enElement from 'element-plus/es/locale/lang/en';
import zhCnElement from 'element-plus/es/locale/lang/zh-cn';
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import zhCN from './locales/zh-cn.json';

/**
 * 支持的语言
 */
export type SupportedLocales = keyof typeof messages;

const elementPlusLocales = {
  en: enElement,
  'zh-cn': zhCnElement
};

export const messages = {
  en: {
    ...en,
    el: enElement.el
  },
  'zh-cn': {
    ...zhCN,
    el: zhCnElement.el
  }
};

/**
 * 默认语言
 */
export const defaultLocale: SupportedLocales = 'en';

/**
 * 创建共享的 i18n 实例
 * @param initialLocale 初始语言
 * @returns i18n 实例
 */
export function createSharedI18n(initialLocale: SupportedLocales = defaultLocale): ReturnType<typeof createI18n> {
  return createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: 'zh-cn',
    messages: messages,
    globalInjection: true
  });
}

/**
 * 获取 Element Plus 对应语言包
 * @param locale 语言代码
 * @returns Element Plus 语言包
 */
export function getElementPlusLocale(
  locale: SupportedLocales = defaultLocale
): (typeof elementPlusLocales)[SupportedLocales] {
  return elementPlusLocales[locale];
}

/**
 * 获取支持的语言列表
 * @returns 支持的语言列表
 */
export function getSupportedLocales(): SupportedLocales[] {
  return Object.keys(messages) as SupportedLocales[];
}

/**
 * 检查语言是否受支持
 * @param locale 语言代码
 * @returns 是否支持该语言
 */
export function isLocaleSupported(locale: string): locale is SupportedLocales {
  return getSupportedLocales().includes(locale as SupportedLocales);
}
