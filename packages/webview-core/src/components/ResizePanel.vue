<template>
  <el-container :id="'panel' + panelId" ref="containerRef" class="resize-panel">
    <el-header
      v-if="showHeader"
      :id="'header' + panelId"
      height="auto"
      :style="{ height: headerHeight }"
      class="panel-header"
    >
      <slot name="header" />
    </el-header>
    <el-container>
      <el-splitter class="i-soft" @resize-end="handleResizeEnd">
        <el-splitter-panel v-if="hasAside" :min="170" :size="size">
          <el-scrollbar :class="hideScrollbar ? 'hide-scrollbar' : ''">
            <el-aside
              v-if="hasAside"
              :id="'aside' + panelId"
              :class="page.expand ? 'aside' : 'aside-mini'"
              :style="{ width: '100%', overflow: 'hidden', paddingLeft: paddingLeft, marginRight: '0px' }"
            >
              <div v-if="showAsideHeader" :id="'asideHeader' + panelId">
                <slot name="asideHeader">
                  <el-header
                    style="padding: 0; height: 25px; justify-content: right; color: darkgray; border-bottom: 0"
                  >
                    <div
                      style="
                        display: flex;
                        float: right;
                        width: 200px;
                        justify-content: right;
                        word-break: keep-all;
                        padding-right: 10px;
                      "
                    >
                      <el-row
                        :gutter="10"
                        :style="{ width: page.expand ? '40px' : '100%', flexWrap: 'nowrap' }"
                        type="flex"
                      >
                        <el-tooltip v-if="false" content="Add Object" effect="light" position="top">
                          <el-col
                            v-if="page.expand"
                            class="add-plus"
                            :span="8"
                            style="cursor: pointer"
                            @click="addObject"
                          >
                            <el-icon size="16"><Plus /></el-icon>
                          </el-col>
                        </el-tooltip>
                        <el-tooltip content="Expand Tree" effect="light" position="top">
                          <el-col v-if="page.expand" :span="9" style="cursor: pointer" @click="handleExpand(true)">
                            <el-icon size="16" class="action-icon"><ArrowDown /></el-icon>
                          </el-col>
                        </el-tooltip>
                        <el-tooltip content="Collapse Tree" effect="light" position="top">
                          <el-col v-if="page.expand" :span="9" style="cursor: pointer" @click="handleExpand(false)">
                            <el-icon size="16" class="action-icon"><ArrowUp /></el-icon>
                          </el-col>
                        </el-tooltip>
                      </el-row>
                    </div>
                  </el-header>
                </slot>
              </div>
              <slot name="aside" />
            </el-aside>
          </el-scrollbar>
        </el-splitter-panel>
        <el-splitter-panel min="40%" view-style="overflow: hidden">
          <slot name="main" />
        </el-splitter-panel>
      </el-splitter>
    </el-container>
  </el-container>
</template>

<script lang="ts" setup>
import { ArrowDown, ArrowUp, Plus } from '@element-plus/icons-vue';
import { onMounted, reactive, ref } from 'vue';

import type { ResizePanelProps } from './types';

const props = withDefaults(defineProps<ResizePanelProps>(), {
  height: 0,
  headerHeight: '50px',
  leftPanelWidth: '200px',
  paddingLeft: '0px',
  hideScrollbar: false,
  hasAside: true,
  dragging: true,
  overflowY: false,
  showHeader: true,
  showAsideHeader: true,
  panelId: () => `panel_${Date.now()}`,
  id: '',
  handleExpand: () => () => {},
  addObject: () => () => {}
});

const emit = defineEmits<{
  (e: 'update:expand', value: boolean): void;
}>();

const containerRef = ref();
const size = ref<number>(170);
const STORAGE_KEY_SUFFIX = '_side_size';

const page = reactive({
  isDrag: true,
  expand: true
});

onMounted(() => {
  const storedSize = localStorage.getItem(props.id + STORAGE_KEY_SUFFIX);
  if (storedSize) {
    size.value = Number(storedSize);
  }
});

const handleResizeEnd = (_index: number, sizes: number[]): void => {
  size.value = sizes[0];
  localStorage.setItem(props.id + STORAGE_KEY_SUFFIX, sizes[0] + '');
};

const toggleExpand = (): void => {
  page.expand = !page.expand;
  page.isDrag = true;
  emit('update:expand', page.expand);
};

defineExpose({ toggleExpand });
</script>

<style lang="scss" scoped>
.resize-panel {
  position: relative;
  width: 100%;
  overflow: hidden;
  height: 100%;
}
:deep(.el-splitter-panel) {
  height: 100%;
}

/* 补：让 el-scrollbar 内部也传递高度 */
:deep(.el-scrollbar),
:deep(.el-scrollbar__wrap),
:deep(.el-scrollbar__view) {
  height: 100%;
}

/* 改：el-aside 改为 flex 列布局 */
.el-aside {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.aside {
  width: 200px;
  overflow-x: hidden;
}

.aside-mini {
  z-index: 1;
  position: absolute;
  height: 23px;
  display: inline-block;
  border-radius: 2px;
  top: 35%;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.el-aside {
  border-right: 0;
}

.el-header {
  padding: 10px 15px;
}

.action-icon {
  cursor: pointer;
  color: var(--el-text-color-secondary);

  &:hover {
    color: var(--el-color-primary);
  }
}

.hide-scrollbar {
  overflow: hidden !important;

  :deep(.el-scrollbar__bar) {
    display: none;
  }
}

.add-plus {
  color: #6c707e;

  &:hover {
    color: #79bbff;
  }
}

:deep(.el-splitter-bar__dragger-active.el-splitter-bar__dragger-horizontal) {
  width: 4px;
  cursor: ew-resize !important;
}

:deep(div.el-splitter-bar__dragger.el-splitter-bar__dragger-horizontal) {
  cursor: ew-resize !important;
  width: 1px;
}

:deep(.el-splitter-bar__dragger-horizontal:before) {
  width: 1px;
}

:deep(.el-splitter-bar__dragger-active:before) {
  width: 4px;
}

:deep(.el-splitter-bar__dragger-horizontal:hover:before) {
  width: 4px;
}

.panel-header {
  z-index: 101;
  background-color: var(--vscode-editor-background, var(--el-bg-color));
}
</style>
