<template>
  <div ref="dialogContainerRef" class="i-soft-dialog">
    <el-dialog
      ref="dialogRef"
      v-model="dialogVisible"
      :append-to-body="appendToBody"
      :close-on-click-modal="closeOnClickModal"
      :close-on-press-escape="closeOnPressEscape"
      :fullscreen="isFullscreen"
      :height="height"
      :modal="modal"
      :show-close="false"
      :width="width"
      v-bind="$attrs"
    >
      <template #header>
        <slot name="header">
          <span class="el-dialog__title">{{ title }}</span>
          <div style="float: right; margin-right: 5px">
            <el-button
              v-if="showFullscreen"
              :size="buttonSize"
              aria-label="fullscreen"
              link
              type="info"
              @click="setFullscreen"
            >
              <el-icon v-if="isFullscreen"><BottomLeft /></el-icon>
              <el-icon v-else><FullScreen /></el-icon>
            </el-button>
            <el-button v-if="showClose" :size="buttonSize" aria-label="close" link type="info" @click="closeDialog">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </slot>
      </template>
      <div v-loading="loading" class="dialog-slot-box">
        <slot />
      </div>
      <template #footer>
        <slot name="footer" />
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { BottomLeft, Close, FullScreen } from '@element-plus/icons-vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import type { SoftDialogProps } from './types';

type ButtonSize = 'default' | 'small' | 'large';

const props = withDefaults(defineProps<SoftDialogProps>(), {
  modelValue: false,
  title: '',
  initFullscreen: false,
  showClose: true,
  showFullscreen: true,
  drag: true,
  loading: false,
  closeOnClickModal: false,
  closeOnPressEscape: false,
  appendToBody: true,
  modal: true,
  width: '61.8%',
  height: 'auto',
  size: 'default'
});

const buttonSize = computed((): ButtonSize => {
  const valid: ButtonSize[] = ['default', 'small', 'large'];
  return valid.includes(props.size as ButtonSize) ? (props.size as ButtonSize) : 'default';
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const dialogContainerRef = ref<HTMLElement | null>(null);
const dialogRef = ref<InstanceType<typeof import('element-plus').ElDialog> | null>(null);
const dialogVisible = ref(false);
const isFullscreen = ref(false);

watch(
  () => props.modelValue,
  (val) => {
    dialogVisible.value = val;
    if (val) {
      nextTick(() => {
        const dialog = dialogContainerRef.value?.querySelector('.el-dialog') as HTMLElement | null;
        if (dialog) {
          dialog.style.top = '0';
          dialog.style.left = '0';
        }
      });
    }
  }
);

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
  if (!val) {
    emit('close');
  }
});

onMounted(() => {
  dialogVisible.value = props.modelValue;
  isFullscreen.value = props.initFullscreen;
  nextTick(() => {
    if (props.drag) {
      dialogDrag();
    }
  });
});

const closeDialog = (): void => {
  dialogVisible.value = false;
};

const setFullscreen = (): void => {
  isFullscreen.value = !isFullscreen.value;
};

const dialogDrag = (): void => {
  const dialogHeaderElAll = document.getElementsByClassName('el-overlay');
  for (const item of dialogHeaderElAll) {
    const headerEl = item.querySelector('.el-dialog__header') as HTMLElement | null;
    if (!headerEl) continue;
    const dragDom = headerEl.parentElement as HTMLElement;

    headerEl.onmousedown = (e: MouseEvent) => {
      const disX = e.clientX - headerEl.offsetLeft;
      const disY = e.clientY - headerEl.offsetTop;
      const screenWidth = document.body.clientWidth;
      const screenHeight = document.documentElement.clientHeight;
      const dragDomWidth = dragDom.offsetWidth;
      const dragDomHeight = dragDom.offsetHeight;
      const minDragDomLeft = -dragDom.offsetLeft;
      const maxDragDomLeft = screenWidth - dragDom.offsetLeft - dragDomWidth;
      const minDragDomTop = -dragDom.offsetTop;
      const maxDragDomTop = screenHeight - dragDom.offsetTop - dragDomHeight;

      if (screenHeight < dragDomHeight) return;
      dragDom.style.marginBottom = '0';

      const styLStr = getComputedStyle(dragDom).left;
      const styTStr = getComputedStyle(dragDom).top;
      let offsetL: number;
      let offsetT: number;
      if (styLStr.includes('%')) {
        offsetL = document.body.clientWidth * (Number.parseFloat(styLStr.replace('%', '')) / 100);
        offsetT = document.body.clientHeight * (Number.parseFloat(styTStr.replace('%', '')) / 100);
      } else {
        offsetL = Number.parseFloat(styLStr.replace('px', '')) || 0;
        offsetT = Number.parseFloat(styTStr.replace('px', '')) || 0;
      }

      document.onmousemove = (e: MouseEvent) => {
        let left = e.clientX - disX;
        let top = e.clientY - disY;
        if (left < minDragDomLeft) left = minDragDomLeft;
        else if (left > maxDragDomLeft) left = maxDragDomLeft;
        if (top < minDragDomTop) top = minDragDomTop;
        else if (top > maxDragDomTop) top = maxDragDomTop;
        dragDom.style.cssText += `;left:${left + offsetL}px;top:${top + offsetT}px;`;
      };

      document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
  }
};

defineExpose({ closeDialog, setFullscreen });
</script>

<style scoped>
.i-soft-dialog :deep(.el-dialog).is-fullscreen {
  display: flex;
  flex-direction: column;
  top: 0 !important;
  left: 0 !important;
}

.i-soft-dialog :deep(.el-dialog) .el-dialog__body {
  max-height: 600px;
  overflow: auto;
}

.i-soft-dialog :deep(.el-dialog).is-fullscreen .el-dialog__body {
  flex: 1;
  overflow: auto;
  max-height: none;
}

.i-soft-dialog :deep(.el-dialog).is-fullscreen .el-dialog__footer {
  padding-bottom: 10px;
  border-top: 1px solid var(--el-border-color);
}
</style>

<style lang="scss">
.el-dialog {
  padding: 0;
  background: var(--el-bg-color, #f7f8fa);
}

.el-dialog__title {
  color: var(--el-text-color-primary, #dfe1e5);
  font-size: 13px !important;
}

.el-dialog__header {
  background: var(--el-bg-color-overlay, #2b2d30);
  border-radius: 4px 4px 0 0;
  color: #ffffff;
  height: 33px;
  line-height: 33px;
  text-align: center;
}

.el-dialog__footer {
  border-top: 1px solid var(--el-border-color-light, #ebecf0);
  padding: 10px 15px;
}

.el-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;
  top: 0 !important;
  left: 0 !important;

  .el-dialog__body {
    flex: 1;
    overflow: auto;
    max-height: none;

    div.dialog-slot-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;

      .el-tabs {
        flex: 1;
        display: flex;

        .el-tabs__content {
          flex: 1;
          display: flex;
          flex-direction: column;

          .el-tab-pane {
            flex: 1;
            display: flex;
            flex-direction: column;

            .treeMain {
              flex: 1;
            }
          }
        }
      }
    }
  }

  .el-dialog__footer {
    padding-bottom: 10px;
    border-top: 1px solid var(--el-border-color-light);
  }
}
</style>
