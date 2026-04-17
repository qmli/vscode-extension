/**
 * 监控信息模型
 *
 * 该模块定义了监控系统相关的核心数据模型，包括：
 * - 机器资源存储信息（CPU、内存、磁盘）
 * - 监控详情信息（设备、进程、线程等）
 * - 监控信息聚合结构
 */

/**
 * 机器资源存储接口
 * 用于表示机器的总体资源使用情况
 */
export interface MachineStore {
  /** CPU 使用率，格式为字符串（如 "50%"） */
  cpu: string;
  /** 内存使用率，格式为字符串（如 "60%"） */
  memory: string;
  /** 磁盘使用率，格式为字符串（如 "40%"） */
  disk: string;
}

/**
 * 监控详情接口
 * 表示单个监控对象（设备、进程、线程等）的详细信息
 */
export interface MonitorDetail {
  /** 监控对象的唯一标识符 */
  id: string;
  /** 父级监控对象的ID，用于构建树形结构 */
  parentId?: string;
  /** 平台任务ID，可以是字符串或数字 */
  ptId?: string | number;
  /** 监控对象类型（如：device、process、thread等） */
  type: string;
  /** 监控对象名称 */
  name: string;
  /** 监控对象状态（如：running、stopped、error等） */
  status?: string;
  /** 是否由状态机管理 */
  managedBySm?: boolean;
  /** 类型相关的扩展数据，以键值对形式存储 */
  typeData?: Record<string, any>;
  /** 可执行文件路径 */
  executable?: string;
  /** 调度策略 */
  strategy?: string;
  /** 优先级 */
  priority?: string;
  /** CPU 使用率 */
  cpu?: string;
  /** 内存使用率 */
  memory?: string;
  /** 磁盘使用率 */
  disk?: string;
  /** CGroup 控制组标识 */
  cgroup?: string;
  /** 核心ID，标识运行的核心 */
  coreId?: string;
  /** 健康状态标识 */
  health?: true;
  /** 健康状态消息 */
  healthMsg?: string;
  /** 子监控对象列表，用于构建树形结构 */
  children?: MonitorDetail[];
}

/**
 * 监控信息接口
 * 表示完整的监控信息响应结构
 */
export interface MonitorInfo {
  /** 响应代码，用于标识请求处理结果 */
  code: string;
  /** 机器总体资源使用情况 */
  total?: MachineStore;
  /** 监控详情数据列表 */
  data: MonitorDetail[];
}
