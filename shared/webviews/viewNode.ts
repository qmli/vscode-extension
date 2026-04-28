export interface TreeNode {
  id: string; // 节点唯一标识符
  label: string; // 节点显示的名称或标签
  nodeType: 'pro' | 'folder' | 'node'; // 节点类型，用于区分不同的节点类别
  children?: TreeNode[]; // 子节点，递归结构，只有当节点有子节点时存在
  parentId?: string; // 父节点ID（可选），表示该节点属于哪个父节点
  isExpanded?: boolean; // 是否展开该节点，通常用于树形视图的状态管理
  isSelected?: boolean; // 是否被选中，用于节点选择状态
  isLeaf?: boolean; // 是否是叶子节点（没有子节点），用来优化渲染和判断
  icon?: string; // 节点的图标，通常用于显示在树形结构旁边
  data?: any; // 额外的附加数据，可以用于存储其他需要的数据
  disabled?: boolean; // 节点是否被禁用，控制节点是否可以交互
  [key: string]: any; // 额外的自定义属性，可以添加其他非标准的字段
}
