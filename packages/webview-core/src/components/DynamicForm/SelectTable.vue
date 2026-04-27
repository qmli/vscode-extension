<!--
  表格选择器通用组件 SelectTable
  - 基于 el-select + el-table，下拉展开表格进行单选/多选
  - 支持静态 data 或异步 fetchData，数据与业务由调用方提供
  - 插槽：header(搜索区)、tag-label(已选展示)、列名(自定义列)、默认(追加列)
  @version 2.0
-->
<template>
  <!-- 使用 el-select 的 #empty 区域承载表格，无选项时展示 -->
  <el-select
    ref="selectRef"
    v-model="innerValue"
    popper-class="select-table-dropdown"
    :clearable="clearable"
    :collapse-tags="collapseTags"
    :collapse-tags-tooltip="collapseTagsTooltip"
    :disabled="disabled"
    :filterable="filterable"
    :multiple="multiple"
    :placeholder="placeholder"
    style="width: 100%"
    @clear="handleClear"
    @remove-tag="handleRemoveTag"
    @visible-change="handleVisibleChange"
  >
    <!-- 已选中的 tag 展示：默认取 row[labelKey]，可用 #tag-label 插槽覆盖 -->
    <template #label="{ value: rowValue }">
      <el-tooltip placement="top">
        <template #content>
          <el-link
            v-if="!rowValue['disable']"
            underline="always"
            @click.stop="emit('select-link', String(rowValue.id))"
          >
            Link redirection
          </el-link>
          <el-link v-else underline="never" disabled>Link Lost</el-link>
        </template>
        <el-link v-if="rowValue[props.labelKey]" :icon="LocationInformation">
          {{ getLabel(rowValue) }}
        </el-link>
      </el-tooltip>
    </template>

    <!-- 下拉展开时显示表格区域 -->
    <template #empty>
      <div v-loading="loading" class="select-table__container">
        <!-- 头部区域：slot-prop form 为响应式搜索参数，submit() 触发重新拉取 -->
        <div class="select-table__header">
          <el-input
            v-model="formData.keyword"
            :placeholder="$t('common.search')"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          ></el-input>
        </div>

        <!-- 表格：多选为勾选列，单选为序号列；列可通过 headers 或 fetchData 返回的 headers 配置 -->
        <el-table
          ref="tableRef"
          :data="pageData"
          :highlight-current-row="!multiple"
          style="width: 100%"
          border
          @select="handleSelect"
          @row-click="handleRowClick"
          @select-all="handleSelectAll"
        >
          <el-table-column v-if="multiple" type="selection" />
          <el-table-column v-else type="index" align="center">
            <template #default="scope">
              <!-- 序号 = 当前页偏移 + 行索引 -->
              {{ scope.$index + (currentPage - 1) * resolvedPageSize + 1 }}
            </template>
          </el-table-column>

          <template v-for="(col, index) in resolvedHeaders" :key="index">
            <el-table-column v-if="!col.hide" :column-key="col.prop" :label="col.label" :prop="col.prop">
              <template #default="scope">
                <!-- 列内容可由插槽 #[col.prop] 自定义 -->
                <slot :name="col.prop" v-bind="scope">
                  {{ scope.row[col.prop] }}
                </slot>
              </template>
            </el-table-column>
          </template>

          <!-- 默认插槽：用于在表格末尾追加自定义列 -->
          <slot />
        </el-table>

        <div class="select-table__pagination">
          <el-pagination
            v-model:current-page="currentPage"
            background
            :pager-count="5"
            :page-size="resolvedPageSize"
            :size="size"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </template>
  </el-select>
</template>

<script lang="ts" setup>
/**
 * SelectTable 表格选择器
 * - 通用组件，不依赖业务 DataBus、store、i18n 等
 * - 数据来源：props.data（静态）或 props.fetchData（异步，由使用端实现）
 * - 选中值通过 v-model 与 change 事件同步；可选 resultKeys 控制输出字段
 */
import { ElSelect, ElTable, type TableInstance } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { LocationInformation } from '@element-plus/icons-vue';

import type {
  SelectTableFetchParams,
  SelectTableHeader,
  SelectTableModelValue,
  SelectTableResult,
  SelectTableRow
} from '../types';

// ========== Props ==========

interface Props {
  /** 绑定值：单选为单行对象，多选为行对象数组 */
  modelValue?: SelectTableModelValue;
  /** 静态表头；若 fetchData 返回 headers 则优先使用动态表头 */
  headers?: SelectTableHeader[];
  /** 行中作为“显示文本”的字段名，默认 'label' */
  labelKey?: string;
  /** 行中作为唯一标识的字段名，用于跨分页保持选中，默认 'id' */
  valueKey?: string;
  /** 选中后 emit 时只保留的字段；空数组表示返回整行 */
  resultKeys?: string[];
  multiple?: boolean;
  clearable?: boolean;
  filterable?: boolean;
  collapseTags?: boolean;
  collapseTagsTooltip?: boolean;
  disabled?: boolean;
  placeholder?: string;
  size?: 'small' | 'default' | 'large';
  /** 每页条数 */
  pageSize?: number;
  /** 静态数据：与 fetchData 二选一，有 fetchData 时忽略 data */
  data?: SelectTableResult;
  /**
   * 异步加载：由使用端实现（请求 API、DataBus 等），
   * 入参含 page、pageSize、extraParams 及 header 插槽里 form 的字段
   */
  fetchData?: (params: SelectTableFetchParams) => Promise<SelectTableResult>;
  /** 每次请求都会带上的额外参数 */
  extraParams?: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  labelKey: 'label',
  valueKey: 'id',
  resultKeys: () => [],
  multiple: false,
  clearable: false,
  filterable: false,
  collapseTags: false,
  collapseTagsTooltip: false,
  disabled: false,
  placeholder: '',
  size: 'small',
  pageSize: 10,
  headers: () => [],
  data: undefined,
  fetchData: undefined,
  extraParams: () => ({})
});

// ========== Emits ==========

const emit = defineEmits<{
  'update:modelValue': [value: SelectTableModelValue];
  change: [value: SelectTableModelValue];
  'select-link': [id: string];
  search: [keyword: string];
  'visible-change': [visible: boolean];
}>();

// ========== State ==========

const selectRef = ref<InstanceType<typeof ElSelect>>();
const tableRef = ref<TableInstance>();

const loading = ref(false);
const currentPage = ref(1);
const total = ref(0);
/** 当前次加载的全部行（前端分页时为一整份数据，远程分页时为当前页数据） */
const allTableData = ref<SelectTableRow[]>([]);
/** fetchData 返回的 headers 会写入此处，优先级高于 props.headers */
const dynamicHeaders = ref<SelectTableHeader[]>([]);

/**
 * 头部插槽 #header 的 slot-prop form：响应式对象，
 * 使用端可 v-model 绑定搜索项，提交时 merge 进 fetchData 的 params
 */
const formData = reactive<Record<string, unknown>>({});

/** 多选时跨分页记录已选行的 valueKey，翻页后用于恢复勾选状态 */
const selectionSet = new Set<string>();

/** 内部 v-model，与 props.modelValue 同步 */
const innerValue = ref<SelectTableModelValue>(props.multiple ? [] : (props.modelValue ?? null));

// ========== Computed ==========

const resolvedPageSize = computed(() => props.pageSize ?? 10);

/** 表头：动态 headers 优先，否则用 props.headers */
const resolvedHeaders = computed<SelectTableHeader[]>(() =>
  dynamicHeaders.value.length > 0 ? dynamicHeaders.value : props.headers
);

/** 当前页要展示的行（从 allTableData 按页切片） */
const pageData = computed<SelectTableRow[]>(() => {
  const start = (currentPage.value - 1) * resolvedPageSize.value;
  return allTableData.value.slice(start, start + resolvedPageSize.value);
});

// ========== Watchers ==========

/** 外部 modelValue 变化时同步到 innerValue */
watch(
  () => props.modelValue,
  (value) => {
    innerValue.value = value ?? (props.multiple ? [] : null);
  },
  { deep: true }
);

// ========== Lifecycle ==========

onMounted(() => {
  innerValue.value = props.modelValue ?? (props.multiple ? [] : null);
});

// ========== Methods ==========

/** 从行对象中取出要显示的文本（用于 tag 默认展示） */
function getLabel(rowValue: unknown): string {
  if (rowValue && typeof rowValue === 'object' && !Array.isArray(rowValue)) {
    const val = (rowValue as SelectTableRow)[props.labelKey];
    return String(val ?? '');
  }
  return String(rowValue ?? '');
}

/**
 * 加载表格数据：优先调用 fetchData(params)，否则使用 props.data。
 * params 包含 page、pageSize、extraParams 以及 formData（header 插槽内填写的搜索条件）。
 */
async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const params: SelectTableFetchParams = {
      page: currentPage.value,
      pageSize: resolvedPageSize.value,
      ...props.extraParams,
      ...formData
    };

    let result: SelectTableResult;
    if (props.fetchData) {
      result = await props.fetchData(params);
    } else {
      result = props.data ?? { rows: [], total: 0 };
    }

    allTableData.value = result.rows;
    total.value = result.total ?? result.rows.length;
    if (result.headers?.length) {
      dynamicHeaders.value = result.headers;
    }

    await syncTableSelection();
  } finally {
    loading.value = false;
  }
}

/** 根据当前 innerValue 恢复表格勾选/高亮状态（多选勾选、单选 currentRow） */
async function syncTableSelection(): Promise<void> {
  await nextTick();
  if (props.multiple) {
    const selected = Array.isArray(innerValue.value) ? (innerValue.value as SelectTableRow[]) : [];
    selected.forEach((row) => {
      const match = pageData.value.find((item) => item[props.valueKey] === row[props.valueKey]);
      if (match) {
        tableRef.value?.toggleRowSelection(match, true);
      }
      const id = String(row[props.valueKey] ?? '');
      if (id) selectionSet.add(id);
    });
  } else {
    const current = innerValue.value;
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const currentRow = current as SelectTableRow;
      const match = pageData.value.find((item) => item[props.valueKey] === currentRow[props.valueKey]);
      tableRef.value?.setCurrentRow(match);
    }
  }
  tableRef.value?.setScrollTop(0);
}

/** 清空 header 插槽绑定的 form 数据（下拉关闭后再打开时调用） */
function clearFormData(): void {
  Object.keys(formData).forEach((key) => Reflect.deleteProperty(formData, key));
}

/** 下拉展开时重置页码与 form，并拉取数据；同时把可见性变化透出给外层。 */
function handleVisibleChange(visible: boolean): void {
  emit('visible-change', visible);
  if (!visible) return;
  currentPage.value = 1;
  clearFormData();
  loadData();
}

/** 分页切换：仅切片当前页数据，并在 nextTick 后根据 selectionSet 恢复勾选 */
function handlePageChange(page: number): void {
  currentPage.value = page;
  nextTick(() => {
    selectionSet.forEach((id) => {
      const match = pageData.value.find((item) => String(item[props.valueKey]) === id);
      if (match) {
        tableRef.value?.toggleRowSelection(match, true);
      }
    });
  });
}

/** 表格勾选/取消单行：更新 innerValue 与 selectionSet，并 emit */
function handleSelect(rows: SelectTableRow[], row: SelectTableRow): void {
  if (!Array.isArray(innerValue.value)) {
    innerValue.value = [];
  }
  const selected = innerValue.value as SelectTableRow[];
  const isSelected = rows.includes(row);
  const id = String(row[props.valueKey] ?? '');

  if (isSelected) {
    selected.push(row);
    selectionSet.add(id);
  } else {
    const idx = selected.findIndex((item) => item[props.valueKey] === row[props.valueKey]);
    if (idx !== -1) selected.splice(idx, 1);
    selectionSet.delete(id);
  }
  emitValue();
}

/** 表格全选/取消全选：针对当前 allTableData 更新 selected 与 selectionSet，并 emit */
function handleSelectAll(rows: SelectTableRow[]): void {
  if (!Array.isArray(innerValue.value)) {
    innerValue.value = [];
  }
  const selected = innerValue.value as SelectTableRow[];
  const isAllSelected = rows.length > 0;

  if (isAllSelected) {
    allTableData.value.forEach((row) => {
      const id = String(row[props.valueKey] ?? '');
      if (!selectionSet.has(id)) {
        selected.push(row);
        selectionSet.add(id);
      }
    });
  } else {
    allTableData.value.forEach((row) => {
      const id = String(row[props.valueKey] ?? '');
      const idx = selected.findIndex((item) => item[props.valueKey] === row[props.valueKey]);
      if (idx !== -1) selected.splice(idx, 1);
      selectionSet.delete(id);
    });
  }
  emitValue();
}

/** 单选模式下点击行：选中该行并关闭下拉，然后 emit */
function handleRowClick(row: SelectTableRow): void {
  if (props.multiple) return;
  innerValue.value = row;
  selectRef.value?.blur();
  emitValue();
}

/** 多选时删除某个 tag：同步更新 selectionSet 与表格勾选状态，然后 emit */
function handleRemoveTag(removedValue: unknown): void {
  if (removedValue && typeof removedValue === 'object' && !Array.isArray(removedValue)) {
    const row = removedValue as SelectTableRow;
    const id = String(row[props.valueKey] ?? '');
    selectionSet.delete(id);

    // 若被移除的行当前在表格中可见，取消其勾选状态
    const match = pageData.value.find((item) => item[props.valueKey] === row[props.valueKey]);
    if (match) {
      tableRef.value?.toggleRowSelection(match, false);
    }
  }
  emitValue();
}

/** 清空选择：置空 innerValue 并 emit undefined */
function handleClear(): void {
  innerValue.value = props.multiple ? [] : null;
  emit('update:modelValue', undefined);
  emit('change', undefined);
}

/** header 插槽内调用 submit() 时执行：回到第一页并重新 loadData */
function handleRefresh(): void {
  currentPage.value = 1;
  loadData();
}

/** 搜索框回车或清空时触发：重新加载数据并向外 emit search 事件 */
function handleSearch(): void {
  handleRefresh();
  emit('search', String(formData.keyword ?? ''));
}

/**
 * 根据 resultKeys 从当前选中值中摘取字段，供 emit 使用。
 * resultKeys 为空则直接返回 innerValue（完整行或行数组）。
 */
function buildResult(): SelectTableModelValue {
  const keys = props.resultKeys;
  if (!keys || keys.length === 0) {
    return innerValue.value;
  }

  const pickKeys = (row: SelectTableRow): SelectTableRow =>
    keys.reduce<SelectTableRow>((acc, key) => {
      acc[key] = row[key];
      return acc;
    }, {});

  if (props.multiple) {
    const selected = Array.isArray(innerValue.value) ? (innerValue.value as SelectTableRow[]) : [];
    return selected.map(pickKeys);
  }

  if (!innerValue.value || typeof innerValue.value !== 'object' || Array.isArray(innerValue.value)) {
    return innerValue.value;
  }
  return pickKeys(innerValue.value as SelectTableRow);
}

/** 统一出口：用 buildResult() 得到结果后 emit update:modelValue 与 change */
function emitValue(): void {
  const result = buildResult();
  emit('update:modelValue', result);
  emit('change', result);
}

/**
 * 聚焦 SelectTable 的输入区域。
 * 列表态 inline 编辑进入后需要把焦点交给真实控件，保证键盘和鼠标交互连续。
 */
function focus(): void {
  selectRef.value?.focus();
}

/**
 * 切换 SelectTable 下拉菜单的展开状态。
 * draft 列表编辑会在进入编辑态后主动展开下拉，以对齐主表单里“点一下直接选”的体验。
 */
function toggleMenu(): void {
  selectRef.value?.toggleMenu();
}

defineExpose({
  focus,
  toggleMenu
});
</script>

<style lang="scss" scoped>
/*
 * 全局样式：el-select 的 popper 被 teleport 到 body，
 * scoped 无法覆盖，需要通过 popper-class 配合全局样式处理。
 */
.select-table-dropdown {
  .el-select-dropdown__empty {
    /* 移除默认 padding 与居中对齐，避免影响表格布局 */
    padding: 0 !important;
    text-align: left !important;
    color: inherit !important;
  }
}
/* 下拉内表格容器：宽度跟随 popper，列多时横向滚动 */
.select-table__container {
  padding: 8px;
  box-sizing: border-box;
  /* 列多时不撑大 popper，改为横向滚动 */
  overflow-x: auto;

  :deep(.is-center) {
    text-align: center;
  }

  /* 单选模式：当前选中行高亮 */
  :deep(.el-table__row.current-row > td.el-table__cell) {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  /* 所有行显示手型鼠标，提示可点击 */
  :deep(.el-table__row) {
    cursor: pointer;
  }
}

/* 头部搜索区域：无内容时自动折叠 */
.select-table__header {
  margin-bottom: 8px;

  &:empty {
    display: none;
  }
}

/* 分页区域居中展示 */
.select-table__pagination {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
