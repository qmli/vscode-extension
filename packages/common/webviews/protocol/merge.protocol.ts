/**
 * MergeView 协议定义
 * 用于合并视图 Webview 和 Extension 之间的通信
 */
import { IpcRequest } from '../../protocol';

/**
 * 合并视图作用域
 */
const scope = 'merge';

/**
 * 合并视图初始化请求参数
 */
export interface MergeDataInitParams {
  /** 视图 ID */
  viewId?: string;
}

/**
 * 合并视图初始化响应
 */
export interface MergeDataInitResponse {
  /** 待合并项目列表 */
  projects: MergeProjectInfo[];
}

/**
 * 待合并项目信息
 */
export interface MergeProjectInfo {
  /** 项目 ID */
  id: string;
  /** 项目名称 */
  name: string;
  /** 项目类型 */
  pType: string;
  /** 项目类型标签 */
  pTypeLabel: string;
}

/**
 * 合并项目节点点击请求参数
 */
export interface MergeLeafClickParams {
  /** 项目 ID */
  id: string;
}

/**
 * 合并项目节点点击响应
 */
export interface MergeLeafClickResponse {
  /** 原始文件内容 (URI 编码) */
  original: string;
  /** 修改文件内容 (URI 编码) */
  modified: string;
  /** 项目名称 */
  name: string;
  /** 项目类型 */
  pType: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 合并提交请求参数
 */
export interface MergeCommitParams {
  /** 项目 ID */
  id: string;
  /** 合并后的内容 (URI 编码) */
  modified: string;
}

/**
 * 合并提交响应
 */
export interface MergeCommitResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message?: string;
  /** 是否应该关闭视图（所有项目都已合并完成） */
  shouldClose?: boolean;
}

/**
 * Webview 请求扩展侧合并视图初始化数据
 */
export const MergeDataInitRequest = new IpcRequest<MergeDataInitParams, MergeDataInitResponse>(
  scope,
  'merge/data/init'
);

/**
 * Webview 请求合并项目节点数据
 */
export const MergeLeafClickRequest = new IpcRequest<MergeLeafClickParams, MergeLeafClickResponse>(
  scope,
  'merge/leaf/click'
);

/**
 * Webview 提交合并结果
 */
export const MergeCommitRequest = new IpcRequest<MergeCommitParams, MergeCommitResponse>(scope, 'merge/commit');
