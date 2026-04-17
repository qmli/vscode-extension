import { CancellationError as _CancellationError } from 'vscode';

/**
 *
 * @param ex 可能的异常对象
 * @description 检查异常是否为取消操作的错误
 * @returns
 */
export function isCancellationError(ex: unknown): ex is CancellationError {
  return ex instanceof CancellationError || ex instanceof _CancellationError;
}

export class CancellationError extends _CancellationError {
  constructor(public readonly original?: Error) {
    super();

    if (this.original) {
      if (this.original.message.startsWith('Operation cancelled')) {
        this.message = this.original.message;
      } else {
        this.message = `Operation cancelled; ${this.original.message}`;
      }
    } else {
      this.message = 'Operation cancelled';
    }
    Error.captureStackTrace?.(this, CancellationError);
  }
}

/**
 * 错误管理器 源码文件GlobalState.ts errorProjectSet 与 errorNodeSet 属性迁移到此
 */
class ErrorManager {
  private static instance: ErrorManager;

  private errorProjectSet: Set<string> = new Set();
  private errorNodeSet: Set<string> = new Set();

  // 使用单例模式
  private constructor() {}

  public static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * 添加错误
   * @param projectId
   */
  public addProjectError(projectId: string): void {
    this.errorProjectSet.add(projectId);
  }

  /**
   *添加节点错误
   * @param nodeId
   */
  public addNodeError(nodeId: string): void {
    this.errorNodeSet.add(nodeId);
  }

  /**
   *
   * @returns 获取错误集合
   */
  public getProjectErrors(): Set<string> {
    return new Set(this.errorProjectSet); // 返回一个副本
  }

  /**
   *
   * @returns 获取错误集合
   */
  public getNodeErrors(): Set<string> {
    return new Set(this.errorNodeSet); // 返回一个副本
  }

  // 清除所有错误
  public clearErrors(): void {
    this.errorProjectSet.clear();
    this.errorNodeSet.clear();
  }
}
export const errorManager = ErrorManager.getInstance();
