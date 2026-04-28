export enum EIntegrityLevel {
  Error = 'error',
  Warning = 'warning'
}
export interface Integrity {
  // 工程Id
  appId: string;
  // 工程名称
  appName: string;
  // 根Id
  rootId: string;
  // 节点Id
  nodeId: string;
  // 节点名称
  nodeName: string;
  // 属性ID
  attrId: string;
  // 属性名称
  attrName: string;
  // 树ID
  treeId: string;
  // 属性值
  value: string;
  // 信息描述
  message: string;
  // 严重程度：error(错误) | warning(警告)
  level: EIntegrityLevel;
  // 父节点
  parentNodeId?: string;
  // 子节点
  children?: Integrity[];
}
