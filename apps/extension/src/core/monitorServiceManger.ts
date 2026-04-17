// import type { IMonitorService } from '../interface/IMonitorService';

// export class MonitorServiceManger {
//   private static instance: MonitorServiceManger;
//   private machineDevicePathMap: Map<string, string> = new Map<string, string>();
//   private deviceService: Map<string, IMonitorService> = new Map<string, IMonitorService>();

//   private constructor() {}

//   public static getInstance(): MonitorServiceManger {
//     if (!MonitorServiceManger.instance) {
//       MonitorServiceManger.instance = new MonitorServiceManger();
//     }
//     return MonitorServiceManger.instance;
//   }

//   // 提供封装的方法，而不是直接暴露 Map
//   public getDevicePath(deviceId: string): string | undefined {
//     return this.machineDevicePathMap.get(deviceId);
//   }

//   public setDevicePath(deviceId: string, path: string): void {
//     this.machineDevicePathMap.set(deviceId, path);
//   }

//   public getMonitorService(deviceId: string): IMonitorService | undefined {
//     return this.deviceService.get(deviceId);
//   }

//   public setMonitorService(deviceId: string, service: IMonitorService): void {
//     this.deviceService.set(deviceId, service);
//   }

//   public hasMonitorService(deviceId: string): boolean {
//     return this.deviceService.has(deviceId);
//   }

//   public deleteMonitorService(deviceId: string): boolean {
//     return this.deviceService.delete(deviceId);
//   }
// }
// export const monitorServiceManger = MonitorServiceManger.getInstance();
