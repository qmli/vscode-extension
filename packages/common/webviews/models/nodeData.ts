// #region tree
import type { EIntegrityLevel } from './integerity';

/**
 * 模型节点数据
 */
export type EditorViewKind = 'form' | 'folder-table';

export interface NodeData {
  id: string;
  /** 工程ID - 考虑是否可以重命名为projectId **/
  appId: string;
  treeId: string;
  tempId: string;
  name: string;
  parentId?: string;
  displayName?: string;
  type: 'NODE';
  status?: EIntegrityLevel;
  description?: string;

  removed?: boolean;
  isNode?: boolean; // TODO: isNode字段与type字段冗余，且 type 字段未严格区分类型(当 isArray 为 true 时， type 依然还是 'NODE')
  isSimple?: boolean;
  isArray?: boolean;
  isError?: boolean;
  isL1Node?: boolean;
  editorViewKind?: EditorViewKind;
}

/**
 * 模型节点树结构数据
 */
export interface NodeTreeData extends NodeData {
  /**
   * UI层级的Parent Id
   * @description
   *   - 模型编辑器的树形节点展示Panel中，需要过滤 isNode 为 false、isArray 为 false 的节点。
   *   - 对于 `isNode=false && isArray=true` 的节点，会作为可见 folder/list 节点保留在树中。
   *       为了让 DcmConfigSets 节点能够在树形结构中被隐藏，所以在获取 DcmConfigSet节点的父节点时，需要递归查询其父节点，直到找到一个isNode=true的节点为止
   */
  uiParentId?: string;

  /** 层级 level 根节点为1 **/
  level: number;

  /** 子节点 **/
  children?: NodeTreeData[];
}

/**
 * 节点右键菜单数据
 */
export interface NodeContextMenuData {
  // 粘贴
  hasPaste: boolean;
  // 克隆
  hasClone: boolean;
  // 子
  hasChildren: boolean;
  // 复制
  hasCopy: boolean;
  // 删除
  hasDelete: boolean;
  // 更多
  hasMore: boolean;
  // CP-导入Dcm
  hasImportDcmByExcel?: boolean;
  // CP-导入Dem
  hasImportDemByExcel?: boolean;
}
// #endregion tree

// #region form
/**
 * 模型节点的表单数据
 */
export type NodeAttrs = NodeAttrData[];

/**
 * 模型节点的表单树形数据
 * @todo 这里只是先简单定义，后面在做后台接口对接时需要考虑:
 *   1. 优化rules、options、component等字段的定义，例如component字段是否应该在定义时限制范围
 *   2. 有些字段比较冗余，例如：type、category、iType等，要考虑删除
 *   3. 补充遗漏的属性定义以及确认属性的可选性
 */
export interface NodeAttrData {
  //===================== 基础属性 =====================
  id: string; // 对应模型节点属性的属性ID - 也就是ATTR ID
  nodeId: string;
  appId: string;
  treeId: string;
  name: string;
  longName?: string;
  disabled?: boolean;
  label: string;
  component: string; // 表单组件类型，如 'text'、'select'、'checkbox' 等
  value: string | boolean | null; // 在attr表中，value属性只有可能是string类型或者null
  tempId: string;
  defaultValue: string;
  description: string;
  constraintDesc?: string; // 约束描述
  type: string; // 这里的type对应的是模型MD文件中的属性类型，而非表单组件类型
  category: string; // 这里的category对应的是模型MD文件中的属性分类，如 'Basis'
  iType: string; // 这里的iType对应的是模型MD文件名

  //===================== 上/下限 =====================
  lowerBound?: string;
  upperBound?: string;

  //===================== 表单静态检查规则 =====================
  pattern: string;
  patternList: string;
  rules: {
    required?: boolean;
    message?: string;
    trigger?: string;
    pattern?: string;
  }[];

  //===================== UI组件描述属性,例如下拉框可选项 =====================
  options?: {
    placeholder?: string;
    items?: { name: string; value: string | boolean; label: string }[];
    maxlength?: number;
    multiple?: boolean;
    draft?: {
      transCommand: string;
      iType: string;
      label: string;
      value: string;
      multiple: boolean;
      result: string[];
      headers: { label: string; prop: string }[];
    };
  };

  //===================== 其他属性 =====================
  isError?: boolean;
  isCache?: boolean;
  isWrite?: boolean;
  postBuildVariantMultiplicity?: string;
  postBuildVariantValue?: string;
}
// #endregion form

// #region common
/**
 * 模型引用类型选项
 */
export interface DraftOption {
  appId: string;
  id: string;
  objectType: string;
  shortName: string;
  longName: string;
  [key: string]: unknown;
}
// #endregion
