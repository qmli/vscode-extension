<script lang="ts">
import { defineComponent, h, toRaw } from 'vue';
import { DocumentCopy, QuestionFilled } from '@element-plus/icons-vue';
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTag,
  ElText,
  ElTooltip
} from 'element-plus';
import type { FormItemRule } from 'element-plus';
import type { FormFieldEntry, SelectTableFetchParams, SelectTableHeader, SelectTableResult } from '../types';
import SelectTable from './SelectTable.vue';

interface FieldOptionItem {
  name?: string;
  label: string;
  value?: unknown;
}

export default defineComponent({
  name: 'FormFieldItem',

  props: {
    item: { type: Object as () => FormFieldEntry, required: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dynamicForm: { type: Object as () => Record<string, any>, required: true },
    hasLabel: { type: Boolean, default: true },
    size: { type: String, default: 'small' },
    placeholder: { type: String, default: '' },
    hideHandle: {
      type: Function as unknown as () => (item: FormFieldEntry) => boolean,
      default: () => () => false
    },
    rulesHandle: {
      type: Function as unknown as () => (item: FormFieldEntry) => FormItemRule[],
      default: () => () => []
    },
    updateName: {
      type: Function as unknown as () => (name: string) => void,
      default: () => () => {}
    },
    updateNode: {
      type: Function as unknown as () =>
        | ((item: FormFieldEntry) => void)
        | ((id: string, prop: string, isWrite: boolean) => void),
      default: () => () => {}
    },
    sendMessage: {
      type: Function as unknown as () => (message: string) => void,
      default: () => () => {}
    },
    onFieldFocus: {
      type: Function as unknown as () => (item: FormFieldEntry) => void,
      default: () => () => {}
    },
    onFieldBlur: {
      type: Function as unknown as () => (item: FormFieldEntry) => void,
      default: () => () => {}
    },
    copyHandler: {
      type: Function as unknown as () => (longName: string, value: string) => void,
      default: undefined
    },
    fetchData: {
      type: Function as unknown as () => (params: SelectTableFetchParams) => Promise<SelectTableResult>,
      default: undefined
    }
  },

  emits: ['copy', 'select-link', 'search'],

  setup(props, { emit, slots }) {
    const handleCopy = (longName: string, value: string): void => {
      if (props.copyHandler) {
        props.copyHandler(longName, value);
      } else {
        emit('copy', longName, value);
      }
    };

    const handleSelectLink = (id: string): void => {
      emit('select-link', id);
    };

    const handleSearch = (keyword: string): void => {
      emit('search', keyword);
    };

    // 兼容旧版 updateNode(id, prop, isWrite?) -> 新版 updateNode(item: FormFieldEntry)
    let didWarnUpdateNodeCompat = false;
    const callUpdateNode = (item: FormFieldEntry): void => {
      const updateNode = props.updateNode as unknown as ((...args: unknown[]) => unknown) | undefined;
      if (!updateNode) return;

      // function.length：新签名为 1（item），旧签名为 >= 2（id, prop）
      if (updateNode.length >= 2) {
        if (!didWarnUpdateNodeCompat) {
          didWarnUpdateNodeCompat = true;
          console.warn(
            '[webview-core] updateNode(id, prop, isWrite?) 已废弃，请改用 updateNode(item: FormFieldEntry)。'
          );
        }

        // 新签名中没有 isWrite 语义，这里保持旧版默认行为：false
        (updateNode as (id: string, prop: string, isWrite: boolean) => void)(item.id, item.name, false);
        return;
      }

      (updateNode as (item: FormFieldEntry) => void)({ ...item, value: props.dynamicForm[item.name] });
    };

    const buildLabelSlot = (item: FormFieldEntry) => {
      const hasTooltip = !!(item.description || item.tips || item.constraintDesc);

      const tooltipNode = hasTooltip
        ? h(
            ElTooltip,
            { popperStyle: { maxWidth: '300px' } },
            {
              default: () => h(ElIcon, {}, { default: () => h(QuestionFilled) }),
              content: () => {
                const parts: ReturnType<typeof h>[] = [];
                if (item.description || item.tips) {
                  parts.push(h('span', {}, item.description || item.tips));
                }
                if ((item.description || item.tips) && item.constraintDesc) {
                  parts.push(h('br'));
                  parts.push(h('br'));
                }
                if (item.constraintDesc) {
                  parts.push(h('span', {}, 'UI约束规则：'));
                  item.constraintDesc.split('%-%').forEach((rule: string, idx: number) => {
                    parts.push(h('span', { key: idx }, [h('br'), rule]));
                  });
                }
                return parts;
              }
            }
          )
        : null;

      return () =>
        h('div', { class: 'label-title' }, [
          props.hasLabel ? h(ElText, { class: 'check' }, { default: () => [item.label, tooltipNode] }) : null
        ]);
    };

    const buildFieldContent = (item: FormFieldEntry) => {
      const { dynamicForm, placeholder } = props;

      if (item.component === 'text') {
        const appendSlots = item.longName
          ? {
              append: () =>
                h(
                  ElTooltip,
                  { content: 'Copy FQN' },
                  {
                    default: () =>
                      h(ElButton, {
                        type: 'primary',
                        icon: DocumentCopy,
                        onClick: () => handleCopy(item.longName ?? '', dynamicForm[item.name] ?? '')
                      })
                  }
                )
            }
          : undefined;

        return h(
          ElInput,
          {
            modelValue: dynamicForm[item.name],
            'onUpdate:modelValue': (val: string) => {
              dynamicForm[item.name] = typeof val === 'string' ? val.trim() : val;
              //item.value = dynamicForm[item.name];
            },
            maxlength: item?.options?.maxlength,
            placeholder: item?.options?.placeholder,
            clearable: true,
            showWordLimit: true,
            disabled: !!item?.disabled,
            onFocus: () => {
              props.updateName?.(item?.name);
              props.onFieldFocus?.(toRaw(item));
            },
            onBlur: () => props.onFieldBlur?.(toRaw(item)),
            onInput: () => callUpdateNode(toRaw(item))
          },
          appendSlots
        );
      }

      if (item.component === 'checkbox') {
        return ((item?.options?.items ?? []) as FieldOptionItem[]).map((_item, _index) =>
          h(ElCheckbox, {
            key: _index,
            modelValue: _item.name ? dynamicForm[_item.name] : undefined,
            'onUpdate:modelValue': (val: unknown) => {
              if (_item.name) {
                dynamicForm[_item.name] = val;
                //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
              }
            },
            label: _item.label,
            trueLabel: 'true',
            disabled: !!item?.disabled,
            onChange: () => callUpdateNode(toRaw(item)),
            onFocus: () => {
              props.updateName?.(item?.name);
              props.onFieldFocus?.(toRaw(item));
            },
            onBlur: () => props.onFieldBlur?.(toRaw(item))
          })
        );
      }

      if (item.component === 'checkboxGroup') {
        return h(
          ElCheckboxGroup,
          {
            modelValue: (dynamicForm[item?.name] ?? []) as (string | number)[],
            'onUpdate:modelValue': (val: (string | number)[]) => {
              dynamicForm[item?.name] = val;
              //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
            },
            disabled: !!item?.disabled,
            onChange: () => callUpdateNode(toRaw(item)),
            onFocus: () => {
              props.updateName?.(item?.name);
              props.onFieldFocus?.(toRaw(item));
            },
            onBlur: () => props.onFieldBlur?.(toRaw(item))
          },
          {
            default: () =>
              ((item?.options?.items ?? []) as FieldOptionItem[]).map((_item) =>
                h(ElCheckbox, {
                  key: String(_item.value),
                  label: _item.label,
                  value: _item.value as string | number
                })
              )
          }
        );
      }

      if (item.component === 'switch') {
        return h(ElSwitch, {
          modelValue: dynamicForm[item?.name] as string | boolean | number,
          'onUpdate:modelValue': (val: string | boolean | number) => {
            dynamicForm[item?.name] = val;
            //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
          },
          style: '--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949',
          disabled: !!item?.disabled,
          inlinePrompt: true,
          activeValue: 'T',
          inactiveValue: 'F',
          activeText: 'T',
          inactiveText: 'F',
          onChange: () => callUpdateNode(toRaw(item))
        });
      }

      if (item.component === 'select') {
        return h('div', { class: 'select-switch' }, [
          h(
            ElSelect,
            {
              modelValue: dynamicForm[item?.name] as string | number | boolean | Record<string, unknown>,
              'onUpdate:modelValue': (val: string | number | boolean | Record<string, unknown>) => {
                dynamicForm[item?.name] = val;
                //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
              },
              multiple: item?.options?.multiple ?? false,
              placeholder: placeholder,
              disabled: !!item?.disabled,
              clearable: true,
              filterable: true,
              style: 'width: 100%',
              onChange: () => callUpdateNode(toRaw(item)),
              onFocus: () => {
                props.updateName?.(item?.name);
                props.onFieldFocus?.(toRaw(item));
              },
              onBlur: () => props.onFieldBlur?.(toRaw(item))
            },
            {
              default: () =>
                ((item?.options?.items ?? []) as FieldOptionItem[]).map((option) =>
                  h(ElOption, {
                    key: String(option.value),
                    label: option.label,
                    value: option.value as string | number | boolean
                  })
                )
            }
          )
        ]);
      }

      if (item.component === 'number') {
        return h(ElInputNumber, {
          modelValue: dynamicForm[item?.name] as number | undefined,
          'onUpdate:modelValue': (val: number | undefined) => {
            dynamicForm[item?.name] = val;
            //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
          },
          controlsPosition: 'right',
          style: 'width: 100%',
          disabled: !!item?.disabled,
          onChange: () => callUpdateNode(toRaw(item)),
          onFocus: () => {
            props.updateName?.(item?.name);
            props.onFieldFocus?.(toRaw(item));
          },
          onBlur: () => props.onFieldBlur?.(toRaw(item))
        });
      }

      if (item.component === 'radio') {
        return [
          h('input', { id: item.name, type: 'hidden', value: 'radio' }),
          h(
            ElRadioGroup,
            {
              modelValue: dynamicForm[item?.name] as string | number | boolean,
              'onUpdate:modelValue': (val: string | number | boolean | undefined) => {
                if (val !== undefined) {
                  dynamicForm[item?.name] = val;
                  //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
                }
              },
              disabled: !!item?.disabled
            },
            {
              default: () =>
                ((item?.options?.items ?? []) as FieldOptionItem[]).map((_item) =>
                  h(
                    ElRadio,
                    {
                      key: String(_item.value),
                      label: _item.label,
                      onChange: () => callUpdateNode(toRaw(item)),
                      onFocus: () => {
                        props.updateName?.(item?.name);
                        props.onFieldFocus?.(toRaw(item));
                      },
                      onBlur: () => props.onFieldBlur?.(toRaw(item))
                    },
                    { default: () => _item.label }
                  )
                )
            }
          )
        ];
      }

      if (item.component === 'draft') {
        const draft = item.options?.draft;
        // 将 DraftHeader[] 映射为 SelectTable 的 SelectTableHeader[]
        const headers: SelectTableHeader[] = (draft?.headers ?? []).map((col) => ({
          prop: col.prop,
          label: col.label,
          width: col.width,
          hide: col.hide
        }));
        return h(SelectTable, {
          modelValue: dynamicForm[item.name],
          disabled: !!item.disabled,
          clearable: true,
          multiple: draft?.multiple ?? false,
          headers,
          labelKey: draft?.label || 'label',
          valueKey: draft?.value || 'id',
          resultKeys: draft?.result ?? [],
          extraParams: { iType: draft?.iType, attrId: item.id },
          // fetchData 优先使用顶层注入的 prop，其次使用 DraftConfig 中的配置
          fetchData:
            (props.fetchData as ((params: SelectTableFetchParams) => Promise<SelectTableResult>) | undefined) ??
            draft?.fetchData,
          'onUpdate:modelValue': (val: unknown) => {
            dynamicForm[item.name] = val;
            //item.value = val; // 同步更新 item.value，保持与 dynamicForm 的一致性
            callUpdateNode(toRaw(item));
          },
          'onSelect-link': handleSelectLink,
          onSearch: handleSearch
        });
      }

      if (item.component === 'formTable') {
        return [
          h('input', { id: item.name, type: 'hidden', value: 'formTable' }),
          slots.formTable
            ? slots.formTable({
                item: toRaw(item),
                modelValue: dynamicForm[item?.name],
                onChange: () => callUpdateNode(toRaw(item)),
                onFocus: () => {
                  props.updateName?.(item?.name);
                  props.onFieldFocus?.({ ...toRaw(item), value: dynamicForm[item?.name] });
                },
                onBlur: () => props.onFieldBlur?.(toRaw(item))
              })
            : h(ElTag, { type: 'warning' }, { default: () => '[formTable] 请通过 #formTable 插槽提供组件' })
        ];
      }

      return h(ElTag, { type: 'danger' }, { default: () => `[${item.component}] Component not found` });
    };

    return () => {
      const { item } = props;

      if (!item?.rules) return null;

      return h(
        ElFormItem,
        {
          prop: item.name,
          rules: props.rulesHandle?.(toRaw(item))
        },
        {
          label: buildLabelSlot(item),
          default: () => buildFieldContent(item)
        }
      );
    };
  }
});
</script>

<style scoped lang="scss">
.is-required {
  .check::before {
    content: '*';
    color: var(--el-color-danger);
    margin-right: 4px;
  }
}

.label-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-switch {
  width: 100%;
  display: flex;
  justify-content: space-between;
}

:deep(.el-form-item__content) {
  justify-content: space-around;
}
</style>
