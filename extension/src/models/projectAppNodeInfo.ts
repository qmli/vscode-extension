import { convertEmptyStringToUndefined } from '@shared/utils/object';
import type { ProjectAppNodeAttrInfo } from './projectAppNodeAttrInfo';

export interface ProjectAppNodeInfo {
  id: string;
  appId: string;
  rootId: string;
  parentId?: string;
  name: string;
  displayName?: string;
  type?: string;
  treeId?: string;
  tempId: string;
  removed: boolean;
  removed2?: boolean;
  isNode: boolean;
  isError?: boolean;
  isCache?: boolean;
  isKeep?: boolean;
  expand?: boolean;
  dummyId?: string;
  variantPoint?: string;
  markImport?: string;
  markExport?: string;
  sort?: number;
  attrId?: string;
  isL1Node?: boolean;
  isSimple?: boolean;
  isArray?: boolean;
  hasChild?: boolean;
  hasAction?: boolean;
  children?: ProjectAppNodeInfo[];
  attr?: ProjectAppNodeAttrInfo[];
  description?: string;
}

export interface LongNameHierarchyRow {
  id: string;
  parentId: string | null;
  name: string;
  isNode: boolean;
  appId: string;
  tempId: string | null;
  alias: string | null;
  tempName: string | null;
  tempUpperBound: string | null;
  value: string | null;
  tempShortName: string | null;
}

export interface NodeWithoutLongNameRow {
  appId: string;
  nodeId: string;
  id: string;
}

export interface LongNameInfo {
  appId: string;
  nodeId: string;
  shortName: string;
  id: string;
}

export interface ProjectAppNodeShortNameInfo {
  shortName: string;
  nodeId: string;
  removed: boolean;
  name: string;
  isL1Node: boolean;
}

export const serializePickProjectAppNode = (
  projectAppNodeInfo: ProjectAppNodeInfo
): Pick<
  ProjectAppNodeInfo,
  | 'sort'
  | 'expand'
  | 'removed2'
  | 'removed'
  | 'isNode'
  | 'type'
  | 'appId'
  | 'parentId'
  | 'displayName'
  | 'name'
  | 'id'
  | 'tempId'
  | 'treeId'
  | 'rootId'
  | 'isError'
  | 'isCache'
  | 'isKeep'
  | 'dummyId'
  | 'variantPoint'
  | 'markImport'
  | 'markExport'
  | 'isL1Node'
  | 'isSimple'
> => {
  const {
    treeId,
    tempId,
    rootId,
    id,
    name,
    parentId,
    displayName,
    appId,
    type,
    removed,
    removed2,
    isNode,
    expand,
    sort,
    isError,
    isCache,
    isKeep,
    dummyId,
    variantPoint,
    markImport,
    markExport,
    isL1Node,
    isSimple
  } = projectAppNodeInfo;
  return convertEmptyStringToUndefined({
    treeId: treeId,
    tempId: tempId,
    rootId: rootId,
    id: id,
    name: name,
    parentId: parentId,
    displayName: displayName,
    appId: appId,
    type: type,
    removed: removed,
    removed2: removed2,
    isNode: isNode,
    expand: expand,
    sort: sort,
    isError: isError,
    isCache: isCache,
    isKeep: isKeep,
    dummyId: dummyId,
    variantPoint: variantPoint,
    markImport: markImport,
    markExport: markExport,
    isL1Node: isL1Node,
    isSimple: isSimple
  }) as ProjectAppNodeInfo;
};

/**
 * NodeMsg 是 ProjectAppNodeInfo 在构建 NJSON 时的中间格式，主要用于 buildNJSON 方法中
 */
export interface NodeMsg {
  id: string;
  parentId: string;
  tempId: string;
  name: string;
  isNode: boolean;
  sort: number;
  alias: string;
  lowerBound: string;
  upperBound: string;
}
