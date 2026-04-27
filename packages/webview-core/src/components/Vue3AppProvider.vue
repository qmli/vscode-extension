<template>
  <div class="vue3-app-provider" :class="appClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { createVue3App, type Vue3AppConfigType } from '../app/vue3App';
import { IpcMessage } from '@packages/common/protocol';
// import { useWebviewFocus, useWebviewVisibility, useWebviewTheme } from '../composables/useWebview';
// Props
interface Props {
  appName: string;
  initialState?: unknown;
  enableStatePersistence?: boolean;
  enableFocusTracking?: boolean;
  enableVisibilityTracking?: boolean;
  onInitialize?: () => void | Promise<void>;
  onInitialized?: () => void | Promise<void>;
  onMessageReceived?: (msg: IpcMessage) => void;
  onThemeUpdated?: (theme: string) => void;
  onLanguageChanged?: (language: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  initialState: undefined,
  enableStatePersistence: true,
  enableFocusTracking: true,
  enableVisibilityTracking: true,
  onInitialize: () => {},
  onInitialized: () => {},
  onMessageReceived: () => {},
  onThemeUpdated: () => {},
  onLanguageChanged: () => {}
});

// 创建应用配置
const appConfig: Vue3AppConfigType = {
  appName: props.appName,
  // initialState: props.initialState,
  enableStatePersistence: props.enableStatePersistence,
  enableFocusTracking: props.enableFocusTracking,
  enableVisibilityTracking: props.enableVisibilityTracking,
  onInitialize: props.onInitialize,
  onInitialized: props.onInitialized,
  onMessageReceived: props.onMessageReceived,
  onThemeUpdated: props.onThemeUpdated,
  onLanguageChanged: props.onLanguageChanged
};

// 创建应用实例（单例模式，无需provide）
const app = createVue3App(appConfig);
const context = app.context;

// 直接使用应用上下文中的状态，而不是通过 composables
const isFocused = computed(() => context.focused.value);
const isInputFocused = computed(() => context.inputFocused.value);
const isVisible = computed(() => context.visible.value);

// 主题相关的状态（这些可能需要从其他地方获取）
const theme = ref<'light' | 'dark' | 'auto'>('light');
const isDark = computed(() => theme.value === 'dark');

// 计算样式类
const appClasses = computed(() => ({
  'app-focused': isFocused.value,
  'app-input-focused': isInputFocused.value,
  'app-visible': isVisible.value,
  'app-hidden': !isVisible.value,
  'theme-light': !isDark.value,
  'theme-dark': isDark.value
}));

// 生命周期管理
const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

onUnmounted(() => {
  isMounted.value = false;
  app.dispose();
});

// 暴露给父组件的方法和状态
defineExpose({
  app,
  context,
  isMounted,
  isFocused,
  isInputFocused,
  isVisible,
  theme
});
</script>

<style scoped>
.vue3-app-provider {
  width: 100%;
  height: 100%;
  transition: opacity 0.2s ease-in-out;
  background-color: var(--vscode-editor-background);
}

.vue3-app-provider.app-hidden {
  opacity: 0.5;
}

.vue3-app-provider.app-focused {
  /* 焦点状态样式 */
}

.vue3-app-provider.app-input-focused {
  /* 输入焦点状态样式 */
}

.vue3-app-provider.theme-light {
  /* 浅色主题样式 */
}

.vue3-app-provider.theme-dark {
  /* 深色主题样式 */
}
</style>
