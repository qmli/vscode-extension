// 组件相关类型定义

export type ButtonType = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

export type MessageType = 'success' | 'warning' | 'error' | 'info';
export type AlertType = 'success' | 'warning' | 'error' | 'info';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface TableColumn {
  key: string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  fixed?: 'left' | 'right';
  render?: (value: any, record: any, index: number) => string | any;
}

export interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  icon?: string;
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  [key: string]: any;
}

export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
  icon?: string;
  group?: string;
}

export interface FormRule {
  required?: boolean;
  message?: string;
  trigger?: 'blur' | 'change' | ['blur', 'change'];
  validator?: (value: unknown) => boolean | string | Promise<boolean | string>;
}

export interface FormItemProps {
  label?: string;
  name?: string;
  rules?: FormRule[];
  required?: boolean;
  labelWidth?: string | number;
  error?: string;
}

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  pageSizeOptions?: number[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
  disabled?: boolean;
}

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  closable?: boolean;
  content?: string | any;
}

export interface CollapseItem {
  key: string;
  title: string;
  icon?: string;
  disabled?: boolean;
  content?: string | any;
}

export interface DropdownItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  divided?: boolean;
  command?: string | number;
}

export interface MessageOptions {
  type?: MessageType;
  message: string;
  duration?: number;
  showClose?: boolean;
  onClose?: () => void;
}

export interface LoadingOptions {
  text?: string;
  spinner?: string;
  background?: string;
  target?: HTMLElement | string;
}

// 动态表单相关类型定义

// 字段类型枚举
export type DynamicFieldType =
  | 'text' // 文本框
  | 'textarea' // 多行文本
  | 'number' // 数字输入
  | 'select' // 下拉列表
  | 'select-table' // 表格下拉选择器
  | 'table' // 嵌套表格
  | 'list' // 列表（数组，以列表形式展示）
  | 'boolean' // 开关
  | 'date'; // 日期选择

type TableColumnKeys = { [K in TableColumn['key']]: string };
// 字段配置接口
export interface DynamicFieldConfig {
  key: string; // 字段唯一标识
  label: string; // 字段标签
  type: DynamicFieldType; // 字段类型
  required?: boolean; // 是否必填
  placeholder?: string; // 占位符
  disabled?: boolean; // 是否禁用
  defaultValue?: any; // 默认值

  // 布局配置
  col?: number; // 占用列数（1-24），用于栅格布局
  labelWidth?: string; // 单个字段的标签宽度，覆盖全局配置

  // 下拉列表特定配置
  options?: SelectOption[] | TableColumnKeys[]; // 下拉选项

  // 嵌套表格/列表特定配置
  tableColumns?: TableColumn[]; // 表格列配置
  canAddChild?: boolean; // 是否可以添加子项
  childTemplate?: Record<string, any>; // 子项模板
  listItemType?: 'select' | 'input'; // 列表项类型（当 type 为 'list' 时）

  // 验证规则
  rules?: FormRule[];

  // 表格下拉选择器特定配置
  selectTableConfig?: SelectTableConfig;
}

// 表格下拉选择器选项配置
export interface SelectTableOption {
  value: any; // 选项值
  [key: string]: any; // 其他列的数据（如 ObjectType, ShortName 等）
}

// 表格下拉选择器配置
export interface SelectTableConfig {
  columns: TableColumn[]; // 表格列配置
  valueKey: string; // 作为值的字段key（如 'id'）
  labelKey?: string; // 作为显示标签的字段key（如 'ShortName'）
  searchKeys?: string[]; // 可搜索的字段keys（如 ['ObjectType', 'ShortName']）
  pageSize?: number; // 每页显示数量，默认10
  showAddButton?: boolean; // 是否显示添加按钮
  addButtonText?: string; // 添加按钮文字
  addFields?: DynamicFieldConfig[]; // 添加新选项时的表单字段配置
  remoteMethod?: (query: string) => Promise<SelectTableOption[]>; // 远程搜索方法
}

// 字段分组配置
export interface DynamicFieldGroup {
  title: string; // 分组标题
  key: string; // 分组唯一标识
  collapsible?: boolean; // 是否可折叠
  defaultCollapsed?: boolean; // 默认是否折叠
  fields: DynamicFieldConfig[]; // 分组内的字段
  columns?: number; // 分组内的列数布局（1、2、3 等）
}

// 动态表单配置
export interface DynamicFormConfig {
  fields?: DynamicFieldConfig[]; // 字段配置数组（扁平结构）
  groups?: DynamicFieldGroup[]; // 分组配置数组（分组结构）
  labelWidth?: string; // 标签宽度
  size?: 'small' | 'default' | 'large'; // 表单尺寸
  columns?: number; // 全局列数布局（1、2、3 等）
}

// ============================================================
// 迁移自 common 目录的组件类型
// ============================================================

/** 动态表单字段组件类型（与 FormFieldItem / DynamicForm 渲染逻辑一致） */
export type FormFieldComponent =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'checkboxGroup'
  | 'switch'
  | 'radio'
  | 'draft'
  | 'textarea'
  | 'upload'
  | 'formTable';

// 表单字段项配置（兼容旧 FormEntry 接口）
export interface FormFieldEntry {
  id: string;
  span?: number;
  component: FormFieldComponent;
  label: string;
  name: string;
  tips?: string;
  description?: string;
  constraintDesc?: string;
  longName?: string;
  disabled?: boolean;
  hideHandle?: string;
  multiple?: boolean;
  lowerBound?: string;
  value?: any;
  options?: FormFieldOptions;
  rules?: any[];
  __draft?: DraftConfig;
  __url?: object;
  __param?: object;
  __maxLength?: number;
}

// 草稿选择器配置
export interface DraftConfig {
  headers: DraftHeader[];
  /** 显示文本字段名（对应 SelectTable.labelKey） */
  label: string;
  /** 唯一值字段名（对应 SelectTable.valueKey） */
  value: string;
  multiple: boolean;
  /** emit 时只保留的字段；空数组表示返回整行（对应 SelectTable.resultKeys） */
  result: string[];
  /**
   * 异步加载数据：由调用方（如 DesignerNormal）传入，
   * 组件本身不感知业务层（DataBus、API 等）。
   */
  fetchData?: (params: SelectTableFetchParams) => Promise<SelectTableResult>;
  /**
   * 搜索框触发时的回调（对应 SelectTable 的 search emit），
   * 由调用方（如 DesignerNormal）传入，用于感知关键词变化。
   */
  onSearch?: (keyword: string) => void;
  /** @deprecated 由 fetchData 替代，保留以兼容旧数据 */
  iType?: string[] | string;
  /** @deprecated 由 fetchData 替代，保留以兼容旧数据 */
  transCommand?: string;
}

// 草稿表头配置
export interface DraftHeader {
  label: string;
  prop: string;
  width?: string;
  hide?: boolean;
}

// 表单字段选项
export interface FormFieldOptions {
  items?: any[];
  placeholder?: string;
  maxlength?: number;
  multiple?: boolean;
  draft?: DraftConfig;
}

// FormSection 组件 Props
export interface FormSectionProps {
  isTable?: boolean;
  hasLabel?: boolean;
  hasDivider?: boolean;
  column?: number;
  title?: string;
  formItems: FormFieldEntry[];
  dynamicForm: Record<string, any>;
  size?: string;
  hideHandle?: (item: FormFieldEntry) => boolean;
  rulesHandle?: (item: FormFieldEntry) => any[];
  updateName?: (name: string) => void;
  /**
   * @deprecated 旧签名：updateNode(id, prop, isWrite?)，请改为 updateNode(item)
   */
  updateNode?: ((item: FormFieldEntry) => void) | ((id: string, prop: string, isWrite: boolean) => void);
  sendMessage?: (message: string) => void;
}

// FormTable 组件 Props（表格行为可序列化对象，用 unknown 表示任意行结构）
export interface FormTableProps {
  modelValue: unknown[];
  addTemplate: Record<string, unknown>;
  placeholder?: string;
  size?: string;
  maxHeight?: string | number;
  maxLength?: number;
  dragSort?: boolean;
  hideAdd?: boolean;
  hideDelete?: boolean;
}

// EllipsisTooltip 组件 Props
export interface EllipsisTooltipProps {
  content?: string;
  width?: string;
  effect?: string;
  placement?: string;
  color?: string;
  type?: string;
}

// DiffMerge 组件 Props
export interface DiffMergeProps {
  original?: string;
  modified?: string;
  language?: string;
  height?: string;
  theme?: string;
}

// ISoftDialog 组件 Props
export interface SoftDialogProps {
  modelValue?: boolean;
  title?: string;
  initFullscreen?: boolean;
  showClose?: boolean;
  showFullscreen?: boolean;
  drag?: boolean;
  loading?: boolean;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
  appendToBody?: boolean;
  modal?: boolean;
  width?: string;
  height?: string;
  size?: string;
}

// ============================================================
// SelectTable 组件类型
// ============================================================

/** 表格列头配置 */
export interface SelectTableHeader {
  prop: string;
  label: string;
  key?: string;
  width?: string;
  hide?: boolean;
}

/** 表格行数据类型 */
export type SelectTableRow = Record<string, unknown>;

/** 分页 + 搜索参数，额外字段由调用方扩展 */
export interface SelectTableFetchParams {
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

/** fetchData 回调返回结构 */
export interface SelectTableResult {
  rows: SelectTableRow[];
  /** 未提供时自动使用 rows.length */
  total?: number;
  /** 动态表头，优先级高于 headers prop */
  headers?: SelectTableHeader[];
}

/** v-model 绑定值类型 */
export type SelectTableModelValue = SelectTableRow | SelectTableRow[] | string | null | undefined;

// ResizePanel 组件 Props
export interface ResizePanelProps {
  height?: number;
  headerHeight?: string;
  leftPanelWidth?: string;
  paddingLeft?: string;
  hideScrollbar?: boolean;
  hasAside?: boolean;
  dragging?: boolean;
  overflowY?: boolean;
  showHeader?: boolean;
  showAsideHeader?: boolean;
  panelId?: string;
  id?: string;
  handleExpand?: (expanded: boolean) => void;
  addObject?: () => void;
}
