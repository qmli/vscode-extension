import type { Uri } from 'vscode';

// UriComponents 接口定义了一个 URI 的各个组成部分
export interface UriComponents {
  scheme: string; // 协议部分
  authority: string; // 权限部分
  path: string; // 路径部分
  query: string; // 查询参数部分
  fragment: string; // 片段部分
}

// 判断两个 Uri 是否相等的函数
export function areUrisEqual(a: Uri | undefined, b: Uri | undefined): boolean {
  if (a === b) return true; // 如果引用相同，返回 true
  if (a == null || b == null) return false; // 如果有一个为 null 或 undefined，返回 false

  return a.toString() === b.toString(); // 比较字符串表示是否相等
}
