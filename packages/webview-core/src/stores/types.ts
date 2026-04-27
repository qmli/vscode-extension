// Store相关类型定义

export interface ThemeState {
  current: 'light' | 'dark' | 'auto';
  resolved: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
}

export interface LocaleState {
  current: string;
  available: string[];
  fallback: string;
}

export interface VSCodeState {
  api: any;
  connected: boolean;
  theme: 'light' | 'dark';
  language: string;
}

export interface CommonState {
  loading: boolean;
  error: string | null;
  messages: Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    timestamp: number;
  }>;
}
