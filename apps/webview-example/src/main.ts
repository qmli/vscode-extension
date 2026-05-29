import { createSharedI18n, getElementPlusLocale, useLocaleStore } from '@orientais/webview-core';
import ElementPlus from 'element-plus';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import 'element-plus/dist/index.css';
import '@orientais/webview-core/webview-core.css';
import './styles/index.scss';
import App from './App.vue';
import { appI18nMessages } from './i18n';
import { router } from './router';

// 创建应用实例
const app = createApp(App);

// 配置状态管理
const pinia = createPinia();
app.use(pinia);

const localeStore = useLocaleStore();

// 初始化语言设置
localeStore.initLocale();

// 配置国际化
const detectedLocale = localeStore.current || 'en';
const i18n = createSharedI18n(detectedLocale);
Object.entries(appI18nMessages).forEach(([locale, messages]) => {
  i18n.global.mergeLocaleMessage(locale, messages);
});
app.use(ElementPlus, { locale: getElementPlusLocale(detectedLocale) });
app.use(i18n);
app.use(router);

// 监听语言变化
localeStore.$subscribe((_mutation, state) => {
  (i18n.global.locale as any).value = state.current;
  // 注意：logger 未定义，需要导入或移除
  // logger.info('Locale changed', { locale: state.current });
});

// 挂载应用
app.mount('#app');

// 页面清理
window.addEventListener('beforeunload', () => {
  // 清理逻辑
  // themeCleanup();
  // vscodeStore.cleanup();
});

// 全局错误处理
app.config.errorHandler = (err, _vm, info) => {
  console.error('Vue application error:', err, info);
};

// 标记页面加载完成
document.body.classList.add('loaded');

// 导出应用实例（用于测试）
export { app };
