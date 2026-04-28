/**
 * 文件夹名称常量定义
 * 用于统一管理项目中使用的文件夹名称
 */
export const folder = Object.freeze({
  models: 'models',
  metadata: '.metadata',
  vscode: '.vscode',
  isdb: 'isdb',
  exes: 'exes'
} as const);

/**
 * 文件夹名称类型
 * 用于类型安全的文件夹名称引用
 */
export type FolderName = (typeof folder)[keyof typeof folder];

/**
 * 文件名称常量定义
 * 用于统一管理项目中使用的文件名称和文件后缀
 */
export const file = Object.freeze({
  suffix: Object.freeze({
    json: '.json',
    isoftdb: '.isdb',
    workspace: '.code-workspace'
  } as const),
  project: 'project.json',
  isoft: '.isoft',
  depConfig: 'dep.config.json'
} as const);

/**
 * 文件后缀名称类型
 */
export type FileSuffixName = (typeof file.suffix)[keyof typeof file.suffix];

/**
 * 文件名称类型
 */
export type FileName = (typeof file)[keyof typeof file];

export const keys = Object.freeze([
  'left',
  'alt+left',
  'ctrl+left',
  'right',
  'alt+right',
  'ctrl+right',
  'alt+,',
  'alt+.',
  'alt+enter',
  'ctrl+enter',
  'escape'
] as const);
export type Keys = (typeof keys)[number];

export const extensionPrefix = 'autosar';

const utm = 'source=autosar';
export const urls = Object.freeze({
  releaseNotes: `https://test.com.cn/?${utm}`
});

export enum Media {
  logo = 'vite.svg',
  toSave = 'toSave.svg',
  unit = 'unit.svg',
  linkP = 'linkP.svg',
  editN = 'editN.svg',
  editA = 'editA.svg',
  model = 'model.svg',
  reference = 'reference.svg',
  folder = 'folder.svg',
  folderOpen = 'folderOpen.svg',
  setting = 'setting.svg',
  computer = 'computer.svg',
  error = 'error.svg',
  system = 'system.svg',
  merge = 'merge.svg',
  library = 'library.svg',
  application = 'application.svg',
  integrated = 'integrated.svg',
  libraryOpen = 'libraryOpen.svg',
  applicationOpen = 'applicationOpen.svg',
  integratedOpen = 'integratedOpen.svg'
}
