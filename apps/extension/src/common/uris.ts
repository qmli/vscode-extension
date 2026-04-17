import type { Uri } from 'vscode';
import { env, workspace } from 'vscode';

export async function exists(uri: Uri): Promise<boolean> {
  try {
    await workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export async function openUrl(url: string): Promise<boolean>;
export async function openUrl(url?: string): Promise<boolean | undefined>;
export async function openUrl(url?: string): Promise<boolean | undefined> {
  if (url == null) return undefined;

  // vscode.d.ts 当前声明它仅支持 Uri，但实际上它也接受字符串
  return (env.openExternal as unknown as (target: string) => Thenable<boolean>)(url);
}
