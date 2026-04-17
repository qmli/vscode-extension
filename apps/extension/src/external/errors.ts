import { Logger } from '@/core/logger';

export class ExternalExecutableError extends Error {
  readonly code: string;
  readonly originalError?: Error;

  constructor(message: string, code: string = 'EXTERNAL_EXECUTABLE_ERROR', originalError?: Error) {
    super(message);
    this.name = 'ExternalExecutableError';
    this.code = code;
    this.originalError = originalError;
    this.originalError = originalError;
    Logger.error(originalError, message);
  }
}

export class ExecutableNotFoundError extends ExternalExecutableError {
  constructor(executablePath: string) {
    super(`未找到可执行文件: ${executablePath}`, 'EXECUTABLE_NOT_FOUND');
  }
}

export class ExecutableTimeoutError extends ExternalExecutableError {
  readonly timeout: number;

  constructor(timeout: number, command?: string) {
    super(`可执行操作在 ${timeout}ms 后超时${command ? `，命令: ${command}` : ''}`, 'EXECUTABLE_TIMEOUT');
    this.timeout = timeout;
  }
}

export class ExecutableStartupError extends ExternalExecutableError {
  constructor(executablePath: string, originalError?: Error) {
    super(`启动可执行文件失败: ${executablePath}`, 'EXECUTABLE_STARTUP_FAILED', originalError);
  }
}

export class CommunicationError extends ExternalExecutableError {
  constructor(message: string, originalError?: Error) {
    super(`Communication error: ${message}`, 'COMMUNICATION_ERROR', originalError);
  }
}

export class ExecutableMaxRetriesExceededError extends ExternalExecutableError {
  readonly retryCount: number;

  constructor(retryCount: number, command?: string) {
    super(`重试次数已达到最大限制 (${retryCount})${command ? `，命令: ${command}` : ''}`, 'MAX_RETRIES_EXCEEDED');
    this.retryCount = retryCount;
  }
}

export class SSHConnectionError extends ExternalExecutableError {
  constructor(host: string, port: number, originalError?: Error) {
    super(`SSH连接失败: ${host}:${port}`, 'SSH_CONNECTION_ERROR', originalError);
  }
}

export class SSHAuthenticationError extends ExternalExecutableError {
  constructor(host: string, username: string, originalError?: Error) {
    super(`SSH认证失败: ${username}@${host}`, 'SSH_AUTHENTICATION_ERROR', originalError);
  }
}

export class SSHCommandExecutionError extends ExternalExecutableError {
  constructor(command: string, host: string, originalError?: Error) {
    super(`SSH命令执行失败: ${command} on ${host}`, 'SSH_COMMAND_EXECUTION_ERROR', originalError);
  }
}

export class SSHKeyNotFoundError extends ExternalExecutableError {
  constructor(keyPath: string) {
    super(`SSH私钥文件未找到: ${keyPath}`, 'SSH_KEY_NOT_FOUND');
  }
}

export class SSHConfigurationError extends ExternalExecutableError {
  constructor(message: string) {
    super(`SSH配置错误: ${message}`, 'SSH_CONFIGURATION_ERROR');
  }
}

export class SSHExecutableNotFoundError extends ExternalExecutableError {
  constructor(executablePath: string, host: string) {
    super(`远程可执行文件未找到: ${executablePath} on ${host}`, 'SSH_EXECUTABLE_NOT_FOUND');
  }
}
