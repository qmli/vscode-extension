import { convertEmptyStringToUndefined } from '@packages/utils/object';

interface ProjectAppNodeAttrEntity {
  id: string;
  appId?: string;
  rootId?: string;
  nodeId?: string;
  name?: string;
  tempId: string;
  treeId?: string;
  parentId?: string;
  dummyId?: string;
  isKeep?: boolean;
  isWrite?: boolean;
  variantPoint?: string;
  label?: string;
  sort?: number;
  component?: string;
  iType?: string;
  value?: string;
  isError?: boolean;
  isCache?: boolean;
  removed?: boolean;
}

/**
 * 直接从 Entity 映射的字段，保留原始 required / optional
 * （id/appId/rootId/nodeId/name 在 Entity 中已是必填）
 */
type EntityDirectFields = Pick<
  ProjectAppNodeAttrEntity,
  | 'id'
  | 'appId'
  | 'rootId'
  | 'nodeId'
  | 'name'
  | 'tempId'
  | 'treeId'
  | 'parentId'
  | 'dummyId'
  | 'isKeep'
  | 'isWrite'
  | 'variantPoint'
>;

/**
 * Entity 中可选、但 Info 层由业务逻辑保证一定有值的字段
 * （通过 Required<> 去掉 undefined）
 */
type EntityRequiredInInfo = Required<
  Pick<ProjectAppNodeAttrEntity, 'label' | 'sort' | 'component' | 'iType' | 'value' | 'isError' | 'isCache' | 'removed'>
>;

/**
 * Info 独有的扩展字段，不对应数据库列
 * （来自模板、UI 渲染、跨表 JOIN 等）
 */
type InfoExtraFields = {
  /** UI 列宽占比，不存入数据库 */
  span: number;
  tips?: string;
  description?: string;
  pattern?: string;
  options?: string;
  rules?: string;
  patternList?: string;
  originId?: string;
  type?: string;
  category?: string;
  lowerBound?: string;
  upperBound?: string;
  postBuildVariantValue: boolean;
  postBuildVariantMultiplicity?: boolean;
  defaultValue?: string;
  /** UI约束规则描述，UI约束场景专用字段，不存入数据库 */
  constraintDesc?: string;
  hasWrite?: boolean;
};

export type ProjectAppNodeAttrInfo = EntityDirectFields & EntityRequiredInInfo & InfoExtraFields;

export interface RefAttrInfoByNameRow {
  id: string;
  value: string | null;
  upperBound: string | null;
}

export const serializePickProjectAppNodeAttr = (
  projectAppNodeAttrInfo: ProjectAppNodeAttrInfo
): Pick<
  ProjectAppNodeAttrInfo,
  | 'id'
  | 'appId'
  | 'rootId'
  | 'treeId'
  | 'nodeId'
  | 'tempId'
  | 'parentId'
  | 'component'
  | 'label'
  | 'name'
  | 'value'
  | 'iType'
  | 'sort'
  | 'removed'
  | 'dummyId'
  | 'isKeep'
  | 'variantPoint'
  | 'isWrite'
> => {
  const {
    id,
    appId,
    rootId,
    treeId,
    nodeId,
    tempId,
    parentId,
    component,
    label,
    name,
    value,
    iType,
    sort,
    removed,
    dummyId,
    isKeep,
    variantPoint,
    isWrite
  } = projectAppNodeAttrInfo;
  return convertEmptyStringToUndefined({
    id: id,
    appId: appId,
    rootId: rootId,
    treeId: treeId,
    nodeId: nodeId,
    tempId: tempId,
    parentId: parentId,
    component: component,
    label: label,
    name: name,
    value: value,
    iType: iType,
    sort: sort,
    removed: removed,
    dummyId: dummyId,
    isKeep: isKeep,
    variantPoint: variantPoint,
    isWrite: isWrite
  }) as ProjectAppNodeAttrInfo;
};

export const mapAppNodeAttrEntityToInfo = (entity: ProjectAppNodeAttrEntity): ProjectAppNodeAttrInfo => {
  return {
    id: entity.id,
    appId: entity.appId ?? '',
    rootId: entity.rootId ?? '',
    nodeId: entity.nodeId ?? '',
    name: entity.name ?? '',
    tempId: entity.tempId,
    treeId: entity.treeId,
    parentId: entity.parentId,
    dummyId: entity.dummyId,
    isKeep: entity.isKeep,
    isWrite: entity.isWrite,
    variantPoint: entity.variantPoint,
    label: entity.label ?? '',
    sort: entity.sort ?? 0,
    component: entity.component ?? '',
    iType: entity.iType ?? '',
    value: entity.value ?? '',
    isError: entity.isError ?? false,
    isCache: entity.isCache ?? false,
    removed: entity.removed ?? false,
    span: 0,
    postBuildVariantValue: false
  };
};

/**
 * AttrMsg 是 ProjectAppNodeAttrInfo 在构建 NJSON 时的中间格式，主要用于 buildNJSON 方法中
 */
export interface AttrMsg {
  id: string;
  nodeId: string;
  tempId: string;
  value: string | string[];
  name: string;
  component: string;
  lowerBound: string;
  upperBound: string;
  category: string;
  alias: string;
  type: string;
}
