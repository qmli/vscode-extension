import type { NodeAttrs } from '@shared/webviews/models/nodeData';
import type {
  EditorFocusTarget,
  SimpleObjectGroupSummary,
  SimpleObjectRow
} from '@shared/webviews/protocol/editor/editorForm.protocol';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useEditorSimpleNodesStore = defineStore('editorSimpleNodesStore', () => {
  const ownerNodeId = ref('');
  const groups = ref<SimpleObjectGroupSummary[]>([]);
  const rowsByTemplateId = ref<Record<string, SimpleObjectRow[]>>({});
  const loadingGroups = ref(false);
  const loadingRows = ref<Record<string, boolean>>({});
  const creatingByTemplateId = ref<Record<string, boolean>>({});
  const rowValidateErrors = ref<Record<string, true>>({});
  const pendingFocusTarget = ref<EditorFocusTarget | undefined>();

  /**
   * 按 owner 节点重置 Simple Objects 状态。
   */
  function reset(ownerId: string = ''): void {
    const focusTarget = pendingFocusTarget.value;

    ownerNodeId.value = ownerId;
    groups.value = [];
    rowsByTemplateId.value = {};
    loadingGroups.value = false;
    loadingRows.value = {};
    creatingByTemplateId.value = {};
    rowValidateErrors.value = {};

    // 跳转到 simple row 时，节点切换前会先把 owner Form Node 设为 active。
    // 这里不能在 reset 时直接清掉目标，否则后续的自动展开与滚动定位链路会被中断。
    if (focusTarget?.type === 'simple-row' && focusTarget.ownerNodeId === ownerId) {
      pendingFocusTarget.value = focusTarget;
      return;
    }

    pendingFocusTarget.value = undefined;
  }

  /**
   * 初始化当前 owner 节点的 Simple Node 分组。
   * 当 owner 切换时，这里会同步清空旧 rows 和错误状态，避免跨节点串态。
   */
  function initGroups(ownerId: string, nextGroups: SimpleObjectGroupSummary[]): void {
    const ownerChanged = ownerNodeId.value !== ownerId;

    ownerNodeId.value = ownerId;
    groups.value = nextGroups;
    loadingGroups.value = false;

    if (ownerChanged) {
      rowsByTemplateId.value = {};
      loadingRows.value = {};
      creatingByTemplateId.value = {};
      rowValidateErrors.value = {};
    }

    if (pendingFocusTarget.value?.type === 'simple-row' && pendingFocusTarget.value.ownerNodeId !== ownerId) {
      pendingFocusTarget.value = undefined;
    }
  }

  /**
   * 设置分组加载状态。
   */
  function setGroupsLoading(value: boolean): void {
    loadingGroups.value = value;
  }

  /**
   * 设置指定分组 rows 的加载状态。
   */
  function setRowsLoading(templateId: string, value: boolean): void {
    loadingRows.value = {
      ...loadingRows.value,
      [templateId]: value
    };
  }

  /**
   * 设置指定分组的创建中状态，作为新增按钮防重的主防线。
   */
  function setCreating(templateId: string, value: boolean): void {
    creatingByTemplateId.value = {
      ...creatingByTemplateId.value,
      [templateId]: value
    };
  }

  /**
   * 写入指定分组的 rows，并清理该分组旧的前端校验结果。
   */
  function setRows(templateId: string, rows: SimpleObjectRow[]): void {
    const previousRows = rowsByTemplateId.value[templateId] ?? [];

    rowsByTemplateId.value = {
      ...rowsByTemplateId.value,
      [templateId]: rows
    };
    clearRowValidateErrors(previousRows);
  }

  /**
   * 合并指定 row 的字段 patch。
   */
  function applyRowChangedAttrs(templateId: string, rowNodeId: string, changedAttrs: NodeAttrs): boolean {
    const rows = rowsByTemplateId.value[templateId] ?? [];
    const rowIndex = rows.findIndex((row) => row.nodeId === rowNodeId);
    if (rowIndex === -1) {
      return false;
    }

    const attrMap = new Map(rows[rowIndex].attrs.map((attr) => [attr.id, attr]));
    changedAttrs.forEach((attr) => {
      attrMap.set(attr.id, attr);
    });

    const nextRows = [...rows];
    nextRows[rowIndex] = {
      ...nextRows[rowIndex],
      attrs: nextRows[rowIndex].attrs.map((attr) => attrMap.get(attr.id) ?? attr)
    };

    rowsByTemplateId.value = {
      ...rowsByTemplateId.value,
      [templateId]: nextRows
    };
    return true;
  }

  /**
   * 向指定分组插入新 row。
   */
  function insertRow(templateId: string, row: SimpleObjectRow): boolean {
    const rows = rowsByTemplateId.value[templateId];
    if (!Array.isArray(rows)) {
      return false;
    }

    rowsByTemplateId.value = {
      ...rowsByTemplateId.value,
      [templateId]: [...rows, row]
    };
    return true;
  }

  /**
   * 从指定分组移除 row，并同步清理该行的前端校验结果。
   */
  function removeRow(templateId: string, rowNodeId: string): boolean {
    const rows = rowsByTemplateId.value[templateId] ?? [];
    const targetRow = rows.find((row) => row.nodeId === rowNodeId);
    if (!targetRow) {
      return false;
    }

    rowsByTemplateId.value = {
      ...rowsByTemplateId.value,
      [templateId]: rows.filter((row) => row.nodeId !== rowNodeId)
    };
    clearRowValidateErrors([targetRow]);
    return true;
  }

  /**
   * 按后端返回值更新分组头部计数。
   */
  function updateGroupCount(templateId: string, count: number): boolean {
    const groupIndex = groups.value.findIndex((group) => group.templateId === templateId);
    if (groupIndex === -1) {
      return false;
    }

    const nextGroups = [...groups.value];
    nextGroups[groupIndex] = {
      ...nextGroups[groupIndex],
      count: count
    };
    groups.value = nextGroups;
    return true;
  }

  /**
   * 更新指定 row 的前端校验结果。
   */
  function updateRowValidateState(rowNodeId: string, hasError: boolean): void {
    if (hasError) {
      rowValidateErrors.value = {
        ...rowValidateErrors.value,
        [rowNodeId]: true
      };
      return;
    }

    const { [rowNodeId]: _removedError, ...remainingErrors } = rowValidateErrors.value;
    rowValidateErrors.value = remainingErrors;
  }

  /**
   * 清理一批 rows 对应的前端校验结果。
   */
  function clearRowValidateErrors(rows: SimpleObjectRow[]): void {
    rowValidateErrors.value = rows.reduce<Record<string, true>>((remainingErrors, row) => {
      const { [row.nodeId]: _removedError, ...nextErrors } = remainingErrors;
      return nextErrors;
    }, rowValidateErrors.value);
  }

  /**
   * 记录待处理的聚焦目标。
   */
  function setPendingFocusTarget(target?: EditorFocusTarget): void {
    pendingFocusTarget.value = target;
  }

  /**
   * 清空已经消费完成的聚焦目标。
   */
  function clearPendingFocusTarget(): void {
    pendingFocusTarget.value = undefined;
  }

  /**
   * 查询指定模板的 rows 是否已加载。
   */
  function hasLoadedRows(templateId: string): boolean {
    return Array.isArray(rowsByTemplateId.value[templateId]);
  }

  /**
   * 返回当前 owner 下是否存在任何 Simple Node 分组。
   */
  const hasGroups = computed(() => groups.value.length > 0);

  return {
    ownerNodeId: ownerNodeId,
    groups: groups,
    rowsByTemplateId: rowsByTemplateId,
    loadingGroups: loadingGroups,
    loadingRows: loadingRows,
    creatingByTemplateId: creatingByTemplateId,
    rowValidateErrors: rowValidateErrors,
    pendingFocusTarget: pendingFocusTarget,
    hasGroups: hasGroups,
    reset: reset,
    initGroups: initGroups,
    setGroupsLoading: setGroupsLoading,
    setRowsLoading: setRowsLoading,
    setCreating: setCreating,
    setRows: setRows,
    applyRowChangedAttrs: applyRowChangedAttrs,
    insertRow: insertRow,
    removeRow: removeRow,
    updateGroupCount: updateGroupCount,
    updateRowValidateState: updateRowValidateState,
    setPendingFocusTarget: setPendingFocusTarget,
    clearPendingFocusTarget: clearPendingFocusTarget,
    hasLoadedRows: hasLoadedRows
  };
});
