/**
 * 监控数据模型
 */
import type { SomeIpServiceDiscovery } from './monitoringTree';
import type {
  EventMethod,
  InstanceDetail,
  PacketLossRate,
  ServiceInstanceCount,
  ServiceInstanceTable
} from './serviceinstance';

export interface MonitorPlan {
  id: string;
  name: string;
}

export const panels: readonly MonitorPlan[] = [
  { id: 'monitor_plan_default', name: '默认方案' },
  { id: 'monitor_plan_backup1', name: '备用方案1' },
  { id: 'monitor_plan_backup2', name: '备用方案2' },
  { id: 'monitor_plan_backup3', name: '备用方案3' },
  { id: 'monitor_plan_backup4', name: '备用方案4' }
] as const;

export interface DeviceVo {
  id: string;
  name: string;
}

export interface MonitoringInitData {
  plans?: MonitoringPlan[];
  updateData?: MonitoringUpdateData;
}

export interface MonitoringPlan extends MonitorPlan {
  itemTypes: ItemType[];
  devices: DeviceVo[];
}

export interface MonitoringPlanSetting {
  procStatus: boolean;
  thread: boolean;
  communicationItems: string[];
  remoteIP: string;
  rxTxStatisticalDuration: string;
  deviceIds: string[];
}

export interface MonitoringUpdateData {
  selectedPlanId?: string; // 选中的监控计划ID
  runtimeData: RuntimeData; // 运行时数据
  filterInfo?: FilterInfo; // 筛选信息
}

export interface MonitoringUpdateDataTO {
  selectedPlanId?: string; // 选中的监控计划ID
  itemTypes: ItemType[]; // 选中的监控项类型
  deviceIds: string[]; // 选中的监控计划ID
  runtimeData: RuntimeData; // 运行时数据
  filterInfo?: FilterInfo; // 筛选信息
}

export interface RealtimeData {
  type: 'realtime';
  running: boolean;
  startTime: number;
}

export interface PlaybackData {
  type: 'playback';
  selectedDay: 'today' | 'day-before' | 'two-days-ago';
  time: Date | null;
  status: 'running' | 'paused' | 'stopped';
}

export type RuntimeData = RealtimeData | PlaybackData;

export interface BaseItem {
  deviceId: string;
  restart: boolean;
}

// 服务实例状态统计
export interface SvcInstStatus extends BaseItem {
  type: 'svcInstStatus';
  value: ServiceInstanceCount;
}

// SOME/IP服务发现配置
export interface SomeIpDiscCfg extends BaseItem {
  type: 'someIpDiscCfg';
  someIpServiceDiscoveryList: SomeIpServiceDiscovery[];
}

// 本地实时网速
export interface LocalSpeed extends BaseItem {
  type: 'localSpeed';
  ip: string;
  net_speed?: {
    rx: number;
    tx: number;
  };
}

/**
 * 事件方法数据类型枚举
 */
export type EventMethodDataType =
  | 'someIpEvtData'
  | 'ddsEvtData'
  | 'ipcEvtData'
  | 'someIpMethData'
  | 'ddsMethData'
  | 'ipcMethData';

// 事件方法数据统计
export interface EventMethodData extends BaseItem {
  type: EventMethodDataType;
  value: EventMethod;
}

// 服务实例监控
export interface SvcInstMon extends BaseItem {
  type: 'svcInstMon';
  value: ServiceInstanceTable[];
}

// M2M 机器间延时统计
export interface M2MLatency extends BaseItem {
  type: 'm2mLatency';
  m2m?: {
    latency: number;
    date: number;
  };
}

export interface M2MLatencyIpMap {
  [key: string]: string;
}

// Rx/Tx 收发包统计
export interface RxTxPkt extends BaseItem {
  type: 'rxTxPkt';
  time: string;
  value: PacketLossRate[];
}

export interface RxTxPktInstanceData {
  deviceId: string;
  serviceFqn?: string;
}

export interface RxTxPktExportData {
  deviceId: string;
  names: string[];
}

// 进程运行状态
export interface ProcStatus extends BaseItem {
  type: 'procStatus';
  data: ProcStatusData;
}

export interface ProcStatusData {
  cpu: number;
  memory: number;
  disk: number;
  nodes: ProcStatusNode[];
}

// 进程状态节点类型
export type ProcStatusNodeType = 'stateMachine' | 'functionGroup' | 'platformProcess' | 'nonPlatformProcess' | 'thread';

/**
 * 进程状态节点
 */
export interface ProcStatusNode {
  id: string;
  error?: boolean;
  name: string;
  type: ProcStatusNodeType;
  status?: string;
  executable?: string;
  pid_tid?: number;
  priority?: number;
  policy?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  cgroup?: string;
  core_id?: number;
  children?: ProcStatusNode[];
}

/**
 * 进程状态节点列名字段类型（从 ProcStatusNode 接口提取）
 */
type ProcStatusColumnName = Extract<
  keyof ProcStatusNode,
  'status' | 'executable' | 'pid_tid' | 'priority' | 'policy' | 'cpu' | 'memory' | 'disk' | 'core_id'
>;

/**
 * 默认进程状态节点列名字段数组
 */
export const defaultProcStatusColumns: readonly ProcStatusColumnName[] = [
  'status',
  'executable',
  'pid_tid',
  'priority',
  'policy',
  'cpu',
  'memory',
  'disk',
  'core_id'
];

export type MonitoringItem =
  | SvcInstStatus
  | SomeIpDiscCfg
  | LocalSpeed
  | EventMethodData
  | SvcInstMon
  | M2MLatency
  | RxTxPkt
  | ProcStatus;

export type ItemType = MonitoringItem['type'];

/**
 * 所有监控项类型的数组 原allItemTypes
 */
export const allItemTypesArray: readonly ItemType[] = [
  'svcInstStatus',
  'localSpeed',
  'someIpDiscCfg',
  'someIpEvtData',
  'someIpMethData',
  'ddsEvtData',
  'ddsMethData',
  'ipcEvtData',
  'ipcMethData',
  'm2mLatency',
  'rxTxPkt',
  'svcInstMon',
  'procStatus'
] as const;

/**
 * 进程信息
 */
export interface ProcessInfo {
  /** 进程短名称 */
  shortName: string;
  /** 服务实例信息数组 */
  instanceInfos: ServiceInstanceInfo[];
}

/**
 * 服务实例信息
 */
export interface ServiceInstanceInfo {
  /** 实例ID */
  id: string;
  /** 实例短名称 */
  shortName: string;
  /** 实例FQN（全限定名） */
  fqn: string;
}

/**
 * 过滤信息
 */
export interface FilterInfo {
  /** 设备ID数组 */
  deviceIds: string[];
  /** 来源类型数组，平台或应用 */
  sourceTypes: ('platform' | 'application')[];
  /** 监控对象 */
  monitoringObject: MonitoringObject;
}

/**
 * 监控对象
 */
export interface MonitoringObject {
  /** 状态机监控对象条件 */
  stateMachine: MonitoringObjectItem;
  /** 功能组监控对象条件 */
  functionGroup: MonitoringObjectItem;
  /** 进程监控对象条件 */
  process: MonitoringObjectItem;
  /** 服务实例监控对象条件 */
  serviceInstance: MonitoringObjectItem;
  /** 事件监控对象条件 */
  event: MonitoringObjectItem;
}

/**
 * 监控对象项条件
 */
export interface MonitoringObjectItem {
  /** 是否启用该条件 */
  selected: boolean;
  /** 匹配模式，全部或指定 */
  mode: 'all' | 'assign';
  /** 匹配属性，名称或状态 */
  attribute: 'name' | 'state';
  /** 匹配规则，包含/不包含 */
  rule: 'in' | 'nin';
  /** 匹配值数组 */
  values: string[];
}

/**
 * 设备服务实例表
 */
export interface DeviceServiceInstanceTable {
  /** 设备ID */
  deviceId: string;
  /** 服务实例表 */
  instance: ServiceInstanceTable;
}

/**
 * 设备上某服务实例运行状态
 */
export interface InstanceDetailRunning {
  /** 设备ID */
  deviceId: string;
  /** 服务实例表 */
  instance: ServiceInstanceTable;
  /** 运行状态 */
  running: boolean;
}

/**
 * 设备服务实例详情
 */
export interface DeviceInstanceDetail {
  /** 设备ID */
  deviceId: string;
  /** 服务实例FQN */
  instanceFqn: string;
  /** 详情 */
  value: InstanceDetail[];
}

/**
 * 设备服务实例过滤器结构
 */
export interface DeviceServiceInstanceFilter {
  /** 设备ID */
  deviceId: string;
  /** 服务FQN */
  serviceFqn: string;
  /** 节点信息数组 */
  nodes: InstanceNode[];
}

/**
 * 实例节点信息
 */
export interface InstanceNode {
  /** 节点ID */
  id: string;
  /** 节点名称 */
  name: string;
  /** 节点RPC类型 */
  rpcType: string;
}
