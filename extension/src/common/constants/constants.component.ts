/**
 * 组件和模板相关常量定义
 * 用于统一管理组件类型、数据类型、模板配置等
 */

import { md5 } from '@orientais/vscode-core';
import { md5ToUuid } from '@shared/utils/uuid';
import { EProjectType } from './constants.project';

/**
 * 组件类型常量
 * 定义表单组件的类型标识
 */
export const componentTypes = Object.freeze({
  /** 数字输入组件 */
  number: 'number',
  /** 文本输入组件 */
  text: 'text',
  /** 复选框组组件 */
  checkboxGroup: 'checkboxGroup',
  /** 选择器组件 */
  select: 'select',
  /** 表单表格组件 */
  formTable: 'formTable',
  /** 草稿编辑器组件 */
  draft: 'draft',
  /** 开关组件 */
  switch: 'switch',
  /** 单选按钮组件 */
  radio: 'radio'
} as const);

/**
 * 组件类型
 */
export type ComponentType = (typeof componentTypes)[keyof typeof componentTypes];

/**
 * 节点文件类型常量
 * 定义不同节点类型的属性字段
 */
export const nodeFileType = Object.freeze({
  /** 对象类型节点的属性字段 */
  object:
    'AttributeName|Type|Category|MultiplicityLowerBound|MultiplicityUpperBound|Pattern|PatternList|OptionalValueList|Description|DefaultValue|PostBuildVariantMultiplicity|PostBuildVariantValue',
  /** 枚举类型节点的属性字段 */
  enum: 'AttributeName|Description'
} as const);

/**
 * 分类类型常量
 * 定义属性的分类类型
 */
export const categoryType = Object.freeze({
  /** 聚合类型 */
  polymerize: 'Polymerize',
  /** 引用类型 */
  ref: 'Ref'
} as const);

/**
 * 抽象数据类型常量
 * 定义系统支持的所有数据类型
 */
export const abstractDataType = Object.freeze({
  /** 正整数类型 */
  positiveInteger: 'PositiveInteger',
  /** 字符串类型 */
  string: 'String',
  /** 标识符类型 */
  identifier: 'Identifier',
  /** 强修订标签字符串 */
  strongRevisionLabelString: 'StrongRevisionLabelString',
  /** 选择类型 */
  select: 'Select',
  /** 枚举类型 */
  enum: 'Enum',
  /** 草稿类型 */
  draft: 'Draft',
  /** 布尔类型 */
  boolean: 'Boolean',
  /** IPv4 地址字符串 */
  ip4AddressString: 'Ip4AddressString',
  /** IPv6 地址字符串 */
  ip6AddressString: 'Ip6AddressString',
  /** 时间值类型 */
  timeValue: 'TimeValue'
} as const);

/**
 * 抽象数据类型
 */
export type AbstractDataType = (typeof abstractDataType)[keyof typeof abstractDataType];

/**
 * 属性类型映射
 * 将组件类型映射到对应的抽象数据类型数组
 */
export const attributeTypeMapping = {
  [componentTypes.number]: [abstractDataType.positiveInteger, abstractDataType.timeValue],
  [componentTypes.text]: [
    abstractDataType.string,
    abstractDataType.identifier,
    abstractDataType.strongRevisionLabelString,
    abstractDataType.ip4AddressString,
    abstractDataType.ip6AddressString
  ],
  [componentTypes.checkboxGroup]: [],
  [componentTypes.select]: [abstractDataType.select, abstractDataType.enum],
  [componentTypes.formTable]: [],
  [componentTypes.draft]: [abstractDataType.draft],
  [componentTypes.radio]: [abstractDataType.boolean]
};

/**
 * 唯一节点类型枚举
 * 定义特殊的唯一节点类型
 */
export enum EUniqueNodeType {
  /** 可执行文件节点 */
  Executable = 'Executable',
  /** 进程节点 */
  Process = 'Process',
  /** 自适应软件组件节点 */
  AdaptiveSoftwareComponent = 'AdaptiveSoftwareComponent'
}

/**
 * Markdown 相关枚举
 * 定义 Markdown 文件的配置常量
 */
export enum MarkDown {
  /** N模型结构整理分析文件名 */
  NAME = 'N模型结构整理分析.md',
  /** 子文件夹名称 */
  SUB_FOLDER = 'objects',
  /** 覆盖标识 */
  OVERWRITE = 'overwrite',
  /** 文件后缀 */
  SUFFIX = '.md',
  /** 包文件名 */
  PACKAGE = 'Package.md'
}

/**
 * 模板名称枚举
 * 定义模板的显示名称
 */
export enum TemplateName {
  /** 公共模板 */
  COM = '**公共**',
  /** 应用开发模板 */
  APP = '**应用开发**',
  /** 机器配置模板 */
  SYS = '**机器配置**',
  /** 平台自用预置枚举模板 */
  ENUM = '**平台自用预置枚举**'
}

/**
 * 模板ID枚举
 * 定义各种模板的唯一标识符
 */
export enum TemplateId {
  /** 库模板 */
  LIB = '6d8711aac9315941273546278cc32d3a',
  /** 应用模板 */
  APP = '10d3dea14746ea678c2da092941c8a58',
  /** 单元模板 */
  UNIT = 'e694ba8613bcbeb270327efcf335c74d',
  /** 系统模板 */
  SYS = '52e51a16528c0cae32f6b8eeb44aca04',
  /** 枚举模板 */
  ENUM = '4c1cd057d4819d55c1bad6d456267be9',
  /** 信息模板 */
  INFO = '0ff1f4b03917ae3180c1cb5676d3306e'
}

/**
 * 特殊节点映射
 * 用于导入时的特殊节点映射关系
 */
export const specialNodeMapping = {
  Process: { softwareComponent: 'c9dcbe351ff2b1c1266375c3dcda85b0' }
};

/**
 * 节点忽略属性配置
 * 定义各节点类型需要忽略的属性列表
 */
export const nodeLogicRemoveAttr = {
  /** Executable 节点忽略的属性 */
  '29942700da84a0314735159fb9e357c6': ['softwareComponent'],
  /** AdaptiveSoftwareComponent 节点忽略的属性 */
  c9dcbe351ff2b1c1266375c3dcda85b0: ['softwareComponent'],
  /** 可能是变更前的 Process 节点忽略的属性 */
  '647720a72b9ca1eb44d7d8843ddbe0ea': ['softwareComponent'],
  /** Process 节点忽略的属性 */
  b69d391a81e77d5a6fa13d29073f3617: ['softwareComponent']
};

/**
 * 模板节点必须大纲配置
 * 定义节点右键取骨架值的配置
 */
export const templateNodeMustOutline = {
  '0b0a223350dbd30147268ee1f7c4c3b4': 'T'
};

/**
 * 虚拟节点配置
 * 定义虚拟节点的映射关系
 */
export const dummyNode = {
  /** 应用节点 -> 描述 */
  '609df1ad138ef4f64253ed792bb2dd62': '9c82475fc37b37de61169d8ca73b679e',
  /** 机器节点 -> 描述 */
  e522cf7212b5cca89b0dc10f4042fe5f: '925bd2e8462f9b3dcf5afafa1e953b95'
};

/**
 * 模板配置数组
 * 定义项目类型与模板的对应关系
 */
export const templateConfig = [
  {
    projectType: EProjectType.APPLICATION,
    templateArr: [TemplateId.APP]
  },
  {
    projectType: EProjectType.LIBRARY,
    templateArr: [TemplateId.LIB]
  },
  {
    projectType: EProjectType.UNIT,
    templateArr: [TemplateId.UNIT]
  },
  {
    projectType: EProjectType.SYSTEM,
    templateArr: [TemplateId.SYS]
  }
] as const;

/**
 * 文档模板常量
 * 定义文档结构的基础模板
 */
export const documentTemplate = Object.freeze({
  _iSoft: {
    type: 'Document'
  },
  modelVersion: {
    _iSoft: {
      type: 'Version'
    },
    major: '0',
    minor: '1'
  },
  package: [] as Array<unknown>
} as const);

/**
 * 子包模板常量
 * 定义子包结构的基础模板
 */
export const subPackageTemplate = Object.freeze({
  _iSoft: {
    type: 'Package'
  },
  shortName: 'iSOFT',
  package: [] as Array<unknown>
} as const);

/**
 * 真实包模板常量
 * 定义真实包结构的基础模板
 */
export const realPackageTemplate = Object.freeze({
  _iSoft: {
    type: 'Package'
  },
  shortName: ''
} as const);

/**
 * 向后兼容的导出
 * @deprecated 建议使用 componentTypes 替代
 */
export const ComponentTypes = {
  NUMBER: componentTypes.number,
  TEXT: componentTypes.text,
  CHECK_BOX_GROUP: componentTypes.checkboxGroup,
  SELECT: componentTypes.select,
  FORM_TABLE: componentTypes.formTable,
  DRAFT: componentTypes.draft,
  SWITCH: componentTypes.switch,
  RADIO: componentTypes.radio
};

/**
 * @deprecated 建议使用 nodeFileType 替代
 */
export const NFileType = {
  OBJECT: nodeFileType.object,
  ENUM: nodeFileType.enum
};

/**
 * @deprecated 建议使用 categoryType 替代
 */
export const CategoryType = {
  POLYMERIZE: categoryType.polymerize,
  REF: categoryType.ref
};

/**
 * @deprecated 建议使用 abstractDataType 替代
 */
export const ADataType = {
  PositiveInteger: abstractDataType.positiveInteger,
  String: abstractDataType.string,
  Identifier: abstractDataType.identifier,
  StrongRevisionLabelString: abstractDataType.strongRevisionLabelString,
  Select: abstractDataType.select,
  Enum: abstractDataType.enum,
  Draft: abstractDataType.draft,
  Boolean: abstractDataType.boolean,
  Ip4AddressString: abstractDataType.ip4AddressString,
  Ip6AddressString: abstractDataType.ip6AddressString,
  TimeValue: abstractDataType.timeValue
};

/**
 * @deprecated 建议使用 attributeTypeMapping 替代
 */
export const AttributeType = attributeTypeMapping;

/**
 * @deprecated 建议使用 specialNodeMapping 替代
 */
export const SpecialNodeMapping = specialNodeMapping;

/**
 * @deprecated 建议使用 nodeLogicRemoveAttr 替代
 */
export const NodeLogicRemoveAttr = nodeLogicRemoveAttr;

/**
 * @deprecated 建议使用 templateNodeMustOutline 替代
 */
export const TemplateNodeMustOutLine = templateNodeMustOutline;

/**
 * @deprecated 建议使用 dummyNode 替代
 */
export const DummyNode = dummyNode;

/**
 * @deprecated 建议使用 templateConfig 替代
 */
export const TemplateConfig = templateConfig;

/**
 * @deprecated 建议使用 documentTemplate 替代
 */
export const Document = {
  _iSoft: {
    type: 'Document'
  },
  modelVersion: {
    _iSoft: {
      type: 'Version'
    },
    major: '0',
    minor: '1'
  },
  package: [] as Array<unknown>
};

/**
 * @deprecated 建议使用 subPackageTemplate 替代
 */
export const SubPackage = {
  _iSoft: {
    type: 'Package'
  },
  shortName: 'iSOFT',
  package: [] as Array<unknown>
};

/**
 * @deprecated 建议使用 realPackageTemplate 替代
 */
export const RealPackage = {
  _iSoft: { type: 'Package' },
  shortName: ''
};

/**
 * 初始化文档模板
 */
export const InitDocument = (): typeof Document => {
  const document = JSON.parse(JSON.stringify(Document));
  document.modelVersion.major = '0';
  document.modelVersion.minor = '6';
  document.modelVersion._iSoft.id = '';
  document.modelVersion._iSoft.id = md5ToUuid(md5('0.10'));
  return document;
};
