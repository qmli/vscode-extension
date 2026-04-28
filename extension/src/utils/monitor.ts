import type {
  MonitoringObjectItem,
  ProcStatusNode,
  ProcStatusNodeType
} from '@packages/common/webviews/models/monitors/monitoringData';
import { ArrayIterator } from '@packages/utils/iterable';

// 进程节点类型数组，用于运行时检查
export const processTypes: readonly ProcStatusNodeType[] = ['platformProcess', 'nonPlatformProcess'] as const;

/**
 * 递归遍历进程节点（排除类型为platformProcess和nonPlatformProcess的子树），对每个非thread节点执行回调
 * @param nodes 进程节点数组
 * @param callback 处理每个节点的回调函数
 */
export function recursionHodeForEach(nodes: ProcStatusNode[], callback: (node: ProcStatusNode) => void): void {
  for (const node of nodes) {
    // 如果有子节点，且当前节点类型不是platformProcess或nonPlatformProcess，则递归子节点
    if (node.children) {
      if (!processTypes.includes(node.type)) {
        recursionHodeForEach(node.children, callback);
      }
    }
    // 对非thread类型的节点执行回调
    if (node.type !== 'thread') {
      callback(node);
    }
  }
}

/**
 * 递归地筛选进程节点（排除类型为platformProcess和nonPlatformProcess的子树），只保留满足predicate的节点
 * @param nodes 进程节点数组
 * @param predicate 判断节点是否保留的谓词函数
 */
export function recursionHodeFilter(nodes: ProcStatusNode[], predicate: (node: ProcStatusNode) => boolean): void {
  const iterator = new ArrayIterator<ProcStatusNode>(nodes);
  while (iterator.hasNext()) {
    const node = iterator.next();
    // 如果节点不满足条件，从当前数组移除
    if (!predicate(node)) {
      iterator.remove();
    }
    // 如果有子节点，且当前节点类型不是platformProcess或nonPlatformProcess，则递归筛选子节点
    if (node.children) {
      if (!processTypes.includes(node.type)) {
        recursionHodeFilter(node.children, predicate);
      }
    }
  }
}

/**
 * 判断是否满足监控对象条件
 * @param met 监控对象条件
 * @param item 监控对象
 * @returns 是否满足条件
 */
export function isConditionMet(met: MonitoringObjectItem, item: { name: string; state?: string }): boolean {
  if (!met.selected) {
    return true;
  }
  if (met.mode === 'all') {
    return true;
  }
  switch (met.rule) {
    case 'in':
      return met.values.includes(item[met.attribute] || '');
    case 'nin':
      return !met.values.includes(item[met.attribute] || '');
    default:
      // 类型系统保证了不会到这里，但为了安全起见
      return false;
  }
}
