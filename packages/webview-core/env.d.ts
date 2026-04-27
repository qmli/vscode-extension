/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<object, object, any>;
  // eslint-disable-next-line import-x/no-default-export
  export default component;
}

// 全局类型声明
declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
    __WEBVIEW_MODULE__?: string;
  }

  // 测试全局变量
  const vi: typeof import('vitest').vi;
  const describe: typeof import('vitest').describe;
  const it: typeof import('vitest').it;
  const test: typeof import('vitest').test;
  const expect: typeof import('vitest').expect;
  const beforeEach: typeof import('vitest').beforeEach;
  const afterEach: typeof import('vitest').afterEach;
  const beforeAll: typeof import('vitest').beforeAll;
  const afterAll: typeof import('vitest').afterAll;
}

// 构建时常量
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __MODULE_NAME__: string;
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __DEV__: boolean;
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __TEST__: boolean;
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __BUILD_TIME__: string;

export {};
