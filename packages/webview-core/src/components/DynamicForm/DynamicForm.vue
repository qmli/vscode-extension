<template>
  <el-form
    ref="formRef"
    :model="formData"
    :label-width="config.labelWidth || '120px'"
    :size="config.size || 'default'"
    class="dynamic-form"
  >
    <!-- 分组模式 -->
    <template v-if="config.groups && config.groups.length > 0">
      <div v-for="group in config.groups" :key="group.key" class="form-group">
        <!-- 可折叠分组 -->
        <el-collapse v-if="group.collapsible" v-model="activeCollapse[group.key]" class="group-collapse">
          <el-collapse-item :name="group.key">
            <template #title>
              <div class="group-title">
                {{ group.title }}
              </div>
            </template>
            <el-row :gutter="16">
              <template v-for="groupField in group.fields" :key="groupField.key">
                <el-col :span="calculateColSpan(groupField, group.columns)">
                  <FormFieldRenderer :field="groupField" :form-data="formData" @change="handleFieldChange" />
                </el-col>
              </template>
            </el-row>
          </el-collapse-item>
        </el-collapse>

        <!-- 普通分组 -->
        <div v-else class="group-container">
          <div class="group-header">{{ group.title }}</div>
          <el-row :gutter="16">
            <template v-for="groupField in group.fields" :key="groupField.key">
              <el-col :span="calculateColSpan(groupField, group.columns)">
                <FormFieldRenderer :field="groupField" :form-data="formData" @change="handleFieldChange" />
              </el-col>
            </template>
          </el-row>
        </div>
      </div>
    </template>

    <!-- 扁平模式（原有方式） -->
    <template v-else-if="config.fields && config.fields.length > 0">
      <el-row :gutter="16">
        <template v-for="flatField in config.fields" :key="flatField.key">
          <el-col :span="calculateColSpan(flatField, config.columns)">
            <FormFieldRenderer :field="flatField" :form-data="formData" @change="handleFieldChange" />
          </el-col>
        </template>
      </el-row>
    </template>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, defineComponent, h } from 'vue';
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElSwitch,
  ElDatePicker,
  ElTable,
  ElTableColumn,
  ElButton,
  ElRow,
  ElCol,
  ElCollapse,
  ElCollapseItem,
  type FormInstance,
  type FormRules
} from 'element-plus';
// import SelectTable from './SelectTable.vue';
import type { DynamicFormConfig, DynamicFieldConfig } from '../types';

export interface Props {
  config: DynamicFormConfig;
  modelValue?: Record<string, unknown>;
}

export interface Emits {
  (e: 'update:modelValue', value: Record<string, unknown>): void;
  (e: 'change', field: string, value: unknown): void;
  (e: 'validate', valid: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({})
});

const emit = defineEmits<Emits>();

// 表单引用
const formRef = ref<FormInstance>();

// 表单数据
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formData = reactive<Record<string, any>>({});

// 折叠面板状态
const activeCollapse = reactive<Record<string, string>>({});

// 初始化折叠面板状态
const initCollapseState = () => {
  if (props.config.groups) {
    props.config.groups.forEach((group) => {
      if (group.collapsible && !group.defaultCollapsed) {
        activeCollapse[group.key] = group.key;
      }
    });
  }
};

// 计算列跨度
const calculateColSpan = (field: DynamicFieldConfig, groupColumns?: number): number => {
  // 如果字段指定了 col，直接使用
  if (field.col) {
    return field.col;
  }

  // 根据分组或全局的 columns 配置计算
  const columns = groupColumns || props.config.columns || 1;
  return 24 / columns;
};

// 初始化表单数据
const initFormData = () => {
  const allFields = getAllFields();

  allFields.forEach((field) => {
    if (props.modelValue && field.key in props.modelValue) {
      formData[field.key] = props.modelValue[field.key];
    } else if (field.defaultValue !== undefined) {
      formData[field.key] = field.defaultValue;
    } else {
      // 根据字段类型设置默认值
      switch (field.type) {
        case 'text':
        case 'textarea':
          formData[field.key] = '';
          break;
        case 'number':
          formData[field.key] = 0;
          break;
        case 'select':
          formData[field.key] = undefined;
          break;
        case 'boolean':
          formData[field.key] = false;
          break;
        case 'date':
          formData[field.key] = null;
          break;
        case 'table':
        case 'list':
          formData[field.key] = [];
          break;
        default:
          formData[field.key] = undefined;
      }
    }
  });
};

// 获取所有字段（包括分组内的）
const getAllFields = (): DynamicFieldConfig[] => {
  if (props.config.groups) {
    return props.config.groups.flatMap((group) => group.fields);
  }
  return props.config.fields || [];
};

// 构建验证规则
const buildRules = (field: DynamicFieldConfig): FormRules[string] => {
  const rules: Array<Record<string, unknown>> = [];

  if (field.required) {
    rules.push({
      required: true,
      message: `${field.label}不能为空`,
      trigger: 'change'
    });
  }

  if (field.rules) {
    field.rules.forEach((rule) => {
      const elRule: Record<string, unknown> = {
        trigger: rule.trigger || 'change'
      };

      if (rule.required !== undefined) {
        elRule.required = rule.required;
      }

      if (rule.message) {
        elRule.message = rule.message;
      }

      if (rule.validator) {
        elRule.validator = (_rule: unknown, value: unknown, callback: (error?: string | Error) => void) => {
          const result = rule.validator?.(value);
          if (result instanceof Promise) {
            result
              .then((valid) => {
                if (valid === true) {
                  callback();
                } else {
                  callback(new Error(typeof valid === 'string' ? valid : '验证失败'));
                }
              })
              .catch(() => {
                callback(new Error('验证失败'));
              });
          } else if (result === true) {
            callback();
          } else {
            callback(new Error(typeof result === 'string' ? result : '验证失败'));
          }
        };
      }

      rules.push(elRule);
    });
  }

  return rules as FormRules[string];
};

// 添加表格行
const addTableRow = (fieldKey: string, field: DynamicFieldConfig) => {
  if (!formData[fieldKey]) {
    formData[fieldKey] = [];
  }

  const newRow = field.childTemplate ? { ...field.childTemplate } : {};

  if (field.tableColumns) {
    field.tableColumns.forEach((col) => {
      if (!(col.key in newRow)) {
        newRow[col.key] = '';
      }
    });
  }

  formData[fieldKey].push(newRow as unknown);
  handleFieldChange(fieldKey);
};

// 删除表格行
const removeTableRow = (fieldKey: string, index: number) => {
  if (formData[fieldKey] && Array.isArray(formData[fieldKey])) {
    formData[fieldKey].splice(index, 1);
    handleFieldChange(fieldKey);
  }
};

// 添加列表项
const addListItem = (fieldKey: string, field: DynamicFieldConfig) => {
  if (!formData[fieldKey]) {
    formData[fieldKey] = [];
  }

  const newItem = field.childTemplate ? { ...field.childTemplate } : field.listItemType === 'select' ? undefined : '';
  formData[fieldKey].push(newItem);
  handleFieldChange(fieldKey);
};

// 删除列表项
const removeListItem = (fieldKey: string, index: number) => {
  if (formData[fieldKey] && Array.isArray(formData[fieldKey])) {
    formData[fieldKey].splice(index, 1);
    handleFieldChange(fieldKey);
  }
};

// 字段变化处理
const handleFieldChange = (field: string) => {
  emit('update:modelValue', { ...formData });
  emit('change', field, formData[field]);
};

// 验证表单
const validate = async (): Promise<boolean> => {
  if (!formRef.value) return false;

  try {
    await formRef.value.validate();
    emit('validate', true);
    return true;
  } catch {
    emit('validate', false);
    return false;
  }
};

// 重置表单
const resetFields = () => {
  formRef.value?.resetFields();
};

// 清空验证
const clearValidate = () => {
  formRef.value?.clearValidate();
};

// 字段渲染器组件
const FormFieldRenderer = defineComponent({
  name: 'FormFieldRenderer',
  props: {
    field: {
      type: Object as () => DynamicFieldConfig,
      required: true
    },
    formData: {
      type: Object as () => Record<string, unknown>,
      required: true
    }
  },
  emits: ['change'],
  setup(props, { emit }) {
    const onFieldChange = () => {
      emit('change', props.field.key);
    };

    const onAddListItem = () => {
      addListItem(props.field.key, props.field);
    };

    const onRemoveListItem = (index: number) => {
      removeListItem(props.field.key, index);
    };

    const onAddTableRow = () => {
      addTableRow(props.field.key, props.field);
    };

    const onRemoveTableRow = (index: number) => {
      removeTableRow(props.field.key, index);
    };

    return () => {
      const { field, formData } = props;
      const rules = buildRules(field);

      // 文本框
      if (field.type === 'text') {
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
          {
            default: () =>
              h(ElInput, {
                modelValue: formData[field.key] as string,
                'onUpdate:modelValue': (val: string | number) => {
                  formData[field.key] = val;
                  onFieldChange();
                },
                placeholder: field.placeholder,
                disabled: field.disabled
              })
          }
        );
      }

      // 多行文本
      if (field.type === 'textarea') {
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
          {
            default: () =>
              h(ElInput, {
                modelValue: formData[field.key] as string,
                'onUpdate:modelValue': (val: string | number) => {
                  formData[field.key] = val;
                  onFieldChange();
                },
                type: 'textarea',
                rows: 3,
                placeholder: field.placeholder,
                disabled: field.disabled
              })
          }
        );
      }

      // 数字输入
      if (field.type === 'number') {
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
          {
            default: () =>
              h(ElInputNumber, {
                modelValue: formData[field.key] as number,
                'onUpdate:modelValue': (val: number | undefined) => {
                  formData[field.key] = val;
                  onFieldChange();
                },
                placeholder: field.placeholder,
                disabled: field.disabled,
                controlsPosition: 'right',
                style: 'width: 100%'
              })
          }
        );
      }

      // 下拉列表
      if (field.type === 'select') {
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
          {
            default: () =>
              h(
                ElSelect,
                {
                  modelValue: formData[field.key] as string | number | boolean | Record<string, unknown>,
                  'onUpdate:modelValue': (val: string | number | boolean | Record<string, unknown>) => {
                    formData[field.key] = val;
                    onFieldChange();
                  },
                  placeholder: field.placeholder,
                  disabled: field.disabled,
                  style: 'width: 100%'
                },
                {
                  default: () =>
                    field.options?.map((opt) =>
                      h(ElOption, {
                        key: opt.value as string | number,
                        label: opt.label,
                        value: opt.value,
                        disabled: Boolean(opt.disabled)
                      })
                    )
                }
              )
          }
        );
      }

      // // 表格下拉选择器
      // if (field.type === 'select-table') {
      //   if (!field.selectTableConfig) {
      //     return null;
      //   }
      //   return h(
      //     ElFormItem,
      //     { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
      //     {
      //       default: () =>
      //         h(SelectTable, {
      //           modelValue: formData[field.key] as string | number | undefined,
      //           'onUpdate:modelValue': (val: string | number | undefined) => {
      //             formData[field.key] = val;
      //             onFieldChange();
      //           },
      //           options: (field.options || []) as never[],
      //           config: field.selectTableConfig as never,
      //           placeholder: field.placeholder ?? '',
      //           disabled: Boolean(field.disabled),
      //           'onOptions-change': (newOptions: unknown[]) => {
      //             // 更新 options
      //             if (field.options) {
      //               field.options.length = 0;
      //               field.options.push(...(newOptions as never[]));
      //             }
      //           }
      //         })
      //     }
      //   );
      // }

      // 开关
      if (field.type === 'boolean') {
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
          {
            default: () =>
              h(ElSwitch, {
                modelValue: formData[field.key] as boolean,
                'onUpdate:modelValue': (val: boolean | string | number) => {
                  formData[field.key] = val;
                  onFieldChange();
                },
                disabled: Boolean(field.disabled)
              })
          }
        );
      }

      // 日期选择
      if (field.type === 'date') {
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth },
          {
            default: () =>
              h(ElDatePicker, {
                modelValue: formData[field.key] as Date | string | number,
                'onUpdate:modelValue': (val: Date | string | number) => {
                  formData[field.key] = val;
                  onFieldChange();
                },
                type: 'date',
                placeholder: field.placeholder ?? '',
                disabled: Boolean(field.disabled),
                style: 'width: 100%'
              })
          }
        );
      }

      // 列表
      if (field.type === 'list') {
        const items = (formData[field.key] as unknown[]) || [];
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth, class: 'list-field-item' },
          {
            default: () =>
              h('div', { class: 'list-field-container' }, [
                ...items.map((_item: unknown, index: number) =>
                  h('div', { key: index, class: 'list-item' }, [
                    field.listItemType === 'select'
                      ? h(
                          ElSelect,
                          {
                            modelValue: (formData[field.key] as unknown[])[index] as
                              | string
                              | number
                              | boolean
                              | Record<string, unknown>,
                            'onUpdate:modelValue': (val: string | number | boolean | Record<string, unknown>) => {
                              (formData[field.key] as unknown[])[index] = val;
                              onFieldChange();
                            },
                            placeholder: field.placeholder || '请选择',
                            disabled: Boolean(field.disabled),
                            style: 'width: 100%'
                          },
                          {
                            default: () =>
                              field.options?.map((opt) =>
                                h(ElOption, {
                                  key: opt.value as string | number,
                                  label: opt.label,
                                  value: opt.value,
                                  disabled: Boolean(opt.disabled)
                                })
                              )
                          }
                        )
                      : h(ElInput, {
                          modelValue: (formData[field.key] as unknown[])[index] as string,
                          'onUpdate:modelValue': (val: string | number) => {
                            (formData[field.key] as unknown[])[index] = val;
                            onFieldChange();
                          },
                          placeholder: field.placeholder,
                          disabled: field.disabled
                        }),
                    h(
                      ElButton,
                      {
                        type: 'danger',
                        size: 'small',
                        text: true,
                        class: 'list-item-delete',
                        onClick: () => onRemoveListItem(index)
                      },
                      { default: () => '删除' }
                    )
                  ])
                ),
                field.canAddChild
                  ? h(
                      ElButton,
                      {
                        type: 'primary',
                        size: 'small',
                        class: 'add-list-item-btn',
                        onClick: onAddListItem
                      },
                      { default: () => '+ Child' }
                    )
                  : null
              ])
          }
        );
      }

      // 表格
      if (field.type === 'table') {
        const tableData = (formData[field.key] as Record<string, unknown>[]) || [];
        return h(
          ElFormItem,
          { label: field.label, prop: field.key, rules, labelWidth: field.labelWidth, class: 'table-field-item' },
          {
            default: () =>
              h('div', { class: 'table-field-container' }, [
                h(
                  ElTable as never,
                  { data: tableData, border: true, style: { width: '100%' }, maxHeight: 400 },
                  {
                    default: () => [
                      ...(field.tableColumns?.map((column) =>
                        h(
                          ElTableColumn as never,
                          {
                            key: column.key,
                            prop: column.key,
                            label: column.title,
                            width: column.width,
                            align: column.align || 'left'
                          },
                          {
                            default: (scope: { row: Record<string, unknown>; $index: number }) =>
                              h(ElInput, {
                                modelValue: scope.row[column.key] as string,
                                'onUpdate:modelValue': (val: string | number) => {
                                  scope.row[column.key] = val;
                                  onFieldChange();
                                },
                                size: 'small'
                              })
                          }
                        )
                      ) || []),
                      h(
                        ElTableColumn as never,
                        { label: '操作', width: 80, align: 'center', fixed: 'right' },
                        {
                          default: (scope: { $index: number }) =>
                            h(
                              ElButton,
                              {
                                type: 'danger',
                                size: 'small',
                                text: true,
                                onClick: () => onRemoveTableRow(scope.$index)
                              },
                              { default: () => '删除' }
                            )
                        }
                      )
                    ]
                  }
                ),
                field.canAddChild
                  ? h(
                      ElButton,
                      {
                        type: 'primary',
                        size: 'small',
                        class: 'add-child-btn',
                        onClick: onAddTableRow
                      },
                      { default: () => '+ Child' }
                    )
                  : null
              ])
          }
        );
      }

      return null;
    };
  }
});

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      Object.keys(newVal).forEach((key) => {
        formData[key] = newVal[key];
      });
    }
  },
  { deep: true }
);

// 监听 config 变化，重新初始化
watch(
  () => props.config,
  () => {
    initFormData();
    initCollapseState();
  },
  { deep: true }
);

// 初始化
onMounted(() => {
  initFormData();
  initCollapseState();
});

// 暴露方法供父组件调用
defineExpose({
  validate,
  resetFields,
  clearValidate,
  formData
});
</script>

<style scoped>
.dynamic-form {
  width: 100%;
}

.form-group {
  margin-bottom: 24px;
}

.group-container {
  padding: 16px;
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: 4px;
  background-color: var(--vscode-editor-background, #1e1e1e);
}

.group-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.group-collapse {
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: 4px;
  background-color: var(--vscode-editor-background, #1e1e1e);
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.table-field-item,
.list-field-item {
  margin-bottom: 22px;
}

.table-field-container,
.list-field-container {
  width: 100%;
}

.list-field-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-item-delete {
  flex-shrink: 0;
}

.add-child-btn,
.add-list-item-btn {
  margin-top: 12px;
}

/* 适配 VSCode 主题 */
:deep(.el-form-item__label) {
  color: var(--vscode-foreground);
}

:deep(.el-input__inner) {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-color: var(--vscode-input-border);
}

:deep(.el-table) {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

:deep(.el-table__header) {
  background-color: var(--vscode-editor-background);
}

:deep(.el-table th) {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
}

:deep(.el-table td) {
  border-color: var(--vscode-panel-border);
}

:deep(.el-table tr) {
  background-color: var(--vscode-editor-background);
}

:deep(.el-table--border) {
  border-color: var(--vscode-panel-border);
}

:deep(.el-table--border::after) {
  background-color: var(--vscode-panel-border);
}

:deep(.el-table::before) {
  background-color: var(--vscode-panel-border);
}

:deep(.el-collapse) {
  border-color: var(--vscode-panel-border);
}

:deep(.el-collapse-item__header) {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border-color: var(--vscode-panel-border);
}

:deep(.el-collapse-item__wrap) {
  background-color: var(--vscode-editor-background);
  border-color: var(--vscode-panel-border);
}

:deep(.el-collapse-item__content) {
  padding: 16px;
}
</style>
