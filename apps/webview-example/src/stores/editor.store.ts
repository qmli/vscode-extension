import type { FormFieldEntry } from '@orientais/webview-core';
import type { EditorViewKind, NodeAttrs } from '@shared/webviews/models/nodeData';
import type { FolderTableRow } from '@shared/webviews/protocol/editor/editorForm.protocol';
import type { FormValidateFailure } from 'element-plus';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { isSameFieldValue, transNodeAttrsToFormData } from '@/utils/editorForm.utils';

export type EditorFormData = Record<string, unknown>;

export const useEditorStore = defineStore('editorStore', () => {
  /**
   * 模型表单表单数据
   */
  const nodeId = ref<string>('');
  const viewType = ref<EditorViewKind>('form');
  const formSchema = ref<FormFieldEntry[]>([]);
  const formData = ref<EditorFormData>({});
  const formValidateErrors = ref<FormValidateFailure['fields'] | undefined>();
  const folderTableRows = ref<FolderTableRow[]>([]);
  const loading = ref<boolean>(false);

  /**
   * 对 schema 做统一排序。
   * 根据 lowerBound 排序
   */
  function orderFormSchema(schema: FormFieldEntry[]): FormFieldEntry[] {
    return [...schema].sort((a, b) => Number(b.lowerBound || '0') - Number(a.lowerBound || '0'));
  }

  /**
   * 初始化编辑器表单数据。
   * 后端 attrs 会先被拆成 schema/data，再在这里完成统一排序与运行时归一化落库。
   */
  function initEditorData(_nodeId: string, attrs: NodeAttrs) {
    nodeId.value = _nodeId;
    viewType.value = 'form';
    formValidateErrors.value = undefined;
    formSchema.value = [];
    formData.value = {};
    folderTableRows.value = [];

    const { schema, data } = transNodeAttrsToFormData(attrs);

    formSchema.value = orderFormSchema(schema);
    formData.value = data;
  }

  /**
   * 初始化文件夹节点的列表数据。
   * 进入列表态时需要清空主表单残留，避免上一节点表单在切换瞬间继续显示。
   */
  function initFolderTableData(_nodeId: string, rows: FolderTableRow[]) {
    nodeId.value = _nodeId;
    viewType.value = 'folder-table';
    formSchema.value = [];
    formData.value = {};
    formValidateErrors.value = undefined;
    folderTableRows.value = rows;
  }

  /**
   * 重置当前编辑器状态，适用于节点切换前的视图清空场景。
   * 在请求发出前就写入目标视图类型，这样渲染层可以直接进入正确骨架，避免先闪出另一种视图。
   */
  function resetEditorData(_nodeId: string = '', nextViewType: EditorViewKind = 'form') {
    nodeId.value = _nodeId;
    viewType.value = nextViewType;
    formSchema.value = [];
    formData.value = {};
    formValidateErrors.value = undefined;
    folderTableRows.value = [];
  }

  function setLoading(value: boolean) {
    loading.value = value;
  }

  /**
   * 整体更新编辑器表单数据，适用于表单数据变更后需要整体刷新表单的场景。
   * @param attrs 数据变更后后台返回的最新数据
   */
  function updateEditorData(curEditAttrName: string, attrs: NodeAttrs) {
    const { schema, data: nextFormData } = transNodeAttrsToFormData(attrs);

    Object.keys(nextFormData).forEach((key) => {
      // 如果当前字段正在编辑，且服务端返回数据与当前值相同，则跳过
      if (key === curEditAttrName && isSameFieldValue(formData.value[key], nextFormData[key])) {
        return;
      }

      // 只有当服务端数据与当前值不同时才更新，以避免不必要的视图刷新
      if (!isSameFieldValue(formData.value[key], nextFormData[key])) {
        formData.value[key] = nextFormData[key];
      }
    });

    // TODO: formSchema 是否也需要增量更新？目前的想法是，更改后端的update接口，只返回变更的字段，这样可以减少前端大量的计算
    formSchema.value = orderFormSchema(schema);
  }

  /**
   * 合并后端返回的字段 patch。
   * 这里只更新受影响字段，避免 patch 响应把整份 schema 重建后打断当前输入态。
   */
  function applyChangedAttrs(curEditAttrName: string, attrs: NodeAttrs) {
    if (attrs.length === 0) {
      return;
    }

    const { schema, data: nextFormData } = transNodeAttrsToFormData(attrs);

    schema.forEach((field) => {
      const index = formSchema.value.findIndex((item) => item.id === field.id);
      if (index === -1) {
        formSchema.value.push(field);
        return;
      }

      formSchema.value[index] = field;
    });

    Object.entries(nextFormData).forEach(([key, value]) => {
      // 当前字段仍以本地编辑态优先，只有后端明确返回不同值时才覆盖，避免光标和输入法被无意义重置。
      if (key === curEditAttrName && isSameFieldValue(formData.value[key], value)) {
        return;
      }

      if (!isSameFieldValue(formData.value[key], value)) {
        formData.value[key] = value;
      }
    });

    formSchema.value = orderFormSchema(formSchema.value);
  }

  /**
   * 更新单个表单字段。
   */
  function updateFormField(id: string, prop: string, value: unknown) {
    const field = formSchema.value.find((item) => item.id === id);
    if (field?.name !== prop) {
      return;
    }

    if (isSameFieldValue(formData.value[prop], value)) {
      return;
    }

    formData.value[prop] = value;
  }

  /**
   * 更新表单校验失败错误，并实时触发Tree组件的错误更新提示
   */
  function updateFormValidateErrors(errors?: FormValidateFailure['fields']) {
    formValidateErrors.value = errors;
  }

  return {
    nodeId: nodeId,
    viewType: viewType,
    formSchema: formSchema,
    formData: formData,
    formValidateErrors: formValidateErrors,
    folderTableRows: folderTableRows,
    loading: loading,
    initEditorData: initEditorData,
    initFolderTableData: initFolderTableData,
    resetEditorData: resetEditorData,
    setLoading: setLoading,
    updateEditorData: updateEditorData,
    applyChangedAttrs: applyChangedAttrs,
    updateFormField: updateFormField,
    updateFormValidateErrors: updateFormValidateErrors
  };
});
