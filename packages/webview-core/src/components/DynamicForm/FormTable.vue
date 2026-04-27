<template>
  <div ref="formTableRef" class="form-table">
    <el-table ref="tableRef" :data="state.data" :max-height="props.maxHeight" border stripe>
      <el-table-column align="center" fixed="right" type="index" width="50">
        <template #header>
          <el-button :disabled="state.hideAdd" :icon="Plus" :size="props.size" circle type="primary" @click="rowAdd" />
        </template>
        <template #default="scope">
          <label :class="['form-table-handle', { 'form-table-handle-delete': !hideDelete }]">
            <span>{{ scope.$index + 1 }}</span>
            <el-button
              v-if="!hideDelete"
              :icon="Delete"
              :size="props.size"
              circle
              plain
              type="primary"
              @click="rowDel(scope.row, scope.$index)"
            />
          </label>
        </template>
      </el-table-column>
      <el-table-column v-if="dragSort" label="" width="50">
        <template #default>
          <div class="move" style="cursor: move">
            <el-icon style="width: 1em; height: 1em">
              <DCaret />
            </el-icon>
          </div>
        </template>
      </el-table-column>
      <slot />
      <template #empty>
        {{ placeholder }}
      </template>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
import { DCaret, Delete, Plus } from '@element-plus/icons-vue';
import { ElTable } from 'element-plus';
import { nextTick, onMounted, reactive, ref, watch } from 'vue';

import type { FormTableProps } from '../types';

const formTableRef = ref<HTMLDivElement>();
const tableRef = ref<InstanceType<typeof ElTable>>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown[]): void;
  (e: 'change', row: unknown): void;
}>();

const props = withDefaults(defineProps<FormTableProps>(), {
  placeholder: '',
  size: 'small',
  maxHeight: 300,
  maxLength: -1,
  dragSort: false,
  hideAdd: false,
  hideDelete: false
});

interface TableState {
  data: unknown[];
  hideAdd: boolean;
}

const state = reactive<TableState>({ data: [], hideAdd: false });

onMounted(() => {
  state.data = [];
  state.hideAdd = props.hideAdd;
  if (props.dragSort) {
    rowDrop();
  }
});

watch(
  () => props.modelValue,
  () => {
    state.data = props.modelValue;
    state.hideAdd = false;
    if (props.maxLength !== -1) {
      if (state.data.length >= (props.maxLength ?? 0)) {
        state.hideAdd = true;
      }
    }
  },
  { deep: true }
);

const rowDrop = async (): Promise<void> => {
  try {
    const Sortable = (await import('sortablejs')).default;
    const tbody = tableRef.value?.$el.querySelector('.el-table__body-wrapper tbody');
    if (!tbody) return;
    Sortable.create(tbody, {
      handle: '.move',
      animation: 300,
      ghostClass: 'ghost',
      onEnd({ newIndex, oldIndex }) {
        state.data.splice(Number(newIndex), 0, state.data.splice(Number(oldIndex), 1)[0]);
        const newArray = state.data.slice(0);
        const tmpHeight = formTableRef.value?.offsetHeight;
        formTableRef.value?.style.setProperty('height', tmpHeight + 'px');
        state.data = [];
        nextTick(() => {
          state.data = newArray;
          nextTick(() => {
            formTableRef.value?.style.removeProperty('height');
          });
        });
      }
    });
  } catch {
    console.warn('sortablejs is not available for drag-sort');
  }
};

const rowAdd = (): void => {
  const temp = JSON.parse(JSON.stringify(props.addTemplate)) as Record<string, unknown>;
  state.data.push(temp);
  nextTick(() => {
    setTimeout(() => {
      const scrollTop = 50 * state.data.length;
      tableRef.value?.setScrollTop(scrollTop);
    }, 100);
  });
};

const rowDel = (row: unknown, index: number): void => {
  state.data.splice(index, 1);
  emit('change', row);
};

const pushRow = (row?: unknown): void => {
  const temp: unknown = row ?? (JSON.parse(JSON.stringify(props.addTemplate)) as Record<string, unknown>);
  state.data.push(temp);
};

const deleteRow = (index: number): void => {
  state.data.splice(index, 1);
};

defineExpose({ pushRow, deleteRow });
</script>

<style scoped>
.form-table {
  width: 100%;
}

.form-table .form-table-handle {
  text-align: center;
}

.form-table .form-table-handle span {
  display: inline-block;
}

.form-table .form-table-handle button {
  display: none;
}

.form-table :deep(.hover-row) .form-table-handle-delete span {
  display: none;
}

.form-table :deep(.hover-row) .form-table-handle-delete button {
  display: inline-block;
}

.form-table .move {
  text-align: center;
  font-size: 14px;
  margin-top: 3px;
}
</style>
