<template>
  <button :class="buttonClasses" :style="buttonStyles" :disabled="disabled || loading" @click="handleClick">
    <Icon v-if="loading" name="loading" class="btn-loading" />
    <Icon v-else-if="icon" :name="icon" class="btn-icon" />
    <span v-if="$slots.default" class="btn-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from '../icons/components/AppIcon.vue';
import type { ButtonType, ButtonSize } from './types';

interface Props {
  type?: ButtonType;
  size?: ButtonSize;
  icon?:
    | 'loading'
    | 'add'
    | 'remove'
    | 'edit'
    | 'delete'
    | 'save'
    | 'close'
    | 'refresh'
    | 'search'
    | 'settings'
    | 'info'
    | 'warning'
    | 'error'
    | 'success'
    | 'folder'
    | 'folderOpen'
    | 'file'
    | 'auto';
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  round?: boolean;
  circle?: boolean;
  outline?: boolean;
  text?: boolean;
}

interface Emits {
  (e: 'click', event: MouseEvent): void;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'md',
  icon: undefined,
  loading: false,
  disabled: false,
  block: false,
  round: false,
  circle: false,
  outline: false,
  text: false
});

const emit = defineEmits<Emits>();

const buttonClasses = computed(() => {
  const classes = ['shared-btn'];

  classes.push(`shared-btn--${props.type}`);
  classes.push(`shared-btn--${props.size}`);

  if (props.block) classes.push('shared-btn--block');
  if (props.round) classes.push('shared-btn--round');
  if (props.circle) classes.push('shared-btn--circle');
  if (props.outline) classes.push('shared-btn--outline');
  if (props.text) classes.push('shared-btn--text');
  if (props.loading) classes.push('shared-btn--loading');
  if (props.disabled) classes.push('shared-btn--disabled');

  return classes.join(' ');
});

import type { CSSProperties } from 'vue';

const buttonStyles = computed(() => {
  const styles: CSSProperties = {};

  // 这里可以添加动态样式

  return styles;
});

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<style scoped>
.shared-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border: 1px solid transparent;
  border-radius: var(--border-radius, 4px);
  font-family: var(--font-family);
  font-size: var(--font-size-sm, 14px);
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-fast, 0.15s ease);
  outline: none;
}

/* 尺寸 */
.shared-btn--xs {
  padding: 4px 8px;
  font-size: 12px;
}

.shared-btn--sm {
  padding: 6px 12px;
  font-size: 13px;
}

.shared-btn--md {
  padding: 8px 16px;
  font-size: 14px;
}

.shared-btn--lg {
  padding: 10px 20px;
  font-size: 16px;
}

.shared-btn--xl {
  padding: 12px 24px;
  font-size: 18px;
}

/* 类型 */
.shared-btn--primary {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.shared-btn--primary:hover:not(.shared-btn--disabled):not(.shared-btn--loading) {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
  transform: translateY(-1px);
}

.shared-btn--secondary {
  background-color: var(--color-secondary);
  color: white;
  border-color: var(--color-secondary);
}

.shared-btn--success {
  background-color: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.shared-btn--warning {
  background-color: var(--color-warning);
  color: white;
  border-color: var(--color-warning);
}

.shared-btn--danger {
  background-color: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

.shared-btn--info {
  background-color: var(--color-info);
  color: white;
  border-color: var(--color-info);
}

/* 轮廓按钮 */
.shared-btn--outline {
  background-color: transparent;
  color: var(--color-primary);
}

.shared-btn--outline.shared-btn--primary {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.shared-btn--outline.shared-btn--primary:hover:not(.shared-btn--disabled):not(.shared-btn--loading) {
  background-color: var(--color-primary);
  color: white;
}

/* 文字按钮 */
.shared-btn--text {
  background-color: transparent;
  border-color: transparent;
  color: var(--color-primary);
}

.shared-btn--text:hover:not(.shared-btn--disabled):not(.shared-btn--loading) {
  background-color: var(--color-hover-bg, rgba(0, 122, 204, 0.1));
}

/* 形状 */
.shared-btn--block {
  display: flex;
  width: 100%;
}

.shared-btn--round {
  border-radius: 20px;
}

.shared-btn--circle {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
}

.shared-btn--circle.shared-btn--sm {
  width: 28px;
  height: 28px;
}

.shared-btn--circle.shared-btn--lg {
  width: 36px;
  height: 36px;
}

/* 状态 */
.shared-btn--loading {
  pointer-events: none;
}

.shared-btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* 图标和内容 */
.btn-loading {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.btn-icon {
  flex-shrink: 0;
}

.btn-content {
  flex: 1;
}

/* 焦点样式 */
.shared-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-primary-light, rgba(0, 122, 204, 0.5));
}

/* 按下效果 */
.shared-btn:active:not(.shared-btn--disabled):not(.shared-btn--loading) {
  transform: translateY(0);
}
</style>
