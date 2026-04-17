import type { EProjectType } from '../../constants/constants.project';

/**
 * 项目信息 来自源文件ProjectInfo.ts
 */
export interface ProjectInfo {
  /** 项目ID */
  id: string;
  /** 项目名称 */
  name: string;
  /** 项目显示名称 */
  displayName?: string;
  /** 平台类型 */
  platform: string;
  /** 项目类型 */
  pType: EProjectType;
  /** 创建日期 */
  date: string;
  /** 项目描述 */
  des?: string;
  /** 节点ID */
  nodeId?: string;
  /** 类型 */
  type?: string;
  /** 项目路径 */
  path?: string;
  /** 扩展属性 */
  attrs?: any;
  /** 引用列表 */
  reference: string[];
  /** 单元列表 */
  units: string[];
}
