import * as fs from 'fs';
import type { SFTPWrapper } from 'ssh2';
import { Client } from 'ssh2';

/**
 * 主函数：从源远程服务器上传文件到目标远程服务器
 */
export async function transferRemoteFile(
  sourceConfig: RemoteConfig,
  sourcePath: string,
  targetConfig: RemoteConfig,
  targetPath: string
): Promise<void> {
  try {
    console.log(`开始传输文件: ${sourcePath} -> ${targetConfig.host}:${targetPath}`);

    // 1. 读取源文件
    const fileContent = await readRemoteFile(sourceConfig, sourcePath);
    console.log(`成功读取源文件 (大小: ${fileContent.length} bytes)`);

    // 2. 写入目标服务器
    await writeRemoteFile(targetConfig, targetPath, fileContent);
    console.log(`文件传输完成: ${targetPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `文件传输失败: ${message}, source: ${sourceConfig.host}:${sourcePath}, target: ${targetConfig.host}:${targetPath}`
    );
    throw error;
  }
}

/**
 * 远程服务器配置
 */
export interface RemoteConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string; // 私钥路径（本地路径）
}

/**
 * 连接到远程服务器并获取SFTP客户端
 */
async function getSftpClient(config: RemoteConfig): Promise<{ sftp: SFTPWrapper; client: Client }> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    client.on('ready', () => {
      client.sftp((err, sftp) => {
        if (err) {
          client.end();
          reject(new Error(`SFTP初始化失败: ${err.message}`));
          return;
        }
        resolve({ sftp: sftp, client: client });
      });
    });

    client.on('error', (err) => {
      reject(new Error(`连接失败 (${config.host}): ${err.message}`));
    });

    // 读取私钥文件（如果配置了）
    const privateKey = config.privateKey ? fs.readFileSync(config.privateKey) : undefined;

    // 构造连接参数
    const connectParams: any = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      tryKeyboard: true
    };
    if (config.password !== undefined) {
      connectParams.password = config.password;
    }
    if (privateKey) {
      connectParams.privateKey = privateKey;
    }

    client.connect(connectParams);
  });
}

/**
 * 从源远程服务器读取文件内容
 */
async function readRemoteFile(sourceConfig: RemoteConfig, sourcePath: string): Promise<Buffer> {
  const { sftp, client } = await getSftpClient(sourceConfig);
  try {
    // 检查文件是否存在且有权限
    await new Promise<void>((resolve, reject) => {
      sftp.stat(sourcePath, (err) => {
        if (err) {
          return void reject(new Error(`远程文件不存在或无权限: ${err.message}`));
        }
        resolve();
      });
    });

    // 读取文件内容
    return await new Promise<Buffer>((resolve, reject) => {
      sftp.readFile(sourcePath, (err, buffer) => {
        if (err) {
          return void reject(new Error(`读取文件失败: ${err.message}`));
        }
        resolve(buffer);
      });
    });
  } finally {
    if (typeof sftp.end === 'function') {
      sftp.end();
    }
    client.end();
  }
}

/**
 * 将文件内容写入目标远程服务器
 */
async function writeRemoteFile(targetConfig: RemoteConfig, targetPath: string, content: Buffer): Promise<void> {
  const { sftp, client } = await getSftpClient(targetConfig);
  try {
    // // 确保目标目录存在
    // const targetDir = path.posix.dirname(targetPath);
    // await ensureRemoteDir(sftp, targetDir);

    await new Promise<void>((resolve, reject) => {
      sftp.writeFile(targetPath, content, (err) => {
        if (err) {
          reject(new Error(`写入文件失败: ${err.message}`));
          return;
        }
        resolve();
      });
    });
  } finally {
    if (typeof sftp.end === 'function') {
      sftp.end();
    }
    client.end();
  }
}
