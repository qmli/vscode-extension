import en from './locales/en.json';
import zhCN from './locales/zh-cn.json';

/** webview-main 应用级语言包，用于合并到共享 i18n */
export const appI18nMessages = {
  en: en,
  'zh-cn': zhCN
} as const;
