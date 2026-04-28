/**
 * 递归类型工具，用于生成对象的所有子路径
 *
 * 这个类型会递归遍历对象的所有属性，生成类似"a.b.c"格式的路径字符串。
 * 用于实现类型安全的配置路径访问。
 */
type SubPath<T, Key extends keyof T> = Key extends string
  ? T[Key] extends Record<string, any>
    ?
        | `${Key}.${SubPath<T[Key], Exclude<keyof T[Key], keyof any[]>> & string}`
        | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}`
    : never
  : never;

/**
 * 对象的所有可能路径类型
 *
 * 包括直接属性和所有嵌套属性的点记法路径。
 * 例如："name" | "user.name" | "user.settings.theme"
 */
export type Path<T> = SubPath<T, keyof T> | keyof T;

/**
 * 根据路径获取对应值的类型
 *
 * 给定一个对象类型和路径字符串，返回该路径对应的值类型。
 * 支持深层嵌套的属性访问，如"user.settings.theme"。
 */
export type PathValue<T, P> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PathValue<T[K], R>
    : K extends `${number}` // 支持数组数字索引的字符串形式，如 '0'
      ? T extends Array<infer U>
        ? PathValue<U, R>
        : never
      : never
  : P extends keyof T
    ? T[P]
    : P extends `${number}`
      ? T extends Array<infer U>
        ? U
        : never
      : never;

/** 配置的所有可能路径类型 */
export type ConfigPath = Path<Config>;
/** 根据配置路径获取对应值的类型 */
export type ConfigPathValue<P extends ConfigPath> = PathValue<Config, P>;

/** VS Code核心配置的所有可能路径类型 */
export type CoreConfigPath = Path<CoreConfig>;
/** 根据VS Code核心配置路径获取对应值的类型 */
export type CoreConfigPathValue<P extends CoreConfigPath> = PathValue<CoreConfig, P>;
export interface Config {
  /**
   * 通信监控配置
   */
  readonly communicationMonitoring: CommunicationMonitoringConfig;
  readonly general: GeneralConfig;
}

export interface CommunicationMonitoringConfig {
  readonly enabled: boolean;
  readonly Level: 'debug' | 'info' | 'warn' | 'error';
  readonly monitorIntervalSeconds: number;
  readonly protocols: Array<'TCP' | 'UDP'>;
}

export interface GeneralConfig {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly tabSize: number;
  readonly insertSpaces: boolean;
}

export type CoreConfig = {
  readonly workbench: {
    readonly colorTheme: string;
  };
  // readonly locale: 'en' | 'zh-cn';
};
