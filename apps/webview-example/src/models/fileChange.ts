export const enum FileWorkingTreeStatus {
  Modified = 'M', // 工作区中已修改
  Added = 'A', // 新增文件
  Deleted = 'D' // 已删除
}
export interface FileChangeShape {
  readonly path: string;
  readonly status: FileWorkingTreeStatus;
  readonly text?: string;
  readonly originalPath?: string | undefined;
}
