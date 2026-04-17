/**
 * 监控树模型
 */

/**
 * 机器模型配置接口
 * @property someIpServiceDiscoveryList - SOME/IP服务发现列表
 * @property stateMachineList - 状态机列表
 * @property unmanagedFunctionGroupList - 非受管功能组列表
 */
export interface MachineModelConfig {
  someIpServiceDiscoveryList: SomeIpServiceDiscovery[];
  stateMachineList: StateMachine[];
  unmanagedFunctionGroupList: FunctionGroup[];
}

/**
 * SOME/IP服务发现配置
 * @property ip - 服务IP地址
 * @property port - 服务端口
 */
export interface SomeIpServiceDiscovery {
  ip: string;
  port: string;
}

/**
 * 状态机信息
 * @property fqn - 状态机唯一名称
 * @property name - 状态机名称
 * @property transitionList - 状态转移列表
 * @property functionGroupList - 功能组列表
 */
export interface StateMachine {
  fqn: string;
  name: string;
  transitionList: Transition[];
  functionGroupList: FunctionGroup[];
}

/**
 * 状态转移
 * @property requestID - 请求ID
 * @property currentSmState - 当前状态机状态
 * @property nextSmState - 转移后的状态机状态
 */
export interface Transition {
  requestID: number;
  currentSmState: string;
  nextSmState: string;
}

/**
 * 功能组信息
 * @property fqn - 功能组唯一名称
 * @property name - 功能组名称
 * @property stateList - 状态列表
 * @property processList - 进程列表
 */
export interface FunctionGroup {
  fqn: string;
  name: string;
  stateList: string[];
  processList: CustomProcess[];
}

/**
 * 自定义进程信息
 * @property name - 进程名称
 * @property fqn - 进程唯一名称
 * @property isSystem - 是否为系统进程
 * @property instances - 实例列表
 */
export interface CustomProcess {
  name: string;
  fqn: string;
  isSystem: boolean;
  instances: Instance[];
}

/**
 * 服务实例信息
 * @property instanceId - 实例ID
 * @property instanceName - 实例名称
 * @property instanceType - 实例类型
 * @property interfaceName - 接口名称
 * @property interfaceId - 接口ID
 * @property deploymentType - 部署类型
 * @property fqn - 实例唯一名称
 * @property processName - 对应进程名称
 * @property method - 方法节点列表
 * @property event - 事件节点列表
 * @property field - 字段节点列表
 */
export interface Instance {
  instanceId: string;
  instanceName: string;
  instanceType: string;
  interfaceName: string;
  interfaceId: string;
  deploymentType: string;
  fqn: string;
  processName: string;
  method: MonitoringTreeNode[];
  event: MonitoringTreeNode[];
  field: MonitoringTreeNode[];
}

/**
 * 监控树的节点结构
 * @property name - 节点名称
 * @property id - 节点ID
 * @property rpcType - RPC类型
 * @property rpcSpecificType - RPC具体类型
 * @property protocol - 协议类型
 */
export interface MonitoringTreeNode {
  name: string;
  id: string;
  rpcType: string;
  rpcSpecificType: string;
  /** 协议类型 */
  protocol: string;
}
