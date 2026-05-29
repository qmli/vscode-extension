/**
 * EditorTree缓存相关工具函数
 *  - 使用localStorage进行缓存存储
 *  - 提供获取和设置EditorTree activeNode缓存值的函数
 * @description
 *  - 现在先暂时放在cache/路径下，后面可根据需要调整或者增加其他缓存相关工具函数
 */

// #region keys

export const editorTreePrefix = 'editor_tree_';
export const editorTreeActiveNodePrefix = 'editor_tree_active_node_';
export const editorTreeExpandedNodesPrefix = 'editor_tree_expanded_nodes_';
export const editorTreeNodeStatusesPrefix = 'editor_tree_node_statuses_';

/**
 * EditorTree activeNode cache key - formatter function
 */
export const getActiveNodeCacheKey = (appId: string, rootId: string): string =>
  `${editorTreeActiveNodePrefix}${appId}_${rootId}`;

export const getExpandedNodesCacheKey = (appId: string, rootId: string): string =>
  `${editorTreeExpandedNodesPrefix}${appId}_${rootId}`;

export const getNodeStatusesCacheKey = (appId: string, rootId: string): string =>
  `${editorTreeNodeStatusesPrefix}${appId}_${rootId}`;
// #endregion

// 默认使用localStorage
const storage: Storage = window.localStorage;

// #region get/set cache
/**
 * 从localStorage中获取EditorTree activeNode缓存值
 */
export function getActiveNodeCache(appId: string, rootId: string): string | null {
  const key = getActiveNodeCacheKey(appId, rootId);
  return storage.getItem(key);
}

/**
 * 将EditorTree activeNode缓存值存储到localStorage中
 */
export function setActiveNodeCache(appId: string, rootId: string, nodeId: string): void {
  const key = getActiveNodeCacheKey(appId, rootId);
  storage.setItem(key, nodeId);
}

/**
 * 从localStorage中获取EditorTree expandedNodes缓存值
 */
export function getExpandedNodesCache(appId: string, rootId: string): string[] | null {
  const key = getExpandedNodesCacheKey(appId, rootId);
  const value = storage.getItem(key);
  if (value) {
    try {
      return JSON.parse(value) as string[];
    } catch (error) {
      console.error('Failed to parse expanded nodes cache:', error);
      return null;
    }
  }
  return null;
}

/**
 * 将EditorTree expandedNodes缓存值存储到localStorage中
 */
export function setExpandedNodesCache(appId: string, rootId: string, nodeIds: string[]): void {
  const key = getExpandedNodesCacheKey(appId, rootId);
  storage.setItem(key, JSON.stringify(nodeIds));
}

/**
 * 从localStorage中获取EditorTree节点校验状态缓存值
 */
export function getNodeStatusesCache(appId: string, rootId: string): Record<string, string> | null {
  const key = getNodeStatusesCacheKey(appId, rootId);
  const value = storage.getItem(key);
  if (value) {
    try {
      return JSON.parse(value) as Record<string, string>;
    } catch (error) {
      console.error('Failed to parse node statuses cache:', error);
      return null;
    }
  }
  return null;
}

/**
 * 将EditorTree节点校验状态缓存到localStorage中
 */
export function setNodeStatusesCache(appId: string, rootId: string, statuses: Record<string, string>): void {
  const key = getNodeStatusesCacheKey(appId, rootId);
  storage.setItem(key, JSON.stringify(statuses));
}
// #endregion
