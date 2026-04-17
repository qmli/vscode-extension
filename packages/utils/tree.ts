import { uuid } from './uuid';

// 基础树节点接口
interface BaseTreeNode {
  id: string | number;
  children?: BaseTreeNode[];
  parentId?: string | number;
  [key: string]: any;
}

// 扁平化节点接口
interface FlatNode extends BaseTreeNode {
  _step_?: number;
  _level?: number;
  removed?: boolean;
  checked?: boolean;
}

// 排序回调函数类型
type SortComparator<T> = (a: T, b: T) => number;

// 树遍历回调函数类型
type TreeCallback<T extends BaseTreeNode> = (node: T, parentList?: T[], index?: number) => void;

/**
 * 树扁平化处理
 * @warning 建议用 @file object.ts或@file iterable.ts 中的 flatten 方法替代，避免重复造轮子
 * @param treeData 原始树数据
 * @param _step_ 层级数
 * @param parentId 父ID
 * @param keepChildren 是否保留子节点
 */
export function convertToFlat<T extends BaseTreeNode>(
  treeData: T[] | Record<string, T>,
  step: number = 0,
  parentId: string | number | undefined = undefined,
  keepChildren?: boolean
): FlatNode[] {
  const flatData: FlatNode[] = [];
  const dataArray = Array.isArray(treeData) ? treeData : Object.values(treeData);

  for (const data of dataArray) {
    if (parentId !== undefined) {
      data.parentId = parentId;
    }
    flatData.push({ ...data });

    const children = data?.children;
    if (children && children.length > 0) {
      step++;
      (data as FlatNode)._step_ = step;
      flatData.push(...convertToFlat(children, step, data.id, keepChildren));
      if (!keepChildren) {
        data.children = [];
      }
    } else if (!keepChildren) {
      delete data.children;
    }
  }

  if (!keepChildren) {
    flatData.forEach((item) => delete item.children);
  }
  return flatData;
}

/**
 * 扁平json转换成树
 * @warning 建议用 @file object.ts 或@file iterable.ts 中的 flatten 方法替代，避免重复造轮子
 * @param flatData 扁平数据
 * @param parentId 父ID
 */
export const convertToTree = <T extends FlatNode>(flatData: T[], parentId?: string | number | null): T[] | null => {
  const children = flatData.filter((node: T) => {
    if (parentId !== undefined) {
      return node.parentId === parentId;
    }
    return !Object.prototype.hasOwnProperty.call(node, 'parentId');
  });

  if (!children.length) {
    return null;
  }

  return children.map((node: T) => ({
    ...node,
    children: convertToTree(flatData, node.id) || undefined
  }));
};

/**
 * 深度遍历
 * @param tree 原始树
 * @param callback 回调函数
 * @param isAll 是否全部回调
 */
export function treeIDFS<T extends BaseTreeNode>(tree: T[], callback: TreeCallback<T>, isAll?: boolean): void {
  tree.forEach((node: T, index: number) => {
    if (isAll) {
      callback(node, tree, index);
    }
    if (node.children && node.children.length > 0) {
      if (!isAll) {
        callback(node, tree, index);
      }
      treeIDFS(node.children as T[], callback, isAll);
    }
  });
}

/**
 * 树添加层级
 * @param array 原始树
 * @param levelName 层级名称
 * @param childrenName 子节点标识
 */
export function arrayTreeAddLevel<T extends Record<string, any>>(
  array: T[],
  levelName: string = 'level',
  childrenName: string = 'children'
): T[] {
  if (!Array.isArray(array)) {
    return [];
  }

  const recursive = (array: T[], level: number = 100000000): T[] => {
    level++;
    return array.map((v: any) => {
      (v as Record<string, any>)[levelName] = level;
      const child = (v as Record<string, any>)[childrenName];
      if (child && Array.isArray(child) && child.length) {
        recursive(child, level);
      }
      return v;
    });
  };
  return recursive(array);
}

/**
 * 分组
 * @param array 原始数组
 * @param key 分组字段或分组函数
 * @return 分组后结果
 */
export function groupBy<T extends Record<string, any>>(
  array: T[],
  key: string | ((item: T) => string)
): Record<string, T[]> {
  return array.reduce((result: Record<string, T[]>, item: T) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {});
}

/**
 * 子节点排序
 * @param arr 原始树
 * @param label 排序字段
 * @param asc 正序
 */
export function sortChildrenRecursively<T extends object>(
  arr: T[],
  label: Extract<keyof T, string> = 'label' as Extract<keyof T, string>,
  asc: boolean = true,
  hasChild: boolean = true
): T[] {
  const getComparableValue = (item: T): string => {
    const value = item[label];
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }
    return '';
  };

  return arr
    .map((item: T) => {
      if (hasChild && 'children' in item) {
        const node = item as T & { children?: T[] };
        if (node.children && Array.isArray(node.children)) {
          node.children = sortChildrenRecursively(node.children, label, asc, hasChild);
        }
      }
      return item;
    })
    .sort((a: T, b: T) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);
      if (asc) {
        return aValue.localeCompare(bValue, 'zh-CN', { sensitivity: 'accent' });
      }
      return bValue.localeCompare(aValue, 'zh-CN', { sensitivity: 'accent' });
    });
}

/**
 * 链式复合排序
 * @param arr 原始数组
 * @param sorters 排序规则
 */
export function sortChine<T>(arr: T[], ...sorters: SortComparator<T>[]): T[] {
  return arr.sort((a: T, b: T) => {
    for (const sorter of sorters) {
      const result = sorter(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

/**
 * 获取树节点
 * @param treeList 原始树
 * @param id id值
 * @param callback 回调函数
 */
export function getNode<T extends BaseTreeNode>(
  treeList: T[],
  id: string | number | '*',
  callback: TreeCallback<T>
): void {
  try {
    treeList.forEach((node: T, index: number) => {
      if (id === '*') {
        callback(node, treeList, index);
      } else if (node.id === id) {
        callback(node, treeList, index);
        throw new Error('Node found, stopping search');
      }
      if (node.children && node.children.length > 0) {
        getNode(node.children as T[], id, callback);
      }
    });
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.error(`getNode:${e}`);
  }
}

/**
 * 获取并删除
 * @param treeList 原始树
 * @param id id值
 */
export function findAndRemove<T extends BaseTreeNode>(treeList: T[], id: string | number): void {
  if (!treeList?.length) {
    return;
  }

  for (let i = 0; i < treeList.length; i++) {
    if (treeList[i].id === id) {
      treeList.splice(i, 1);
      break;
    }
    if (treeList[i].children) {
      findAndRemove(treeList[i].children as T[], id);
    }
  }
}

/**
 * 获取并逻辑删除
 * @param treeList 原始树
 * @param id id值
 * @param removed 是否逻辑删除
 */
export function findAndLogicalRemove<T extends FlatNode>(
  treeList: T[],
  id: string | number,
  removed: boolean = false
): void {
  if (!treeList?.length) {
    return;
  }

  for (const item of treeList) {
    if (removed) {
      item.removed = true;
      if (item.children) {
        findAndLogicalRemove(item.children as T[], id, true);
      }
    }
    if (item.id === id) {
      item.removed = true;
      if (item.children) {
        findAndLogicalRemove(item.children as T[], id, true);
      }
      break;
    }
    if (item.children) {
      findAndLogicalRemove(item.children as T[], id);
    }
  }
}

/**
 * 修复数据
 * @param treeList 原始树
 * @param key 修复的key
 * @param value 修复后的值
 */
export function modifyTree<T extends BaseTreeNode>(treeList: T[], key: keyof T, value: any): void {
  if (!treeList?.length) {
    return;
  }

  for (const item of treeList) {
    if (item[key] !== value) {
      item[key] = value;
    }
    if (item.children) {
      modifyTree(item.children as T[], key, value);
    }
  }
}

/**
 * 树形数据转换
 * @param data list数据
 * @param label 显示名称字段
 * @param id 主键ID字段
 * @param pid 父级Id字段
 * @param childrenKey 子集key
 * @param pKeys 父集收集数组
 */
export function convertToTreePlus<T extends Record<string, any>>(
  data: T[],
  label: string = 'name',
  id: string = 'id',
  pid: string = 'parentId',
  childrenKey: string = 'children',
  pKeys?: (string | number)[]
): T[] {
  const res: T[] = [];
  const temp: Record<string | number, T> = {};

  // 建立索引
  for (const item of data) {
    (item as Record<string, any>)[label] = item[label];
    temp[item[id]] = item;
  }

  // 构建树结构
  for (const item of data) {
    const parentItem = temp[item[pid]];
    if (parentItem && item[id] !== item[pid]) {
      if (!(parentItem as Record<string, any>)[childrenKey]) {
        (parentItem as Record<string, any>)[childrenKey] = [];
        if (pKeys) {
          pKeys.push(item[pid]);
        }
      }
      if (!parentItem._level) {
        (parentItem as Record<string, any>)._level = 1;
      }
      (item as Record<string, any>)._level = (parentItem as Record<string, any>)._level + 1;
      parentItem[childrenKey].push(item);
    } else {
      res.push(item);
    }
  }

  return res;
}
export function convertToFlatPlus<T extends { children?: T[] }>(tree: T[]): T[] {
  const stack = [...tree];
  const result: T[] = [];

  while (stack.length) {
    const node = stack.pop()!;
    const { children, ...rest } = node;
    result.push(rest as T);
    if (children) {
      stack.push(...[...children].reverse());
    }
  }

  return result;
}

/**
 * 子节点ID重置
 * @param treeList 原始树
 * @param parentId 父ID
 * @param callback 回调函数
 */
export function resetChildrenId<T extends BaseTreeNode>(
  treeList: T[],
  parentId: string | number,
  callback: (node: T) => void = function () {}
): void {
  treeList.forEach((node: T) => {
    callback(node);
    (node as any).originId = node.id;
    node.id = uuid();
    node.parentId = parentId;
    if (node.children && node.children.length > 0) {
      resetChildrenId(node.children as T[], node.id, callback);
    }
  });
}

/**
 * 叶子展开或者折叠
 * @warning 此方法与旧界面组件实现存在耦合，后续应继续解耦并移除相关逻辑。
 * @param treeList 原始树
 * @param treeRef 树对象
 * @param isExpand 是否展开
 */
export function toggleLeafExpand<T extends BaseTreeNode>(
  treeList: T[],
  treeRef: { store?: { nodesMap?: Record<string, { expanded: boolean }> } },
  isExpand: boolean = false
): void {
  // !!! WARNING: 该方法仍直接操作旧界面实例，不推荐这种做法，建议后续继续解耦 !!!
  treeList.forEach((node: T) => {
    if (node.children && node.children.length > 0) {
      if (treeRef.store?.nodesMap?.[node.id]) {
        treeRef.store.nodesMap[node.id].expanded = isExpand;
      }
      toggleLeafExpand(node.children as T[], treeRef, isExpand);
    }
  });
}

/**
 * 展开所有直系父节点
 * @param node 当前节点
 * @param keys 所有父ID收集数组
 */
export function getAllParentKeys(
  node: { parent?: { key?: string | number; id?: string | number } },
  keys: string[] = []
): string[] {
  if (node.parent) {
    keys.push((node.parent.key || node.parent.id) as string);
    getAllParentKeys({ parent: node.parent }, keys);
  }
  return keys;
}

/**
 * 在目标中存在，排序放到前面
 * @param arr 原始数据
 * @param priorityArr 优先级数组
 * @param key 排序字段
 */
export function objectPrioritySort(
  arr: Record<string, any>[],
  priorityArr: string[],
  key: string
): Record<string, any>[] {
  const prioritySet = new Set(priorityArr);
  return [...arr].sort((a: Record<string, any>, b: Record<string, any>) => {
    const aPriority = prioritySet.has(a[key] as string) ? 1 : 0;
    const bPriority = prioritySet.has(b[key] as string) ? 1 : 0;
    return bPriority - aPriority || arr.indexOf(a) - arr.indexOf(b);
  });
}
