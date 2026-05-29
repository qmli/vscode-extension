import { EIntegrityLevel } from '@shared/webviews/models/integerity';
import type { EditorViewKind } from '@shared/webviews/models/nodeData';
import type {
  EditorNodeFormResponse,
  EditorNodeTableResponse
} from '@shared/webviews/protocol/editor/editorForm.protocol';
import type { FormValidateFailure } from 'element-plus';
import { storeToRefs } from 'pinia';
import { watch } from 'vue';
import { fetchEditorTreeInitData } from '@/api';
import { resolveEditorFocusTarget } from '@/api/form.api';
import { useEditorStore } from '@/stores/editor.store';
import { useEditorSimpleNodesStore } from '@/stores/editorSimpleNodes.store';
import { useTreeStore } from '@/stores/tree.store';

export interface EditorCoordinator {
  initTreeStore: (appId: string, rootId: string) => Promise<void>;
  refreshTreeStore: () => Promise<void>;
  applyEditorFormResponse: (nodeId: string, response: EditorNodeFormResponse) => void;
  applyEditorTableResponse: (nodeId: string, response: EditorNodeTableResponse) => void;
  resetNodeState: (nodeId?: string, viewType?: EditorViewKind) => void;
  focusByNodeId: (nodeId: string) => Promise<void>;
  bindValidationAggregation: () => void;
}

/**
 * 统一协调编辑器主表单、Simple Objects 与 tree 状态。
 */
export function useEditorCoordinator(): EditorCoordinator {
  const treeStore = useTreeStore();
  const editorStore = useEditorStore();
  const editorSimpleNodesStore = useEditorSimpleNodesStore();
  const { formValidateErrors } = storeToRefs(editorStore);
  const { ownerNodeId, rowValidateErrors } = storeToRefs(editorSimpleNodesStore);

  /**
   * 初始化树状态。
   * 这里继续复用当前页面已有的整树初始化能力，保证删除后的刷新与首次加载使用同一条数据链路。
   */
  async function initTreeStore(appId: string, rootId: string): Promise<void> {
    const { treeVisible, nodes } = await fetchEditorTreeInitData({ appId: appId, rootId: rootId });
    if (nodes) {
      treeStore.initNodeData(appId, rootId, nodes, treeVisible);
      treeStore.ensureActiveNodeAvailable();
    }
  }

  /**
   * 刷新树数据，保持与后端最新状态同步。
   * 这里直接重用 initTreeStore 的数据处理逻辑，保证数据来源和处理方式一致。
   * 注意该方法会重置当前树的所有状态，适用于节点增删改后需要整体刷新树的场景。
   * 如果只是局部更新某个节点的数据，可以考虑直接更新对应节点而不是整体刷新。
   */
  async function refreshTreeStore(): Promise<void> {
    const appId = treeStore.appId;
    const rootId = treeStore.rootId;
    if (!appId || !rootId) {
      return;
    }
    const { nodes } = await fetchEditorTreeInitData({ appId: appId, rootId: rootId });
    treeStore.refreshNodeData(nodes);
  }

  /**
   * 将聚合读接口返回的数据拆分写入主表单 store 与 Simple Objects store。
   */
  function applyEditorFormResponse(nodeId: string, response: EditorNodeFormResponse): void {
    editorStore.initEditorData(nodeId, response.form);
    editorSimpleNodesStore.initGroups(nodeId, response.simpleObjectGroups);
  }

  /**
   * 将文件夹节点表格接口返回的数据写入 editor store。
   * 列表态不需要 Simple Objects 分组，因此这里只更新主编辑区的表格数据。
   */
  function applyEditorTableResponse(nodeId: string, response: EditorNodeTableResponse): void {
    editorStore.initFolderTableData(nodeId, response.rows);
  }

  /**
   * 在节点切换前同步清空主表单和 Simple Objects 状态。
   */
  function resetNodeState(nodeId: string = '', viewType: EditorViewKind = 'form'): void {
    editorStore.resetEditorData(nodeId, viewType);
    editorSimpleNodesStore.reset(nodeId);
  }

  /**
   * 根据 draft 选择结果触发编辑器跳转。
   * 普通 Form Node 直接切换 tree；Simple row 则先记录待处理目标，再切到 owner 节点。
   */
  async function focusByNodeId(nodeId: string): Promise<void> {
    const target = await resolveEditorFocusTarget(nodeId);
    if (!target) {
      return;
    }

    if (target.type === 'form-node') {
      editorSimpleNodesStore.clearPendingFocusTarget();
      treeStore.setActiveNode(target.nodeId);
      return;
    }

    editorSimpleNodesStore.setPendingFocusTarget(target);
    treeStore.setActiveNode(target.ownerNodeId);
  }

  /**
   * 汇总主表单和 Simple Object row 的错误状态，并统一回写到 tree。
   * 这样可以避免两个 store 分别写 tree 导致状态互相覆盖。
   */
  function bindValidationAggregation(): void {
    watch(
      [() => editorStore.nodeId, () => formValidateErrors.value, () => rowValidateErrors.value],
      ([currentNodeId, formErrors, rowErrors]) => {
        const ownerId = ownerNodeId.value || currentNodeId;
        if (!ownerId) {
          return;
        }

        const hasFormErrors = hasValidateErrors(formErrors);
        const hasRowErrors = Object.keys(rowErrors).length > 0;
        treeStore.updateNodeErrorStatus(ownerId, hasFormErrors || hasRowErrors ? EIntegrityLevel.ERROR : undefined);
      },
      { immediate: true, deep: true }
    );
  }

  return {
    initTreeStore: initTreeStore,
    refreshTreeStore: refreshTreeStore,
    applyEditorFormResponse: applyEditorFormResponse,
    applyEditorTableResponse: applyEditorTableResponse,
    resetNodeState: resetNodeState,
    focusByNodeId: focusByNodeId,
    bindValidationAggregation: bindValidationAggregation
  };
}

/**
 * 判断 Element Plus 校验结果中是否存在失败字段。
 */
function hasValidateErrors(errors?: FormValidateFailure['fields']): boolean {
  return Boolean(errors && Object.keys(errors).length > 0);
}
