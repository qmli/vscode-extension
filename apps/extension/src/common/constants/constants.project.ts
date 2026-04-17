/**
 * 项目相关常量定义
 * 用于统一管理项目类型、平台、AUTOSAR 标准等
 */

/**
 * 项目类型枚举
 * 定义系统支持的所有项目类型
 */
export enum EProjectType {
  /** 架构项目 */
  ARCHITECTURE = 'architecture',
  /** 应用项目 */
  APPLICATION = 'application',
  /** 库项目 */
  LIBRARY = 'library',
  /** 集成项目 */
  INTEGRATED = 'integrated',
  /** 单元项目 */
  UNIT = 'unit',
  /** 系统项目 */
  SYSTEM = 'system'
}

/**
 * AUTOSAR 平台标识
 * 定义平台的简称标识
 */
export const autosarPlatform = Object.freeze({
  /** 自适应平台 (Adaptive Platform) */
  ap: 'AP',
  /** 经典平台 (Classic Platform) */
  cp: 'CP',
  /** 全部平台 (All) */
  al: 'AL'
} as const);

/**
 * 平台类型
 */
export type PlatformType = (typeof autosarPlatform)[keyof typeof autosarPlatform];

/**
 * 平台路径前缀配置
 * 定义不同平台的资源路径前缀
 */
export const platformPrefix = Object.freeze({
  /** 自适应平台路径前缀 */
  ap: ['resources', 'models', '0.10', 'objects', 'adaptive'],
  /** 经典平台路径前缀 */
  cp: ['resources', 'models', '0.10', 'objects', 'classic']
} as const);

/**
 * 授权平台配置
 * 定义已授权的平台列表
 */
export const authPlatform = [autosarPlatform.cp] as const;

/**
 * AUTOSAR 标准版本
 * 定义支持的 AUTOSAR 标准版本
 */
export const autosarVersion = Object.freeze({
  /** AUTOSAR R23-11 版本 */
  r23_11: 'AUTOSAR R23-11',
  /** AUTOSAR R20-11 版本 */
  r20_11: 'AUTOSAR R20-11',
  /** AUTOSAR R19-11 版本 */
  r19_11: 'AUTOSAR R19-11'
} as const);

/**
 * AUTOSAR 版本类型
 */
export type AutosarVersionType = (typeof autosarVersion)[keyof typeof autosarVersion];

/**
 * AUTOSAR 标准描述
 * 提供每个标准版本的详细说明
 */
export const autosarStandards = Object.freeze({
  [autosarVersion.r23_11]: '现已支持AP自适应平台和CP经典平台',
  [autosarVersion.r20_11]: '当前仅支持AP自适应平台',
  [autosarVersion.r19_11]: '当前仅支持CP经典平台'
} as const);

/**
 * 向后兼容的导出
 * @deprecated 建议使用 platformPrefix.ap 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Platform_AP_Prefix = platformPrefix.ap;

/**
 * @deprecated 建议使用 platformPrefix.cp 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Platform_CP_Prefix = platformPrefix.cp;

/**
 * @deprecated 建议使用 platform.ap 替代
 */

export const AP = autosarPlatform.ap;

/**
 * @deprecated 建议使用 platform.cp 替代
 */

export const CP = autosarPlatform.cp;

/**
 * @deprecated 建议使用 platform.al 替代
 */

export const AL = autosarPlatform.al;

/**
 * @deprecated 建议使用 autosarVersion.r23_11 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AUTOSAR_R23_11 = autosarVersion.r23_11;

/**
 * @deprecated 建议使用 autosarVersion.r20_11 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AUTOSAR_R20_11 = autosarVersion.r20_11;

/**
 * @deprecated 建议使用 autosarVersion.r19_11 替代
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AUTOSAR_R19_11 = autosarVersion.r19_11;

/**
 * @deprecated 临时固定为0.10 建议后续适配多版本
 */
export const iSoftGlobal = {
  N_VERSION: '0.10' // Nmodel版本
};

/**
 * 通用结果状态码
 * `T`: 成功，`F`: 失败，`E`: 异常
 */
export enum Code {
  /** 成功 */
  T = '00',
  /** 失败 */
  F = '01',
  /** 异常 */
  E = '99'
}

/**
 * 项目定义配置
 * 定义项目操作菜单的配置信息
 */
// export const projectDefinition = [
//   //-------------------------------------------------------------------------------------
//   {
//     group: '1',
//     command: AppProjectConfig.Command.DEP_PROJECT_LINK,
//     label: 'DEP配置关联',
//     contains: [EProjectType.INTEGRATED, EProjectType.APPLICATION]
//   },
//   {
//     group: '1',
//     command: AppProjectConfig.Command.PROJECT_ADD_INTEGRATED,
//     label: '添加配置单元',
//     contains: [EProjectType.INTEGRATED]
//   },
//   {
//     group: '1',
//     command: AppProjectConfig.Command.PROJECT_REFERENCE,
//     label: '引用工程',
//     contains: [EProjectType.APPLICATION, EProjectType.UNIT, EProjectType.SYSTEM, EProjectType.LIBRARY]
//   },
//   {
//     group: '1',
//     command: '',
//     label: '',
//     contains: [EProjectType.APPLICATION, EProjectType.INTEGRATED, EProjectType.UNIT, EProjectType.LIBRARY]
//   },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '2',
//     command: AppProjectConfig.Command.PROJECT_GEN_CODE,
//     label: '生成工程代码',
//     contains: [EProjectType.APPLICATION]
//   },
//   {
//     group: '2',
//     command: AppProjectConfig.Command.PROJECT_EXPORT,
//     label: '导出',
//     contains: [EProjectType.APPLICATION]
//   },
//   { group: '2', command: '', label: '', contains: [EProjectType.APPLICATION] },
//   {
//     group: '12',
//     command: AppProjectConfig.Command.EXPORT_EXT,
//     label: '萃取导出',
//     contains: [EProjectType.APPLICATION]
//   },
//   { group: '12', command: '', label: '', contains: [EProjectType.APPLICATION] },
//   {
//     group: '13',
//     command: AppProjectConfig.Command.EXPORT_PRJ,
//     label: '工程导出',
//     contains: [EProjectType.APPLICATION]
//   },
//   { group: '13', command: '', label: '', contains: [EProjectType.APPLICATION] },
//   {
//     group: '16',
//     command: AppProjectConfig.Command.IMPORT_JSON,
//     label: '导入 JSON',
//     contains: [EProjectType.APPLICATION]
//   },
//   { group: '16', command: '', label: '', contains: [EProjectType.APPLICATION] },
//   {
//     group: '17',
//     command: AppProjectConfig.Command.IMPORT_ARXML,
//     label: '导入 ARXML',
//     contains: [EProjectType.APPLICATION]
//   },
//   { group: '17', command: '', label: '', contains: [EProjectType.APPLICATION] },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '4',
//     command: AppProjectConfig.Command.PROJECT_MAKE_ARE_RUNTIME,
//     label: '生成ARE运行时',
//     contains: [EProjectType.UNIT]
//   },
//   {
//     group: '4',
//     command: AppProjectConfig.Command.PROJECT_PUSH_ARE_DEVICE,
//     label: '推送ARE至设备',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '4', command: '', label: '', contains: [EProjectType.UNIT] },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '5',
//     command: AppProjectConfig.Command.PROJECT_EXPORT_ARXML,
//     label: '导出arxml文件',
//     contains: [EProjectType.INTEGRATED, EProjectType.UNIT]
//   },
//   { group: '5', command: '', label: '制作车包', contains: [EProjectType.INTEGRATED] },
//   {
//     group: '5',
//     command: AppProjectConfig.Command.PROJECT_MAKE_PACKAGE,
//     label: '制作软件包',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '5', command: '', label: '', contains: [EProjectType.INTEGRATED, EProjectType.UNIT] },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '6',
//     command: AppProjectConfig.Command.PROJECT_DELETE_PROJECT,
//     label: '删除工程',
//     contains: [EProjectType.APPLICATION, EProjectType.ARCHITECTURE, EProjectType.LIBRARY]
//   },
//   {
//     group: '6',
//     command: AppProjectConfig.Command.PROJECT_DELETE_PROJECT,
//     label: '删除ECU配置工程',
//     contains: [EProjectType.INTEGRATED]
//   },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '11',
//     command: AppProjectConfig.Command.EXPORT_SVC,
//     label: '服务封装',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '11', command: '', label: '', contains: [EProjectType.UNIT] },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '14',
//     command: AppProjectConfig.Command.EXPORT_PRJ,
//     label: '工程导出',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '14', command: '', label: '', contains: [EProjectType.UNIT] },
//   {
//     group: '18',
//     command: AppProjectConfig.Command.IMPORT_JSON,
//     label: '导入 JSON',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '18', command: '', label: '', contains: [EProjectType.UNIT] },
//   {
//     group: '19',
//     command: AppProjectConfig.Command.IMPORT_ARXML,
//     label: '导入 ISOFT ARXML',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '19', command: '', label: '', contains: [EProjectType.UNIT] },
//   {
//     group: '20',
//     command: AppProjectConfig.Command.IMPORT_EB,
//     label: '导入 EB ARXML',
//     contains: [EProjectType.UNIT]
//   },
//   { group: '20', command: '', label: '', contains: [EProjectType.UNIT] },
//   {
//     group: '16',
//     command: AppProjectConfig.Command.PROJECT_VALIDATE,
//     label: '校验',
//     contains: [EProjectType.UNIT, EProjectType.APPLICATION]
//   },
//   { group: '16', command: '', label: '', contains: [EProjectType.UNIT, EProjectType.APPLICATION] },
//   //-------------------------------------------------------------------------------------
//   {
//     group: '7',
//     command: AppProjectConfig.Command.PROJECT_DELETE_UNIT,
//     label: '删除配置单元',
//     contains: [EProjectType.UNIT]
//   }
//   //-------------------------------------------------------------------------------------
// ] as const;

// /**
//  * 快速选择项分组配置
//  * CP侧重新梳理的快速选择菜单分组
//  */
// export const quickPickItemGroups = [
//   // AP已有-------------------------------------------------------------------------------------
//   {
//     label: 'AP已有',
//     alwaysShow: true,
//     command: '',
//     kind: QuickPickItemKind.Separator,
//     items: [
//       {
//         command: AppProjectConfig.Command.PROJECT_ADD_INTEGRATED,
//         label: '添加配置单元',
//         contains: [EProjectType.INTEGRATED]
//       },
//       {
//         command: AppProjectConfig.Command.PROJECT_REFERENCE,
//         label: '引用工程',
//         contains: [EProjectType.APPLICATION, EProjectType.UNIT, EProjectType.SYSTEM, EProjectType.LIBRARY]
//       },
//       {
//         command: AppProjectConfig.Command.PROJECT_DELETE_PROJECT,
//         label: '删除工程',
//         contains: [EProjectType.APPLICATION, EProjectType.ARCHITECTURE, EProjectType.LIBRARY]
//       },
//       {
//         command: AppProjectConfig.Command.PROJECT_DELETE_PROJECT,
//         label: '删除ECU配置工程',
//         contains: [EProjectType.INTEGRATED]
//       },
//       {
//         command: AppProjectConfig.Command.PROJECT_DELETE_UNIT,
//         label: '删除配置单元',
//         contains: [EProjectType.UNIT]
//       }
//     ]
//   },

//   // CP导入-------------------------------------------------------------------------------------
//   {
//     label: 'CP导入',
//     alwaysShow: true,
//     command: '',
//     kind: QuickPickItemKind.Separator,
//     items: [
//       {
//         command: AppProjectConfig.Command.IMPORT_JSON,
//         label: '导入 JSON',
//         contains: [EProjectType.APPLICATION, EProjectType.UNIT]
//       },
//       {
//         command: AppProjectConfig.Command.IMPORT_ARXML,
//         label: '导入 ISOFT ARXML',
//         contains: [EProjectType.APPLICATION, EProjectType.UNIT]
//       },
//       {
//         command: AppProjectConfig.Command.IMPORT_EB,
//         label: '导入 EB ARXML',
//         contains: [EProjectType.UNIT]
//       }
//     ]
//   },

//   // CP导出/生成-------------------------------------------------------------------------------------
//   {
//     label: 'CP导出/生成',
//     alwaysShow: true,
//     command: '',
//     kind: QuickPickItemKind.Separator,
//     items: [
//       {
//         command: AppProjectConfig.Command.EXPORT_PRJ,
//         label: '工程导出',
//         contains: [EProjectType.APPLICATION, EProjectType.UNIT]
//       },
//       {
//         command: AppProjectConfig.Command.EXPORT_EXT,
//         label: '萃取导出',
//         contains: [EProjectType.APPLICATION]
//       },
//       {
//         command: AppProjectConfig.Command.EXPORT_SVC,
//         label: '服务封装',
//         contains: [EProjectType.UNIT]
//       },
//       {
//         command: AppProjectConfig.Command.PROJECT_GENERATE_CODE,
//         label: '生成C代码',
//         contains: [EProjectType.UNIT]
//       },
//       {
//         command: AppProjectConfig.Command.PROJECT_GENERATE_BSWMD,
//         label: '生成模块描述文件',
//         contains: [EProjectType.UNIT]
//       },
//       {
//         command: '',
//         label: '生成桩代码',
//         contains: [EProjectType.UNIT]
//       }
//     ]
//   },

//   // CP校验-------------------------------------------------------------------------------------
//   {
//     label: 'CP校验',
//     alwaysShow: true,
//     command: '',
//     kind: QuickPickItemKind.Separator,
//     items: [
//       {
//         command: AppProjectConfig.Command.PROJECT_VALIDATE,
//         label: '校验',
//         contains: [EProjectType.UNIT, EProjectType.APPLICATION]
//       }
//     ]
//   }
// ] as const;

/**
 * @deprecated 建议使用 autosarStandards 替代
 */
export const AutosarStandards = autosarStandards;
