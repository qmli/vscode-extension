export type IntegrationIds = 'BuildProject' | 'RuleVerifier' | ExecutableIntegrationIds | ExecutableProviderType;

/**
 * 工具类型
 * 定义工具的执行方式
 */
export type ToolKind = 'process' | 'shell';

/**
 * 可执行程序集成ID枚举
 * 定义系统支持的所有可执行程序类型
 */
export enum ExecutableIntegrationIds {
  Git = 'git', // Git版本控制工具
  Docker = 'docker', // Docker容器工具
  Custom = 'custom' // 自定义可执行程序
}

/**
 * 可执行程序提供者类型枚举
 * 按功能分类组织可执行程序
 */
export enum ExecutableProviderType {
  VersionControl = 'version-control', // 版本控制工具
  Container = 'container', // 容器工具
  Orchestration = 'orchestration', // 编排工具
  Build = 'build', // 构建工具
  Test = 'test', // 测试工具
  Custom = 'custom' // 自定义工具
}
