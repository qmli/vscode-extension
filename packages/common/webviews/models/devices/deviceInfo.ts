export interface DeviceInfo {
  id: string;
  port: number; // start Machine 时传入的端口号
  host: string; // 设备ip
  username: string; // ssh 用户名
  password?: string; // ssh 密码
  privateKeyPath?: string; // ssh 私钥路径
  araSysroot: string; // 执行updateMachine时传入的araSysroot
  sdkAraSysroot: string; // sdk目录下的araSysroot
  areCmdSysMonitorPath: string; // 需要上传的设备监控程序的路径 带文件名
  machineModelConfigPath: string; // 需要上传的机器模型配置文件路径 带文件名
}
