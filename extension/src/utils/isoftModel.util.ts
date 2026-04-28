import { showMessage } from '@orientais/vscode-core';
import { JSONPath } from 'jsonpath-plus';
import * as vscode from 'vscode';
// import { SdkUtil } from '@/utils/sdk.util';

export function getNameFromFqn(fqn: string): string {
  const rightBracketIndex = fqn.lastIndexOf(']');
  const leftBracketIndex = fqn.lastIndexOf('[', rightBracketIndex - 1);
  return fqn.substring(leftBracketIndex + 1, rightBracketIndex);
}

export async function parseJsonWithWorkspaceFs<T>(uri: vscode.Uri): Promise<T | null> {
  try {
    // 读取文件内容（支持本地和远程文件）
    const buffer = await vscode.workspace.fs.readFile(uri);
    const content = buffer.toString();

    // 解析JSON
    return JSON.parse(content) as T;
  } catch (error) {
    showMessage('error', `解析JSON失败: ${(error as Error).message}`);
    return null;
  }
}

// 工具函数：执行JSONPath查询
export function queryJson<T>(data: any, path: string): T[] {
  return JSONPath({
    path: path,
    json: data,
    resultType: 'value'
  }) as T[];
}

export async function readRemoteJson<T>(connectOptions: any, remoteJsonPath: string): Promise<T> {
  const jsonStr = ''; // await SdkUtil.execSshCommand(connectOptions, `cat ${remoteJsonPath}`); 暂时移除后面在用ssh命令
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    showMessage('error', `远程 JSON 文件解析失败: ${(err as Error).message}`);
    return undefined as unknown as T;
  }
}
