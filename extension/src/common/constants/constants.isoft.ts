/**
 * ISoft 节点身份枚举
 * 定义节点的身份类型
 */
export enum ISoftNodeIdentity {
  EXE = 'Executable',
  MACHINE = 'Machine',
  EXECUTABLE_REF = 'executableRef',
  PACKAGE = 'Package'
}

/**
 * ISoft 节点类型枚举
 * 定义节点的层级和类型
 */
export enum ISoftNodeType {
  App = 'APP',
  Root = 'ROOT',
  SubRoot = 'SUB-ROOT',
  Node = 'NODE',
  Attr = 'ATTR',
  Enum = 'ENUM'
}

/**
 * ISoft 快捷键类型枚举
 * 定义系统支持的所有快捷键操作
 */
export enum ISoftHotkeyType {
  Undo = 'isoft.undo',
  Redo = 'isoft.redo',
  Remove = 'remove',
  Expand = 'expand',
  Copy = 'copy',
  Cut = 'cut',
  Paste = 'paste',
  Clone = 'clone'
}

/**
 * ISoft 数据类型枚举
 * 定义系统支持的数据类型
 */
export enum ISoftDataType {
  Project = 'Project',
  Swc = 'SoftwareComponent',
  App = 'Application'
}

/**
 * ISoft 操作处理类型枚举
 * 定义数据操作的类型
 */
export enum ISoftHandleType {
  Remove = 'remove' /* 删除 */,
  Update = 'update' /* 更新 */,
  Insert = 'insert' /* 新增 */,
  Reset = 'reset' /* 回复 */
}

/**
 * ISoft 文件操作类型枚举
 * 定义文件操作的类型
 */
export enum ISoftFileHandleType {
  Create = 'create',
  Update = 'update',
  Delete = 'delete'
}

/**
 * ISoft 标识类型枚举
 * 定义标识的类型
 */
export enum ISoftIdentify {
  ShortName = 'shortName',
  Info = 'Info',
  package = 'package',
  Package = 'Package',
  info = 'info'
}

export const PackageIdentify = '0970a2f2d6e6b3116fa73753b320fdfe';

/**
 * ISoft 布尔类型枚举
 * 定义布尔值的字符串表示
 */
export enum ISoftBooleanType {
  True = 'true',
  False = 'false'
}

/**
 * 消息类型枚举
 * 定义系统消息的类型
 */
export enum EMessageType {
  Success = 'success',
  Information = 'information',
  Error = 'error',
  Warning = 'warning'
}

/**
 * 文件类型枚举
 * 定义文件的状态类型
 */
export enum EFileType {
  Saved = 'saved',
  ToSave = 'toSave'
}

export enum EDataType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  array = 'array'
}
