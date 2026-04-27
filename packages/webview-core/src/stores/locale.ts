import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SupportedLocales } from '../i18n';

export const useLocaleStore = defineStore('locale', () => {
  const current = ref<SupportedLocales>('en');

  const initLocale = () => {
    const systemLocale =
      (document.getElementsByTagName('html')[0]?.getAttribute('data-language') as SupportedLocales | null) ?? 'zh-cn';
    current.value = systemLocale;
  };

  return {
    current: current,
    initLocale: initLocale
  };
});
