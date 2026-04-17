/**
 * ARE（Application Runtime Environment）相关常量定义
 * 用于统一管理应用运行环境的配置和常量
 */

/**
 * 生成类型常量
 * 定义软件包生成的类型标识
 */
export const generateType = Object.freeze({
  full: '完整版',
  middle: '中间件增量版',
  application: '应用增量版'
} as const);

/**
 * 生成类型枚举
 * 用于类型安全的生成类型引用
 */
export type GenerateType = (typeof generateType)[keyof typeof generateType];

/**
 * 生成类型描述常量
 * 提供每种生成类型的详细说明
 */
export const generateTypeDesc = Object.freeze({
  full: '全量包，适用首次生成',
  middle: '增量包，只包含基础中间件的库及bin文件。适用于基础中间件发生变更，应用无变更的情况。',
  application: '增量包，只包含用户软件集部分内容。适用于仅应用有变更的情况。'
} as const);

/**
 * 生成类型描述枚举
 */
export type GenerateTypeDesc = (typeof generateTypeDesc)[keyof typeof generateTypeDesc];

/**
 * ARE 路径配置常量
 */
export const arePath = Object.freeze({
  /** ARE 默认安装路径 (Linux/Unix) */
  install: '/isoft/are/install',
  /** ARE 默认导出路径 (Windows) */
  export: 'C:\\isoft\\export\\are',
  /** ARE 导出路径（相对） */
  exportPath: 'export/are/',
  /** ARE 配置 JSON 路径 */
  configJsonPath: 'are/json/',
  /** ARE 配置路径 */
  configPath: 'config/are/'
} as const);

/**
 * ARE 路径类型
 */
export type ArePathKey = keyof typeof arePath;

/**
 * ARE 相关文件名常量
 * 定义 ARE 相关的文件和目录名称
 */
export const areFile = Object.freeze({
  /** DLT 数据库路径 */
  dltDb: 'dltDB',
  /** 依赖清单文件名 */
  depManifest: 'dep_manifest.json',
  /** ARE 命令系统监控文件名 */
  areCmdSysMonitor: 'are-cmd-sys-monitor'
} as const);

/**
 * ARE JSON 配置文件名常量
 * 定义不同生成类型对应的 JSON 配置文件
 */
export const areJsonFile = Object.freeze({
  /** 完整版 JSON 配置 */
  full: 'Full.json',
  /** 中间件增量版 JSON 配置 */
  middle: 'Middle.json',
  /** 应用增量版 JSON 配置 */
  application: 'Application.json'
} as const);

/**
 * ARE 文件名类型
 */
export type AreFileName = (typeof areFile)[keyof typeof areFile];

/**
 * 设备和功能相关常量
 * 定义设备配置和功能标签
 */
export const device = Object.freeze({
  /** 预置设备名称 */
  presetName: '预置设备'
} as const);

/**
 * 快速选择标签常量
 * 定义快速选择菜单中使用的标签
 */
export const quickPickLabel = Object.freeze({
  /** 启停功能组标签 */
  functionGroup: '启停功能组',
  /** 切换状态机标签 */
  stateMachine: '切换状态机'
} as const);

/**
 * 快速选择标签类型
 */
export type QuickPickLabel = (typeof quickPickLabel)[keyof typeof quickPickLabel];

/**
 * 生成类型到配置路径的映射
 * 将生成类型映射到对应的配置文件完整路径
 */
export const generateTypeConfigMap: Record<string, string> = {
  [generateType.full]: arePath.configPath + areJsonFile.full,
  [generateType.middle]: arePath.configPath + areJsonFile.middle,
  [generateType.application]: arePath.configPath + areJsonFile.application
};

/**
 * 生成类型到 JSON 路径的映射
 * 将生成类型映射到对应的 JSON 配置文件完整路径
 */
export const generateTypeJsonMap: Record<string, string> = {
  [generateType.full]: arePath.configJsonPath + areJsonFile.full,
  [generateType.middle]: arePath.configJsonPath + areJsonFile.middle,
  [generateType.application]: arePath.configJsonPath + areJsonFile.application
};

/**
 * 向后兼容的导出
 * 保持与旧代码的兼容性
 * @deprecated 建议使用 generateType.full 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GENERATE_TYPE_FULL = generateType.full;

/**
 * @deprecated 建议使用 generateType.middle 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GENERATE_TYPE_MIDDLE = generateType.middle;

/**
 * @deprecated 建议使用 generateType.application 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GENERATE_TYPE_APPLICATION = generateType.application;

/**
 * @deprecated 建议使用 generateTypeDesc.full 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GENERATE_TYPE_FULL_DESC = generateTypeDesc.full;

/**
 * @deprecated 建议使用 generateTypeDesc.middle 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GENERATE_TYPE_MIDDLE_DESC = generateTypeDesc.middle;

/**
 * @deprecated 建议使用 generateTypeDesc.application 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const GENERATE_TYPE_APPLICATION_DESC = generateTypeDesc.application;

/**
 * @deprecated 建议使用 arePath.install 替代
 */
export const defaultAreInstallPath = arePath.install;

/**
 * @deprecated 建议使用 arePath.export 替代
 */
export const defaultAreExportPath = arePath.export;

/**
 * @deprecated 建议使用 device.presetName 替代
 */
export const presetDeviceName = device.presetName;

/**
 * @deprecated 建议使用 quickPickLabel.functionGroup 替代
 */
export const quickPickLabelFunctionGroup = quickPickLabel.functionGroup;

/**
 * @deprecated 建议使用 quickPickLabel.stateMachine 替代
 */
export const quickPickLabelStateMachine = quickPickLabel.stateMachine;

/**
 * @deprecated 建议使用 areFile.dltDb 替代
 */
export const dltDbPath = areFile.dltDb;

/**
 * @deprecated 建议使用 areFile.depManifest 替代
 */
export const depManifestFileName = areFile.depManifest;

/**
 * @deprecated 建议使用 areFile.areCmdSysMonitor 替代
 */
export const areCmdSysMonitorFileName = areFile.areCmdSysMonitor;

/**
 * @deprecated 建议使用 arePath.exportPath 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ARE_EXPORT_PATH = arePath.exportPath;

/**
 * @deprecated 建议使用 arePath.configJsonPath 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ARE_CONFIG_JSON_PATH = arePath.configJsonPath;

/**
 * @deprecated 建议使用 arePath.configPath 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ARE_CONFIG_PATH = arePath.configPath;

/**
 * @deprecated 建议使用 areJsonFile.full 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ARE_JSON_FULL = areJsonFile.full;

/**
 * @deprecated 建议使用 areJsonFile.middle 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ARE_JSON_MIDDLE = areJsonFile.middle;

/**
 * @deprecated 建议使用 areJsonFile.application 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ARE_JSON_APPLICATION = areJsonFile.application;

/**
 * @deprecated 建议使用 generateTypeConfigMap 替代
 */
export const GenerateTypeConfigMap: Record<string, string> = generateTypeConfigMap;

/**
 * @deprecated 建议使用 generateTypeJsonMap 替代
 */
export const GenerateTypeJsonMap: Record<string, string> = generateTypeJsonMap;
