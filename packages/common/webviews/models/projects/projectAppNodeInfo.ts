import type { ProjectAppNodeAttrInfo } from './projectAppNodeAttrInfo';

/**
 * ProjectAppNodeInfo
 * 应用节点基本信息接口定义
 */
export interface ProjectAppNodeInfo {
  /** 节点ID，唯一标识此节点，主键 */
  id: string;
  /** 应用ID，所属的应用标识 */
  appId: string;
  /** 根节点ID，归属于哪棵节点树 */
  rootId: string;
  /** 父节点ID，描述树结构层级，可选 */
  parentId?: string;
  /** 节点名称（建议英文、驼峰） */
  name: string;
  /** 节点显示名称，界面友好展示名 */
  displayName?: string;
  /** 节点类型，如 leaf、branch、custom等，可选 */
  type?: string;
  /** 所属树ID，表示节点所在的树形结构根标识 */
  treeId?: string;
  /** 临时ID，只在前端未保存时使用 */
  tempId: string;
  /** 是否被移除，逻辑删除标识 */
  removed: boolean;
  /** 第二移除标记，特殊场景辅助用，建议后续明确语义 */
  removed2?: boolean;
  /** 是否为节点（vs. 叶子），便于树控件递归渲染/收缩 */
  isNode: boolean;
  /** 是否有校验/逻辑错误，UI高亮提示 */
  isError: boolean;
  /** 本地缓存未同步标识，提高交互体验 */
  isCache: boolean;
  /** 是否保持/锁定，特殊场景提供智能锁定提示 */
  isKeep?: boolean;
  /** 当前节点是否展开，前端用于辅助展开收起 */
  expand?: boolean;
  /** 虚拟ID，用于占位、拖放、虚结点 */
  dummyId?: string;
  /** 变体点，动态配置场景变体标识 */
  variantPoint?: string;
  /** 节点导入标记，支持批量导入管理 */
  markImport?: string;
  /** 节点导出标记，支持自定义导出分类 */
  markExport?: string;
  /** 排序字段，数值越小越靠前 */
  sort: number;
  /** 子节点列表，递归结构 */
  children?: ProjectAppNodeInfo[];
  /** 节点属性列表 */
  attr?: ProjectAppNodeAttrInfo[];
}
