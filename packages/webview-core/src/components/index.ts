// 共享组件导出

// 基础组件
export { default as Button } from './BaseButton.vue';
// Vue3 应用组件
export { default as Vue3AppProvider } from './Vue3AppProvider.vue';

// 动态表单组件
export { default as DynamicForm } from './DynamicForm/DynamicForm.vue';
export { default as SelectTable } from './DynamicForm/SelectTable.vue';
export { default as FormFieldItem } from './DynamicForm/FormFieldItem.vue';
export { default as FormSection } from './DynamicForm/FormSection.vue';
export { default as FormTable } from './DynamicForm/FormTable.vue';

// 通用 UI 组件（迁移自 common）
export { default as EllipsisTooltip } from './EllipsisTooltip.vue';
export { default as ISoftDialog } from './ISoftDialog.vue';
export { default as ResizePanel } from './ResizePanel.vue';

// 图标组件（重新导出）
export { Icon } from '../icons/components';

// 组件类型
export * from './types';
