<template>
  <el-divider v-if="title && visibleItems.length > 0" content-position="left">{{ title }}</el-divider>
  <div
    v-if="visibleItems.length > 0"
    class="form-section-grid"
    :class="isTable ? 'is-table' : ''"
    :style="{ gridTemplateColumns: `repeat(${column}, 1fr)` }"
  >
    <FormFieldItem
      v-for="(item, index) in visibleItems"
      :key="index"
      :item="item"
      :dynamic-form="dynamicForm"
      :has-label="hasLabel"
      :size="size"
      :hide-handle="hideHandle"
      :rules-handle="rulesHandle"
      :update-name="updateName"
      :update-node="updateNode"
      :send-message="sendMessage"
      :on-field-focus="onFieldFocus"
      :on-field-blur="onFieldBlur"
      :fetch-data="fetchData"
      @copy="handleCopy"
      @select-link="handleSelectLink"
      @search="handleSearch"
    >
      <template #draft="slotProps">
        <slot name="draft" v-bind="slotProps" />
      </template>
      <template #formTable="slotProps">
        <slot name="formTable" v-bind="slotProps" />
      </template>
    </FormFieldItem>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FormItemRule } from 'element-plus';
import FormFieldItem from './FormFieldItem.vue';
import type { FormFieldEntry, SelectTableFetchParams, SelectTableResult } from '../types';

interface Props {
  isTable?: boolean;
  hasLabel?: boolean;
  hasDivider?: boolean;
  column?: number;
  title?: string;
  hideHandle?: (item: FormFieldEntry) => boolean;
  rulesHandle?: (item: FormFieldEntry) => FormItemRule[];
  updateName?: (name: string) => void;
  /**
   * @deprecated 旧签名：updateNode(id, prop, isWrite?)，请改为 updateNode(item)
   */
  updateNode?: ((item: FormFieldEntry) => void) | ((id: string, prop: string, isWrite: boolean) => void);
  sendMessage?: (message: string) => void;
  onFieldFocus?: (item: FormFieldEntry) => void;
  onFieldBlur?: (item: FormFieldEntry) => void;
  fetchData?: (params: SelectTableFetchParams) => Promise<SelectTableResult>;
  formItems: FormFieldEntry[];
  dynamicForm: Record<string, unknown>;
  size?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isTable: false,
  hasLabel: true,
  hasDivider: true,
  column: 2,
  title: '',
  size: 'small',
  hideHandle: () => () => false,
  rulesHandle: () => () => [],
  updateName: () => () => {},
  updateNode: () => () => {},
  sendMessage: () => () => {},
  onFieldFocus: () => () => {},
  onFieldBlur: () => () => {},
  fetchData: undefined
});

const emit = defineEmits<{
  copy: [longName: string, value: string];
  'select-link': [id: string];
  search: [keyword: string];
}>();

const visibleItems = computed(() => props.formItems.filter((item) => !props.hideHandle(item)));

const handleCopy = (longName: string, value: string): void => {
  emit('copy', longName, value);
};

const handleSelectLink = (id: string): void => {
  emit('select-link', id);
};

const handleSearch = (keyword: string): void => {
  emit('search', keyword);
};
</script>

<style scoped lang="scss">
.form-section-grid {
  display: grid;
  column-gap: 10px;
  row-gap: 4px;

  // 默认无预留空间，有错误时才撑开
  :deep(.el-form-item) {
    margin-bottom: 0px;
    padding-bottom: 0px;
    position: relative;

    &.is-error {
      padding-bottom: 10px;
    }
  }

  :deep(.el-form-item__error) {
    word-break: keep-all;
  }

  &.is-table {
    :deep(.el-form-item__content) {
      justify-content: space-around;
    }

    .write-to-file {
      display: flex;
      margin-left: 5px;
    }
  }
}

.el-divider--horizontal {
  margin: 0 !important;
  padding: 24px 0;
}

:deep(.el-divider__text.is-left) {
  left: -20px;
}
</style>
