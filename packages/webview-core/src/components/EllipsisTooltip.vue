<template>
  <div :ref="setContainerRef" :style="{ width: props.width }" class="ellipsis-box" @mouseover="checkEllipsis">
    <el-tooltip :content="props.content" :disabled="!hasEllipsis" :effect="props.effect" :placement="tooltipPlacement">
      <el-text :type="textType" :style="{ color: props.color }">
        {{ props.content }}
      </el-text>
    </el-tooltip>
  </div>
</template>

<script lang="ts" setup>
import type { ComponentPublicInstance } from 'vue';
import { computed, ref } from 'vue';

import type { EllipsisTooltipProps } from './types';

type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

type TextType = 'primary' | 'success' | 'info' | 'warning' | 'danger';

const TOOLTIP_PLACEMENTS: TooltipPlacement[] = [
  'top',
  'bottom',
  'left',
  'right',
  'top-start',
  'top-end',
  'bottom-start',
  'bottom-end',
  'left-start',
  'left-end',
  'right-start',
  'right-end'
];

const TEXT_TYPES: TextType[] = ['primary', 'success', 'info', 'warning', 'danger'];

const props = withDefaults(defineProps<EllipsisTooltipProps>(), {
  content: '',
  width: '',
  effect: 'dark',
  placement: 'top',
  color: '',
  type: ''
});

const tooltipPlacement = computed((): TooltipPlacement => {
  return TOOLTIP_PLACEMENTS.includes(props.placement as TooltipPlacement)
    ? (props.placement as TooltipPlacement)
    : 'top';
});

const textType = computed((): TextType | undefined => {
  return TEXT_TYPES.includes(props.type as TextType) ? (props.type as TextType) : undefined;
});

const containerRef = ref<HTMLElement | null>(null);

const setContainerRef = (el: Element | ComponentPublicInstance | null): void => {
  containerRef.value = el instanceof HTMLElement ? el : null;
};

const hasEllipsis = ref(false);

const checkEllipsis = (): void => {
  if (!containerRef.value) return;
  hasEllipsis.value = containerRef.value.scrollWidth > containerRef.value.clientWidth;
};
</script>

<style scoped>
.ellipsis-box {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
