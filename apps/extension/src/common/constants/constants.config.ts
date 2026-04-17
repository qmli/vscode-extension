/**
 * 配置相关常量定义
 * 用于统一管理配置代码、模板版本等
 */

/**
 * 配置代码枚举
 * 定义系统中使用的配置代码标识
 */
export enum ECode {
  /** 设置选项卡菜单代码 */
  SETTING_TAB_MENU = 'setting.tab.menu#1'
}

/**
 * 配置代码名称枚举
 * 定义配置代码对应的显示名称
 */
export enum ECodeName {
  /** 设置选项卡菜单名称 */
  SETTING_TAB_MENU = '状态监控'
}

/**
 * 配置键常量
 * 定义系统配置相关的键名
 */
export const configKey = Object.freeze({
  /** 设置代码 */
  setting: 'setting.tab.menu',
  /** 模板版本代码 */
  templateVersion: 'template-version',
  /** 工作区全局配置 */
  workspaceGlobal: 'workspace-global'
} as const);

/**
 * 配置键类型
 */
export type ConfigKey = (typeof configKey)[keyof typeof configKey];
