import { debounce } from '@orientais/webview-core';
import { EIntegrityLevel } from '@shared/webviews/models/integerity';
import type { NodeData, NodeTreeData } from '@shared/webviews/models/nodeData';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  getActiveNodeCache,
  getExpandedNodesCache,
  getNodeStatusesCache,
  setActiveNodeCache,
  setExpandedNodesCache,
  setNodeStatusesCache
} from '@/cache/editorTree.cache';
import { buildNodeTree } from '@/utils';

/**
 * 树节点数据管理Store
 * @description
 *   - 内部使用Plain Map来存储节点数据，方便后续更新节点时的o(1)查询
 *   - 注意更新节点时，需要同时更新nodesTree的引用，以触发前端组件的更新
 */
export const useTreeStore = defineStore('treeStore', () => {
  // Plain Map - 方便后续更新节点时的 o(1) 查询
  const nodesMap = new Map<string, NodeTreeData>();
  // 节点自身的校验状态，不包含子节点聚合结果
  const nodeSelfStatusMap = new Map<string, EIntegrityLevel>();
  // Tree中当前展开节点 - 使用 plain Set 维护，无需响应式
  const expandedNodesSet = new Set<string>();

  // #region refs
  // 树形菜单是否可见
  const treeVisible = ref<boolean>(false);
  // 节点树形结构数据
  const nodesTree = ref<NodeTreeData[]>([]);
  // Tree中当前被选中节点
  const activeNode = ref<NodeTreeData | null>(null);
  // #endregion

  // 当前TreeStore对应的工程ID和根节点ID（treeId）
  const appId = ref<string>('');
  const rootId = ref<string>('');

  // 根节点数据
  const rootNode = computed(() => {
    return rootId.value ? nodesMap.get(rootId.value) || null : null;
  });

  /**
   * 从后端获取树节点数据
   * @description 该方法会重置当前store中的所有节点数据，适用于首次加载或者刷新场景
   * @param appId 工程ID
   * @param rootId 根节点ID - 这里的rootId其实就是treeId，后续在与工程管理进行对接时可以考虑替换为treeId
   * @returns 节点数据数组
   */
  function initNodeData(_appId: string, _rootId: string, nodesData: NodeData[], treeVisibleFlag: boolean) {
    nodesMap.clear();
    nodeSelfStatusMap.clear();
    activeNode.value = null;
    treeVisible.value = treeVisibleFlag;

    // 设置 appId 和 rootId
    if (appId.value !== _appId) {
      appId.value = _appId;
    }
    if (rootId.value !== _rootId) {
      rootId.value = _rootId;
    }

    // 1. 先把所有的节点数据放到Map中，方便后续o(1)查询
    nodesData.forEach((node) => {
      // 这里先临时设置level，后续会在buildNodeTree方法中根据树形结构关系重新设置level属性的值
      nodesMap.set(node.id, { ...node, children: [], level: 0 });
    });

    // 2. 将后台返回的扁平化节点数据转换为树形结构数据
    nodesTree.value = buildNodeTree(nodesData, nodesMap);

    // 3. 从localStorage中获取一些缓存在本地的数据并更新到store中
    const activeNodeId = getActiveNodeCache(_appId, _rootId);
    if (activeNodeId) {
      setActiveNode(activeNodeId);
    }
    expandedNodesSet.clear();
    const cachedExpandedNodes = getExpandedNodesCache(_appId, _rootId);
    if (cachedExpandedNodes && cachedExpandedNodes.length > 0) {
      cachedExpandedNodes.forEach((id) => expandedNodesSet.add(id));
    }

    // 4. 从localStorage中获取节点的校验状态并更新到store中
    const cachedNodeStatuses = getNodeStatusesCache(_appId, _rootId);
    if (cachedNodeStatuses) {
      Object.entries(cachedNodeStatuses).forEach(([id, status]) => {
        if (status === EIntegrityLevel.ERROR || status === EIntegrityLevel.WARNING) {
          nodeSelfStatusMap.set(id, status);
        }
      });
      recomputeTreeStatuses();
      nodesTree.value = [...nodesTree.value];
    }
  }

  /**
   * 刷新最新的编辑器树形菜单数据
   */
  function refreshNodeData(nodesData: NodeData[]) {
    initNodeData(appId.value, rootId.value, nodesData, true);
  }

  /**
   * 将节点自身的校验状态同步到本地缓存。
   * @description 这里只缓存节点自身状态，不缓存父节点聚合后的展示状态。
   */
  function syncNodeStatusesCache(): void {
    const statuses = Object.fromEntries([...nodeSelfStatusMap.entries()].map(([id, status]) => [id, status]));

    setNodeStatusesCache(appId.value, rootId.value, statuses);
  }

  /**
   * 合并两个校验状态。
   * @description 优先级为 ERROR > WARNING > undefined。
   */
  function mergeIntegrityStatus(current?: EIntegrityLevel, incoming?: EIntegrityLevel): EIntegrityLevel | undefined {
    if (current === EIntegrityLevel.ERROR || incoming === EIntegrityLevel.ERROR) {
      return EIntegrityLevel.ERROR;
    }
    if (current === EIntegrityLevel.WARNING || incoming === EIntegrityLevel.WARNING) {
      return EIntegrityLevel.WARNING;
    }
    return undefined;
  }

  /**
   * 递归重算单个节点的最终展示状态。
   * @description 节点最终状态由“自身状态 + 所有子节点状态”共同聚合得到。
   */
  function recomputeNodeStatus(node: NodeTreeData): EIntegrityLevel | undefined {
    let mergedStatus = nodeSelfStatusMap.get(node.id);

    node.children?.forEach((child) => {
      mergedStatus = mergeIntegrityStatus(mergedStatus, recomputeNodeStatus(child));
    });

    node.status = mergedStatus;
    return mergedStatus;
  }

  /**
   * 重算整棵树的展示状态。
   * @description 从根节点开始递归计算，确保父节点状态与整棵子树保持一致。
   */
  function recomputeTreeStatuses(): void {
    nodesTree.value.forEach((node) => {
      recomputeNodeStatus(node);
    });
  }

  /**
   * 获取默认激活节点。
   * 当前策略优先取树的第一个节点，后续如需跳过不可编辑节点可在此扩展。
   */
  function getDefaultActiveNode(): NodeTreeData | null {
    return nodesTree.value[0] ?? null;
  }

  /**
   * 确保当前激活节点在最新树数据中仍然有效。
   * 如果缓存节点已经失效，则回退到默认节点，避免表单继续绑定已删除节点。
   */
  function ensureActiveNodeAvailable(): NodeTreeData | null {
    if (activeNode.value && nodesMap.has(activeNode.value.id)) {
      return activeNode.value;
    }

    const defaultNode = getDefaultActiveNode();
    if (defaultNode) {
      setActiveNode(defaultNode.id);
      return defaultNode;
    }

    activeNode.value = null;
    return null;
  }

  /**
   * 设置当前被选中节点并更新本地缓存
   */
  function setActiveNode(nodeId: string) {
    const node = nodesMap.get(nodeId) || null;
    activeNode.value = node;
    if (node) {
      setActiveNodeCache(appId.value, rootId.value, nodeId);
    }
  }

  /**
   * 获取当前展开节点 ID 列表
   */
  function getExpandedNodes(): string[] {
    return [...expandedNodesSet];
  }

  /**
   * 添加展开节点并更新本地缓存
   */
  function addExpandedNode(nodeId: string): void {
    expandedNodesSet.add(nodeId);
    setExpandedNodesCache(appId.value, rootId.value, [...expandedNodesSet]);
  }

  /**
   * 移除展开节点并更新本地缓存
   */
  function removeExpandedNode(nodeId: string): void {
    // expandedNodesSet.delete(nodeId);
    // setExpandedNodesCache(appId.value, rootId.value, [...expandedNodesSet]);
    const removeRecursive = (id: string) => {
      expandedNodesSet.delete(id);
      const node = nodesMap.get(id);
      node?.children?.forEach((child) => removeRecursive(child.id));
    };
    removeRecursive(nodeId);
    setExpandedNodesCache(appId.value, rootId.value, [...expandedNodesSet]);
  }

  /**
   * 更新树节点的校验状态
   */
  function updateNodeErrorStatus(nodeId: string, status?: EIntegrityLevel) {
    if (!nodesMap.has(nodeId)) {
      return;
    }

    if (status) {
      nodeSelfStatusMap.set(nodeId, status);
    } else {
      nodeSelfStatusMap.delete(nodeId);
    }

    recomputeTreeStatuses();
    syncNodeStatusesCache();
    // 触发前端组件更新
    nodesTree.value = [...nodesTree.value];
  }

  /**
   * 更新树节点显示名。
   * shortName 回流成功后只改目标节点，避免为了一个字段刷新整棵树的数据来源。
   */
  function updateNodeDisplayName(nodeId: string, displayName: string): void {
    const node = nodesMap.get(nodeId);
    if (!node) {
      return;
    }

    node.displayName = displayName;
    nodesTree.value = [...nodesTree.value];
  }

  return {
    appId: appId,
    rootId: rootId,
    rootNode: rootNode,
    nodesTree: nodesTree,
    activeNode: activeNode,
    treeVisible: treeVisible,
    initNodeData: initNodeData,
    refreshNodeData: refreshNodeData,
    setActiveNode: setActiveNode,
    ensureActiveNodeAvailable: ensureActiveNodeAvailable,
    getDefaultActiveNode: getDefaultActiveNode,
    getExpandedNodes: getExpandedNodes,
    addExpandedNode: debounce(addExpandedNode, 300),
    removeExpandedNode: debounce(removeExpandedNode, 300),
    updateNodeErrorStatus: updateNodeErrorStatus,
    updateNodeDisplayName: updateNodeDisplayName
  };
});
