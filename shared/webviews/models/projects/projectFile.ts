export interface ProjectFile {
  /*文件ID=hash(path)*/
  id: string;
  /*文件路径*/
  path: string;
  /*文件名称*/
  name: string;
  /*文件hash*/
  hash: string;
  /*文件修改时间*/
  mtime: string;
  /*文件版本*/
  version: number;
  /*项目ID*/
  projectId: string;
}
