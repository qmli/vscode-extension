/**
 * 外部可执行程序请求接口
 * 定义发送给外部可执行程序的命令请求格式
 */
export interface ExternalExecutableRequest {
  /** 请求的唯一标识符，用于跟踪和匹配响应 */
  id: string;
  /** 要执行的命令名称 */
  command: string;
  /** 命令的参数数组，可选 */
  args?: string[];
  /** 执行选项，可选 */
  options?: {
    /** 命令执行超时时间（毫秒） */
    timeout?: number;
    /** 工作目录，命令将在此目录下执行 */
    cwd?: string;
    /** 环境变量，键值对形式 */
    env?: Record<string, string | undefined> | undefined;
  };
}

/**
 * 外部可执行程序响应接口
 * 定义外部可执行程序返回的执行结果格式
 */
export interface ExternalExecutableResponse {
  /** 响应对应的请求ID，用于匹配请求和响应 */
  id: string;
  /** 命令是否执行成功 */
  success: boolean;
  /** 执行结果数据，成功时返回 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  /** 错误信息，失败时返回 */
  error?: {
    /** 错误代码，用于错误分类和处理 */
    code: number;
    /** 错误描述信息 */
    message: string;
    /** 错误堆栈信息，用于调试，可选 */
    stack?: string;
  };
  /** 命令执行耗时（毫秒），用于性能监控 */
  executionTime?: number;
}

/**
 * 外部可执行程序配置接口
 * 定义外部可执行程序的基本配置参数
 */
export interface ExternalExecutableConfig {
  /** 可执行文件的完整路径 */
  path: string;
  /** 可执行程序的名称，用于标识和日志 */
  name: string;
  /** 是否启用该可执行程序 */
  enabled: boolean;
  /** 命令执行超时时间（毫秒） */
  timeout?: number;
  /** 最大并发执行数量，防止资源过载 */
  maxConcurrentExecutions?: number;
  /** 重试次数，失败时自动重试 */
  retryAttempts?: number;
  /** 重试间隔时间（毫秒） */
  retryDelay?: number;
  /** 环境变量，键值对形式 */
  env?: Record<string, string | undefined> | undefined;
  /** 启动参数，程序启动时传递的参数 */
  startupArgs?: string[];
}

/**
 * SSH连接配置接口
 * 定义SSH连接的相关参数
 */
export interface SSHConfig {
  /** SSH服务器主机地址 */
  host: string;
  /** SSH服务器端口，默认为22 */
  port?: number;
  /** SSH用户名 */
  username: string;
  /** SSH私钥文件路径，可选 */
  privateKey?: string;
  /** SSH密码，可选（不推荐，建议使用私钥） */
  password?: string;
  /** SSH连接超时时间（毫秒），默认30秒 */
  connectTimeout?: number;
  /** SSH保持连接时间（毫秒），默认5分钟 */
  keepAlive?: number;
  /** SSH连接重试次数，默认3次 */
  retryAttempts?: number;
  /** SSH连接重试间隔（毫秒），默认1秒 */
  retryDelay?: number;
  /** SSH连接选项，如StrictHostKeyChecking等 */
  sshOptions?: Record<string, string>;
}

/**
 * 可执行程序配置接口
 * 扩展了外部可执行程序配置，添加了更多高级功能
 */
export interface ExecutableConfig {
  /** 可执行文件的完整路径 */
  path: string;
  /** 可执行程序的名称，用于标识和日志 */
  name: string;
  /** 是否启用该可执行程序 */
  enabled: boolean;
  /** 连接类型：local（本地）或 remote（远程SSH） */
  connectionType?: 'local' | 'remote';
  /** SSH连接配置，当connectionType为remote时使用 */
  ssh?: SSHConfig;
  /** 命令执行超时时间（毫秒） */
  timeout?: number;
  /** 最大并发执行数量，防止资源过载 */
  maxConcurrentExecutions?: number;
  /** 最大重试次数，失败时自动重试 */
  maxRetries?: number;
  /** 重试间隔时间（毫秒） */
  retryDelay?: number;
  /** 重启延迟时间（毫秒），程序崩溃后等待多久再重启 */
  restartDelay?: number;
  /** 环境变量，键值对形式 */
  env?: Record<string, string | undefined> | undefined;
  /** 启动参数，程序启动时传递的参数 */
  startupArgs?: string[];
  /** 工作目录，程序运行的工作目录 */
  cwd?: string;
  /** 是否自动重启，程序崩溃后是否自动重启 */
  autoRestart?: boolean;
  /** 超时时是否重启，命令执行超时后是否重启程序 */
  restartOnTimeout?: boolean;
  /** 输出编码，用于解码程序输出，默认为utf8 */
  encoding?: string;
}

/**
 * 通信通道接口
 * 定义与外部可执行程序通信的抽象接口
 */
export interface CommunicationChannel {
  /**
   * 发送请求到外部可执行程序
   * @param request 要发送的请求对象
   * @returns 返回执行结果响应
   */
  send(request: ExternalExecutableRequest): Promise<ExternalExecutableResponse>;
  /**
   * 关闭通信通道
   * @returns 关闭完成的Promise
   */
  close(): Promise<void>;
  /**
   * 检查通道是否处于活动状态
   * @returns 通道是否活跃
   */
  isActive(): boolean;
}

/**
 * 可执行程序提供者接口
 * 定义可执行程序提供者的基本行为
 */
export interface ExecutableProvider {
  /** 提供者的名称，用于标识 */
  readonly name: string;
  /** 提供者的版本号，可选 */
  readonly version?: string;
  /** 提供者是否受支持，基于系统环境判断 */
  readonly supported: boolean;

  /**
   * 初始化提供者
   * @param config 配置参数
   */
  initialize(config: ExecutableConfig): void;
  /**
   * 执行命令
   * @param command 命令名称
   * @param args 命令参数
   * @param options 执行选项
   * @returns 执行结果
   */
  execute(command: string, args?: string[], options?: unknown): Promise<ExternalExecutableResponse>;
  /**
   * 释放资源
   * @returns 释放完成的Promise或void
   */
  dispose(): void | Promise<void>;
}

/**
 * 可执行程序进程接口
 * 表示一个正在运行的可执行程序进程
 */
export interface ExecutableProcess {
  /** 进程ID，系统分配的进程标识符 */
  readonly pid: number;
  /** 进程启动时间 */
  readonly startTime: Date;
  /** 进程的配置信息 */
  readonly config: ExternalExecutableConfig;
  /** 与进程通信的通道 */
  readonly channel: CommunicationChannel;

  /**
   * 检查进程是否正在运行
   * @returns 进程是否运行中
   */
  isRunning(): boolean;
  /**
   * 终止进程
   * @param signal 终止信号，如'SIGTERM'、'SIGKILL'等
   * @returns 终止完成的Promise
   */
  kill(signal?: NodeJS.Signals): Promise<void>;
}

/**
 * 可执行程序状态枚举
 * 定义可执行程序可能的状态值
 */
export enum ExecutableStatus {
  /** 已停止状态 */
  Stopped = 'stopped',
  /** 正在启动状态 */
  Starting = 'starting',
  /** 正在运行状态 */
  Running = 'running',
  /** 正在停止状态 */
  Stopping = 'stopping',
  /** 错误状态 */
  Error = 'error'
}

/**
 * 可执行程序状态信息接口
 * 包含可执行程序的详细状态信息
 */
export interface ExecutableStatusInfo {
  /** 当前状态 */
  status: ExecutableStatus;
  /** 进程ID，如果正在运行 */
  pid?: number;
  /** 启动时间，记录进程何时启动 */
  startTime?: Date;
  /** 最后活动时间，记录最后一次操作的时间 */
  lastActivity?: Date;
  /** 错误信息，如果状态为Error */
  error?: Error;
}
