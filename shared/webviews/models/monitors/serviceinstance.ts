/**
 * 服务实例模型
 */

// 服务实例数量统计
export interface ServiceInstanceCount {
  totalInstance: number; // 总实例数
  runningPInstance: number; // 运行中的提供者实例数
  runningRInstance: number; // 运行中的请求者实例数
  abnormalInstance: number; // 异常实例数
  notRunningInstance: number; // 未运行实例数
}

// 事件方法数据统计
export interface EventMethod {
  pRecvSuccess: number; // 提供者接收成功数
  pSendSuccess: number; // 提供者发送成功数
  pRecvAllFail: number; // 提供者接收全部失败数
  pSendAllFail: number; // 提供者发送全部失败数
  serializeAllFail: number; // 序列化全部失败数
  dserializeAllFail: number; // 反序列化全部失败数
  sendReceiv: string; // 发送接收标识
  data: EventMethodDetail; // 详细数据
}

// 事件方法详细数据
export interface EventMethodDetail {
  time: string; // 时间
  pRecvFail: number; // 提供者接收失败数
  pSendFail: number; // 提供者发送失败数
  serializeFail: number; // 序列化失败数
  dserializeFail: number; // 反序列化失败数
  detailPRecvFail: Detail[]; // 提供者接收失败详情
  detailPSendFail: Detail[]; // 提供者发送失败详情
  detailSerializeFail: Detail[]; // 序列化失败详情
  detailDserializeFail: Detail[]; // 反序列化失败详情
}

// 事件方法详细值
export interface EventMethodDetailValue {
  sign: string; // 标识
  value: string; // 值
}

// 事件方法计数
export interface EventMethodCount {
  sign: string; // 标识
  count: number; // 计数
}

// 详细信息
export interface Detail {
  value: string; // 值
}

// 计数
export interface Count {
  count: number; // 计数
}

// 服务实例表格数据
export interface ServiceInstanceTable {
  fqn: string; // 完全限定名
  instanceName: string; // 实例名称
  prType: string; // 提供者/请求者类型
  instanceId: string; // 实例ID
  processName: string; // 进程名称
  interfaceName: string; // 接口名称
  interfaceId: string; // 接口ID
  instanceType: string; // 实例类型
  instanceStatus: string; // 实例状态
}

// 丢包率
export interface PacketLossRate {
  name: string; // 名称
  id: string; // ID
  count: number; // 丢包数
}

// 导出丢包率
export interface ExportPacketLossRate {
  name: string; // 名称
  id: string; // ID
  type: string; // 类型
}

// 实例详情
export interface InstanceDetail {
  uuid: string; // 唯一标识符
  timestamp: string; // 时间戳
  name: string; // 名称
  id: string; // ID
  rpcType: string; // RPC类型
  rpcSpecificType: string; // RPC特定类型
  protocol: string; // 协议
  status: string; // 状态
  payload: string; // 负载数据
}
