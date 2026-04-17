// import * as fs from 'fs';
// import path from 'path';
// import { showMessage } from '@/core/message';
// import { ExtensionStore } from '../api/model/ExtensionModel';
// import { SshConfig } from '../api/model/IntegratedProject';
// import { WslSshConfig } from '../base/common/Common';
// import { SdkUtil } from './SdkUtil';

// /**
//  * 生成设备ID
//  */
// export function generateDeviceId(): string {
//   const randomInt = Math.floor(Math.random() * 10000); // 生成0到9999之间的随机整数
//   const paddedInt = randomInt.toString().padStart(4, '0'); // 不足4位的左边用0补齐
//   return `DEV-${paddedInt}`;
// }

// /**
//  * 获取预置设备的SSH连接选项信息
//  */
// export function getPresetDeviceSshConnectOptions(): any {
//   const sshConfig = getPresetDeviceSshConfig();
//   return getSshConnectOptions(sshConfig);
// }

// export function getPresetDeviceSshConfig(): SshConfig {
//   const sshConfig = new SshConfig(
//     WslSshConfig.ip || '127.0.0.1',
//     WslSshConfig.port || 22, // 默认端口 22
//     WslSshConfig.username || 'root',
//     WslSshConfig.password || 'root',
//     WslSshConfig.useKeyAuth || false,
//     WslSshConfig.privateKeyPath || ''
//   );
//   sshConfig.privateKeyPath = path.join(ExtensionStore.getConfigDir(), sshConfig.privateKeyPath);
//   return sshConfig;
// }

// export function getSshConnectOptions(sshConfig: SshConfig): any {
//   // 构建ssh2连接参数，支持密钥和密码
//   const connectOptions: any = {
//     host: sshConfig.ip,
//     port: sshConfig.port,
//     username: sshConfig.username
//   };

//   if (sshConfig.useKeyAuth) {
//     try {
//       connectOptions.privateKey = fs.readFileSync(sshConfig.privateKeyPath, 'utf-8');
//     } catch (err) {
//       showMessage('error', `读取SSH私钥失败: ${(err as Error).message}`);
//       return undefined;
//     }
//   } else {
//     connectOptions.password = sshConfig.password;
//   }
//   return connectOptions;
// }

// /**
//  *  获取一个系统可用的端口号，从6000开始尝试，每次递增1，直到找到为止
//  * @param connectOptions
//  * @returns
//  */
// export async function getAvailablePort(connectOptions: any): Promise<number> {
//   let availablePort = 6000;
//   const maxPort = 10000;
//   let portFound = false;

//   try {
//     while (availablePort < maxPort) {
//       // 直接检测该端口是否被占用
//       const portCmd = `netstat -tln | grep :${availablePort} || true`;
//       const result = await SdkUtil.execSshCommand(connectOptions, portCmd);
//       if (!result || result.trim() === '') {
//         portFound = true;
//         break;
//       }
//       availablePort++;
//     }
//     if (!portFound) {
//       showMessage('error', '未找到可用端口，请检查设备端口占用情况！');
//       return -1;
//     }
//     console.log(`分配到可用端口: ${availablePort}`);
//   } catch (err) {
//     showMessage('error', `获取设备可用端口失败: ${(err as Error).message}`);
//     return -1;
//   }
//   return availablePort;
// }
