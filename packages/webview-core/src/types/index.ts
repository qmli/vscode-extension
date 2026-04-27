// 共享类型定义

// export interface BaseWebviewMessage {

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  type?: 'file' | 'folder';
  icon?: string;
  expanded?: boolean;
  selected?: boolean;
}

export interface SettingsConfig {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'zh-cn';
  fontSize: number;
  autoSave: boolean;
}

export interface FileChange {
  type: 'create' | 'modify' | 'delete';
  path: string;
  timestamp: number;
}

export interface WebviewModuleConfig {
  name: string;
  title: string;
  icon?: string;
  route?: string;
  permissions?: string[];
}

export type WebviewTheme = 'light' | 'dark';

export interface StyleVariables {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  shadowColor: string;
}
