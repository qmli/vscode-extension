/**
 * 源 IProjectAppNodeAttrInfo 数据结构
 * 应用节点属性信息接口定义
 */
export interface ProjectAppNodeAttrInfo {
  /** 属性ID，唯一标识此属性，建议作为主键或唯一索引使用 */
  id: string;
  /** 应用ID，关联所属的应用 */
  appId: string;
  /** 节点ID，关联所属的节点 */
  nodeId: string;
  /** 占位列数，通常用于前端布局，如表单一行所占列数 */
  span: number;
  /** 组件类型，前端渲染该属性所用的组件类型（如 input、select 等） */
  component: string;
  /** 属性显示标签，用于界面展示友好名 */
  label: string;
  /** 属性名，通常为属性字段key，建议英文、驼峰命名 */
  name: string;
  /** 属性值，当前该属性实际存储的值 */
  value: string;
  /** 排序，表示该属性在UI上的顺序，数字越小优先级越高 */
  sort: number;
  /** 智能提示：为该属性设置的帮助文案，支持在UI中悬浮显示 */
  tips?: string;
  /** 属性描述，详细说明该属性作用*/
  description?: string;
  /** 属性可选项，通常用于下拉、枚举等类型属性，支持字符串化的JSON或者逗号分隔 */
  options?: string;
  /** 校验规则，正则表达式或特殊校验逻辑，支持智能提示输入规则 */
  rules?: string;
  /** 模式列表，若有多个模式可选时用于快速切换，建议格式为JSON字符串数组 */
  patternList?: string;
  /** 原始属性ID，从其他来源映射或继承时存储原ID */
  originId?: string;
  /** 父属性ID，描述数据结构层级关系，树结构必填 */
  parentId?: string;
  /** 临时ID，用于前端未保存前的唯一标识，避免与后端ID冲突 */
  tempId?: string;
  /** 所属树ID，表示该属性所在的树形结构的根标识 */
  treeId?: string;
  /** 虚拟ID，用于虚节点、占位等场景，便于前端操作 */
  dummyId?: string;
  /** 根ID，归属于哪棵属性树，便于全局查找 */
  rootId: string;
  /** 属性类型，约定具体的数据类型，如 string/number/array/object 等 */
  type?: string;
  /** 实际类型，细化 type 字段，用于动态表单等复杂场景支持智能推断、智能提示 */
  iType: string;
  /** 类别，便于聚合和分组属性、可供UI筛选菜单等 */
  category?: string;
  /** 下界，约束该属性数值/长度等的最小值，智能提示输入下限 */
  lowerBound?: string;
  /** 上界，约束该属性数值/长度等的最大值，智能提示输入上限 */
  upperBound?: string;
  /** 是否被移除，标记为 true 表示当前属性已逻辑删除，不参与实际业务 */
  removed: boolean;
  /** 是否有错误，标记该属性是否校验、逻辑有误，UI高亮提示错误 */
  isError: boolean;
  /** 是否缓存，本地缓存未同步到后端的数据，优化性能和交互体验 */
  isCache: boolean;
  /** 是否保持，特殊场景下属性可被强制保留，UI上提供智能“锁定”提示 */
  isKeep?: boolean;
  /** 变体点信息，动态配置场景下表明变体信息，便于变体配置自动补全和智能推荐 */
  variantPoint?: string;
  /** 构建后变体值，表示编译/生成之后的最终变体属性值 */
  postBuildVariantValue: boolean;
  /** 构建后变体多重性，是否具备多重性，支持智能推断控制UI显隐 */
  postBuildVariantMultiplicity?: boolean;
  /** 默认值，为属性赋默认值时的智能提示依据 */
  defaultValue?: string;
  /** UI约束规则描述，UI约束场景专用字段，不存入数据库，智能约束提示 */
  constraintDesc?: string;
}
