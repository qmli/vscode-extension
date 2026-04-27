// 运行命令时传递到 RunError 的上下文信息
interface RunErrorContext {
  // 错误信息（将作为 Error.message）
  message: string;
  // 执行的命令（可选）
  cmd?: string | undefined;
  // 进程是否被杀掉（可选）
  killed?: boolean | undefined;
  // 退出码或状态（可选）
  code?: string | number | null | undefined;
  // 信号（可选，例如 'SIGTERM'）
  signal?: NodeJS.Signals | undefined;
}

/**
 * RunError - 表示外部命令执行失败的自定义错误类型。
 *
 * 除了标准的 Error 字段外，还保存了命令、退出码、信号以及命令的 stdout/stderr 输出（已 trim）。
 */
export class RunError extends Error {
  // 执行的命令（如果有）
  readonly cmd?: string | undefined;
  // 是否被杀掉
  readonly killed?: boolean | undefined;
  // 退出码（可为字符串或数字）
  readonly code?: string | number | undefined;
  // 触发的信号（例如 'SIGTERM'）
  readonly signal?: NodeJS.Signals | undefined;
  // 标准输出（已去除首尾空白）
  readonly stdout: string;
  // 标准错误（已去除首尾空白）
  readonly stderr: string;

  constructor(context: RunErrorContext, stdout: string, stderr: string) {
    // 使用传入的上下文 message 作为 Error 的 message
    super(context.message);

    // 保存上下文字段，保持与外部执行器的契约
    this.cmd = context.cmd;
    this.killed = context.killed;
    // 如果 code 为 null 等，统一为 undefined
    this.code = context.code ?? undefined;
    this.signal = context.signal;
    // 将 stdout/stderr trim 后存储，避免多余换行或空白影响日志显示
    this.stdout = stdout?.trim() ?? '';
    this.stderr = stderr?.trim() ?? '';

    // 指定错误类型名，便于在外部通过 name 判断
    this.name = 'RunError';
    // 在 V8 环境中捕获堆栈（如果可用），并将构造函数排除在堆栈之外
    Error.captureStackTrace?.(this, RunError);
  }
}

/**
 * CancelledRunError - 表示因为被取消而中止的命令。
 *
 * 这是 RunError 的一个特殊子类，默认信号为 'SIGTERM'。
 */
export class CancelledRunError extends RunError {
  constructor(cmd: string, killed: boolean, code?: number | string | undefined, signal: NodeJS.Signals = 'SIGTERM') {
    super(
      // 构造一个描述性 message，并将上下文传入 RunError
      { message: `Operation cancelled; command=${cmd}`, cmd: cmd, killed: killed, code: code, signal: signal },
      '', // 取消时通常没有 stdout
      '' // 取消时通常没有 stderr
    );

    this.name = 'CancelledRunError';
    // 捕获堆栈并将构造函数排除，方便调试
    Error.captureStackTrace?.(this, CancelledRunError);
  }
}
