/**
 * 监控协议
 * 包含 monitor（监控信息）和 monitoring（监控数据）相关的 IPC 通信协议
 */

import { IpcCommand, IpcNotification, IpcRequest, scope } from './protocol';
import type { MonitorInfo } from './webviews/models/monitors/monitorInfo';
import type {
  FilterInfo,
  ItemType,
  MonitoringItem,
  MonitoringPlan,
  MonitoringPlanSetting,
  MonitoringUpdateData,
  RuntimeData
} from './webviews/models/monitors/monitoringData';
import type { MachineModelConfig } from './webviews/models/monitors/monitoringTree';
import type { InstanceDetail } from './webviews/models/monitors/serviceinstance';

// ==================== Monitor 相关（监控信息）====================

/**
 * 获取监控信息请求
 * 用于获取设备、进程等的基本监控信息
 */
export interface MonitorInfoRequestParams {
  /** 设备ID，可选，不提供则获取所有设备 */
  deviceId?: string;
  /** 监控计划ID，可选 */
  planId?: string;
}

export interface MonitorInfoResponse extends MonitorInfo {}

export const MonitorInfoRequest = new IpcRequest<MonitorInfoRequestParams, MonitorInfoResponse>(scope, 'monitor/info');

/**
 * 监控信息更新通知（从扩展发送到 webview）
 */
export interface MonitorInfoUpdateParams {
  deviceId: string;
  data: MonitorInfoResponse;
  timestamp: number;
}

export const DidChangeMonitorInfoNotification = new IpcNotification<MonitorInfoUpdateParams>(
  scope,
  'monitor/info/didChange'
);

/**
 * 订阅监控信息更新
 */
export interface MonitorInfoWatchParams {
  deviceId?: string;
  watch: boolean;
  subscriptionId?: string;
}

export interface MonitorInfoWatchResponse {
  subscriptionId: string;
  success: boolean;
}

export const MonitorInfoWatchRequest = new IpcRequest<MonitorInfoWatchParams, MonitorInfoWatchResponse>(
  scope,
  'monitor/info/watch'
);

// ==================== Monitoring 相关（监控数据）====================

/**
 * 获取监控计划列表请求
 */
export interface MonitoringPlanRequestParams {
  planId?: string; // 可选，指定计划ID则返回单个计划详情
}

export interface MonitoringPlanResponse {
  plans: MonitoringPlan[];
}

export const MonitoringPlanRequest = new IpcRequest<MonitoringPlanRequestParams, MonitoringPlanResponse>(
  scope,
  'monitoring/plan'
);

/**
 * 获取监控初始化数据请求
 */
export interface MonitoringInitDataRequestParams {
  planId?: string;
}

export interface MonitoringInitDataResponse {
  plans?: MonitoringPlan[];
  updateData?: MonitoringUpdateData;
}

export const MonitoringInitDataRequest = new IpcRequest<MonitoringInitDataRequestParams, MonitoringInitDataResponse>(
  scope,
  'monitoring/init'
);

/**
 * 获取监控数据请求
 */
export interface MonitoringDataRequestParams {
  planId: string;
  deviceIds?: string[];
  itemTypes?: ItemType[];
  runtimeData?: RuntimeData;
  filterInfo?: FilterInfo;
}

export interface MonitoringDataResponse {
  selectedPlanId?: string;
  runtimeData: RuntimeData;
  filterInfo?: FilterInfo;
  items: MonitoringItem[];
}

export const MonitoringDataRequest = new IpcRequest<MonitoringDataRequestParams, MonitoringDataResponse>(
  scope,
  'monitoring/data'
);

/**
 * 监控数据更新通知（从扩展发送到 webview）
 */
export interface MonitoringDataUpdateParams {
  planId: string;
  items: MonitoringItem[];
  timestamp: number;
}

export const DidChangeMonitoringDataNotification = new IpcNotification<MonitoringDataUpdateParams>(
  scope,
  'monitoring/data/didChange'
);

/**
 * 监控控制命令（启动/停止/暂停监控）
 */
export interface MonitoringControlParams {
  action: 'start' | 'stop' | 'pause' | 'resume';
  planId: string;
  deviceIds?: string[];
  itemTypes?: ItemType[];
}

export interface MonitoringControlResponse {
  success: boolean;
  message?: string;
}

export const MonitoringControlCommand = new IpcCommand<MonitoringControlParams>(scope, 'monitoring/control');

/**
 * 监控控制响应（扩展返回给 webview）
 */
export const MonitoringControlResponseNotification = new IpcNotification<MonitoringControlResponse>(
  scope,
  'monitoring/control/response'
);

/**
 * 更新监控计划设置
 */
export interface MonitoringPlanSettingParams {
  planId: string;
  setting: MonitoringPlanSetting;
}

export interface MonitoringPlanSettingResponse {
  success: boolean;
  error?: string;
}

export const MonitoringPlanSettingRequest = new IpcRequest<MonitoringPlanSettingParams, MonitoringPlanSettingResponse>(
  scope,
  'monitoring/plan/setting'
);

/**
 * 获取服务实例详情
 */
export interface ServiceInstanceDetailRequestParams {
  deviceId: string;
  instanceFqn: string;
  serviceFqn?: string;
}

export interface ServiceInstanceDetailResponse {
  deviceId: string;
  instanceFqn: string;
  value: InstanceDetail[];
}

export const ServiceInstanceDetailRequest = new IpcRequest<
  ServiceInstanceDetailRequestParams,
  ServiceInstanceDetailResponse
>(scope, 'monitoring/service/instance/detail');

/**
 * 获取机器模型配置
 */
export interface MachineModelConfigRequestParams {
  deviceId: string;
}

export interface MachineModelConfigResponse extends MachineModelConfig {}

export const MachineModelConfigRequest = new IpcRequest<MachineModelConfigRequestParams, MachineModelConfigResponse>(
  scope,
  'monitoring/machine/model/config'
);

/**
 * 导出监控数据
 */
export interface MonitoringExportParams {
  planId: string;
  deviceIds: string[];
  itemTypes: ItemType[];
  format?: 'json' | 'csv' | 'excel';
  startTime?: number;
  endTime?: number;
}

export interface MonitoringExportResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const MonitoringExportRequest = new IpcRequest<MonitoringExportParams, MonitoringExportResponse>(
  scope,
  'monitoring/export'
);

/**
 * 监控进度通知（用于长时间运行的任务）
 */
export interface MonitoringProgressParams {
  planId: string;
  progress: number; // 0-100
  message?: string;
  currentItem?: string;
}

export const DidChangeMonitoringProgressNotification = new IpcNotification<MonitoringProgressParams>(
  scope,
  'monitoring/progress/didChange'
);
