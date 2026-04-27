<template>
  <span ref="iconContainer" :class="iconClasses" :style="iconStyles" @click="handleClick" />
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { iconSvgs, type IconName } from '../index';
import { iconSizes, type IconSize } from '../types';

interface Props {
  name: IconName;
  size?: IconSize;
  color?: string;
  className?: string;
  style?: Record<string, string | number>;
  clickable?: boolean;
}

interface Emits {
  (e: 'click'): void;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  clickable: false,
  color: 'currentColor',
  className: '',
  style: () => ({})
});

const emit = defineEmits<Emits>();

const iconContainer = ref<HTMLElement>();

const iconSvg = computed(() => {
  return iconSvgs[props.name] || iconSvgs.info;
});

// 使用 watchEffect 安全地设置 innerHTML
watchEffect(() => {
  if (iconContainer.value) {
    iconContainer.value.innerHTML = iconSvg.value;
  }
});

const iconClasses = computed(() => {
  const classes = ['shared-icon'];

  if (props.className) {
    classes.push(props.className);
  }

  if (props.clickable) {
    classes.push('shared-icon--clickable');
  }

  return classes.join(' ');
});
const iconStyles = computed(() => {
  const styles: Record<string, string | number> = {
    display: 'inline-block',
    verticalAlign: 'middle',
    ...props.style
  };

  // 设置尺寸
  if (typeof props.size === 'string' && iconSizes[props.size]) {
    styles.width = iconSizes[props.size];
    styles.height = iconSizes[props.size];
  } else if (typeof props.size === 'number') {
    styles.width = `${props.size.toString()}px`;
    styles.height = `${props.size.toString()}px`;
  } else if (typeof props.size === 'string') {
    styles.width = props.size;
    styles.height = props.size;
  }

  // 设置颜色
  if (props.color) {
    styles.color = props.color;
  }

  return styles;
});

const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<style scoped>
.shared-icon {
  transition: color var(--transition-fast, 0.15s ease);
}

.shared-icon--clickable {
  cursor: pointer;
}

.shared-icon--clickable:hover {
  opacity: 0.8;
}

.shared-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
</style>
