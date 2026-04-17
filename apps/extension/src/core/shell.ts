import type { ExecFileException, ExecFileOptions } from 'child_process';
import { exec, execFile, spawn } from 'child_process';
import type { Stats } from 'fs';
import { access, constants, existsSync, statSync } from 'fs';
import { join as joinPaths } from 'path';
import * as process from 'process';
import { normalizePath } from '@/utils/path';
import { Logger } from './logger';
import type { LogScope } from './logger.scope';
import { getLogScope } from './logger.scope';
import { CancelledRunError, RunError } from './shell.errors';

export const isWindows = process.platform === 'win32';

const slashesRegex = /[\\/]/;
const ps1Regex = /\.ps1$/i;
const batOrCmdRegex = /\.(bat|cmd)$/i;
const jsRegex = /\.(js)$/i;

/**
 * 在 PATH 环境变量指定的所有目录中查找指定文件是否存在。
 *
 * @param  {string} exe 要查找的文件名
 * @return {string} 返回文件的完整路径，如果未找到则返回原始路径
 *
 */
function runDownPath(exe: string): string {
  // 注意：在 Windows 上，spawn 不会像 Posix 那样自动在 PATH 中查找可执行文件

  // 如果文件路径中包含任何目录分隔符，则不会应用此逻辑
  if (slashesRegex.test(exe)) return exe;

  const target = joinPaths('.', exe);
  try {
    const stats = statSync(target);
    if (stats?.isFile() && isExecutable(stats)) return target;
  } catch {}

  const path = process.env.PATH;
  if (path != null && path.length !== 0) {
    const haystack = path.split(isWindows ? ';' : ':');
    let stats;
    for (const p of haystack) {
      const needle = joinPaths(p, exe);
      try {
        stats = statSync(needle);
        if (stats?.isFile() && isExecutable(stats)) return needle;
      } catch {}
    }
  }

  return exe;
}

function isExecutable(stats: Stats) {
  if (isWindows) return true;

  const isGroup = stats.gid ? process.getgid != null && stats.gid === process.getgid() : true;
  const isUser = stats.uid ? process.getuid != null && stats.uid === process.getuid() : true;

  return Boolean(stats.mode & 0o0001 || (stats.mode & 0o0010 && isGroup) || (stats.mode & 0o0100 && isUser));
}

/**
 * 在 Windows 上查找要运行的可执行文件及其参数。该方法通过用脚本运行器替换传入的可执行文件（针对 PowerShell、CMD 和 Node 脚本），
 * 来模拟 POSIX 允许将脚本作为可执行文件直接运行的行为。
 *
 * 此方法也会负责在 PATH 中查找可执行文件（在 Windows 上的 spawn 不会像 POSIX 那样自动搜索 PATH）。
 */
export function findExecutable(exe: string, args: string[]): { cmd: string; args: string[] } {
  // 在 POSIX 系统上可以直接执行脚本，无需这些花哨的处理
  if (!isWindows) return { cmd: runDownPath(exe), args: args };

  if (!existsSync(exe)) {
    // 注意：当你在 Windows 上写类似 `surf-client ... -- surf-build` 的命令时，
    // 终端通常会将其转换为 surf-build.cmd，但因为该字符串是作为参数传递的，
    // 因此不会发生这种转换
    const possibleExts = ['.exe', '.bat', '.cmd', '.ps1'];
    for (const ext of possibleExts) {
      const possibleFullPath = runDownPath(`${exe}${ext}`);

      if (existsSync(possibleFullPath)) return findExecutable(possibleFullPath, args);
    }
  }

  if (ps1Regex.test(exe)) {
    const cmd = joinPaths(
      process.env.SYSTEMROOT ?? 'C:\\WINDOWS',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'PowerShell.exe'
    );
    const psargs = ['-ExecutionPolicy', 'Unrestricted', '-NoLogo', '-NonInteractive', '-File', exe];

    return { cmd: cmd, args: psargs.concat(args) };
  }

  if (batOrCmdRegex.test(exe)) {
    const cmd = joinPaths(process.env.SYSTEMROOT ?? 'C:\\WINDOWS', 'System32', 'cmd.exe');
    const cmdArgs = ['/C', exe, ...args];

    return { cmd: cmd, args: cmdArgs };
  }

  if (jsRegex.test(exe)) {
    const cmd = process.execPath;
    const nodeArgs = [exe];

    return { cmd: cmd, args: nodeArgs.concat(args) };
  }

  return { cmd: exe, args: args };
}

export async function getWindowsShortPath(path: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    exec(`for %I in ("${path}") do @echo %~sI`, (error, stdout, _stderr) => {
      if (error != null) {
        reject(error);
        return;
      }

      resolve(normalizePath(stdout.trim()));
    });
  });
}

export interface RunOptions<TEncoding = BufferEncoding | 'buffer'> {
  cwd?: string;
  readonly env?: Record<string, any>;
  readonly encoding?: TEncoding;
  /**
   * 分配给被启动进程的输出缓冲区大小。若预期输出量较大，请设置此值。
   *
   * 如果未指定，默认值为 10MB（10485760 字节），应足以应对大多数 Git 操作。
   */
  readonly maxBuffer?: number;
  readonly signal?: AbortSignal;

  /**
   * 一个可选的字符串或 Buffer，会在子进程启动后立即写入其 stdin 流。
   */
  readonly stdin?: string | Buffer;
  /**
   * 当 stdin 参数为字符串时，写入 stdin 使用的编码。
   */
  readonly stdinEncoding?: string;
  readonly timeout?: number;
  /**
   * 子进程 stdout 输出事件回调（按分片触发）。
   *
   * @param data 原始输出分片
   */
  readonly onStdoutData?: (data: Buffer) => void;
  /**
   * 子进程 stderr 输出事件回调（按分片触发）。
   *
   * @param data 原始输出分片
   */
  readonly onStderrData?: (data: Buffer) => void;

  // 日志作用域
  readonly scope?: LogScope;
}

const bufferExceededRegex = /stdout maxBuffer( length)? exceeded/;

type ExitCodeOnlyRunOptions<TEncoding = BufferEncoding | 'buffer'> = RunOptions<TEncoding> & { exitCodeOnly: true };

export function run(
  command: string,
  args: readonly string[],
  encoding: BufferEncoding | string,
  options: ExitCodeOnlyRunOptions<BufferEncoding>
): Promise<number>;
export function run(
  command: string,
  args: readonly string[],
  encoding: BufferEncoding | string,
  options?: RunOptions<BufferEncoding>
): Promise<string>;
export function run<T extends number | string>(
  command: string,
  args: readonly string[],
  encoding: BufferEncoding | string,
  options?: RunOptions<BufferEncoding> & { exitCodeOnly?: boolean }
): Promise<T> {
  const { stdin, stdinEncoding, ...opts }: RunOptions<BufferEncoding> & ExecFileOptions = {
    maxBuffer: 1000 * 1024 * 1024,
    ...options
  };

  return new Promise<T>((resolve, reject) => {
    const proc = execFile(command, args, opts, async (error: ExecFileException | null, stdout, stderr) => {
      if (options?.exitCodeOnly) {
        resolve((error?.code ?? proc.exitCode) as T);

        return;
      }

      if (error != null) {
        if (error.signal === 'SIGTERM') {
          reject(new CancelledRunError(`${command} ${args.join(' ')}`, true, error.code ?? undefined, error.signal));

          return;
        }

        if (bufferExceededRegex.test(error.message)) {
          error.message = `Command output exceeded the allocated stdout buffer. Set 'options.maxBuffer' to a larger value than ${opts.maxBuffer} bytes`;
        }

        let stdoutDecoded: string;
        let stderrDecoded: string;
        if (encoding === 'utf8' || encoding === 'binary' || encoding === 'buffer') {
          // stdout 和 stderr 可以是 `Buffer` 或 `string`
          stdoutDecoded = stdout;
          stderrDecoded = stderr;
        } else {
          const decode = (await import(/* webpackChunkName: "lib-encoding" */ 'iconv-lite')).default.decode;
          stdoutDecoded = decode(Buffer.from(stdout, 'binary'), encoding);
          stderrDecoded = decode(Buffer.from(stderr, 'binary'), encoding);
        }
        reject(new RunError(error, stdoutDecoded, stderrDecoded));

        return;
      }

      if (stderr) {
        Logger.warn(`Warning(${command} ${args.join(' ')}): ${stderr}`);
      }

      if (encoding === 'utf8' || encoding === 'binary' || encoding === 'buffer') {
        resolve(stdout as T);
      } else {
        const decode = (await import(/* webpackChunkName: "lib-encoding" */ 'iconv-lite')).default.decode;
        resolve(decode(Buffer.from(stdout, 'binary'), encoding) as T);
      }
    });

    if (stdin != null) {
      proc.stdin?.end(stdin, (stdinEncoding ?? 'utf8') as BufferEncoding);
    }
  });
}

export interface RunExitResult {
  exitCode: number;
}

export interface RunResult<T extends string | Buffer> extends RunExitResult {
  stdout: T;
  stderr: T;
}

export function runSpawn(
  command: string,
  args: readonly string[],
  encoding: BufferEncoding | 'buffer' | string,
  options: ExitCodeOnlyRunOptions
): Promise<RunExitResult>;
export function runSpawn<T extends string | Buffer>(
  command: string,
  args: readonly string[],
  encoding: BufferEncoding | 'buffer' | string,
  options: RunOptions
): Promise<RunResult<T>>;
export function runSpawn<T extends string | Buffer>(
  command: string,
  args: readonly string[],
  encoding: BufferEncoding | 'buffer' | string,
  options: RunOptions & { exitCodeOnly?: boolean }
): Promise<RunExitResult | RunResult<T>> {
  const scope = options.scope ?? getLogScope();

  const { stdin, stdinEncoding, ...opts }: RunOptions = options;

  return new Promise<RunExitResult | RunResult<T>>((resolve, reject) => {
    const proc = spawn(command, args, opts);

    const stdoutBuffers: Buffer[] = [];
    proc.stdout.on('data', (data: Buffer) => {
      stdoutBuffers.push(data);
      options.onStdoutData?.(data);
    });

    const stderrBuffers: Buffer[] = [];
    proc.stderr.on('data', (data: Buffer) => {
      stderrBuffers.push(data);
      options.onStderrData?.(data);
    });

    function getStdio<T>(
      encoding: BufferEncoding | 'buffer' | string
    ): { stdout: T; stderr: T } | Promise<{ stdout: T; stderr: T }> {
      const stdout = Buffer.concat(stdoutBuffers);
      const stderr = Buffer.concat(stderrBuffers);
      if (encoding === 'utf8' || encoding === 'binary') {
        return { stdout: stdout.toString(encoding) as T, stderr: stderr.toString(encoding) as T };
      }
      if (encoding === 'buffer') {
        return { stdout: stdout as T, stderr: stderr as T };
      }

      return import(/* webpackChunkName: "lib-encoding" */ 'iconv-lite').then((iconv) => {
        return {
          stdout: iconv.default.decode(stdout, encoding) as T,
          stderr: iconv.default.decode(stderr, encoding) as T
        };
      });
    }

    proc.once('error', async (ex) => {
      if (ex?.name === 'AbortError') {
        reject(new CancelledRunError(`${command} ${args.join(' ')}`, true));

        return;
      }

      const stdio = getStdio<string>(encoding);
      const { stdout, stderr } = stdio instanceof Promise ? await stdio : stdio;

      reject(new RunError(ex, stdout, stderr));
    });

    proc.once('close', async (code, signal) => {
      if (options?.exitCodeOnly) {
        resolve({ exitCode: code ?? 0 });

        return;
      }

      if (code !== 0 || signal) {
        const stdio = getStdio<string>(encoding);
        const { stdout, stderr } = stdio instanceof Promise ? await stdio : stdio;
        if (stderr.length) {
          Logger.warn(scope, `警告(${command} ${args.join(' ')}): ${stderr}`);
        }

        if (signal === 'SIGTERM') {
          reject(new CancelledRunError(`${command} ${args.join(' ')}`, true, code ?? undefined, signal));

          return;
        }

        reject(
          new RunError(
            {
              message: `命令执行失败，退出代码：${code}`,
              code: code,
              signal: signal ?? undefined
            },
            stdout,
            stderr
          )
        );

        return;
      }

      const stdio = getStdio<T>(encoding);
      const { stdout, stderr } = stdio instanceof Promise ? await stdio : stdio;
      if (stderr.length) {
        Logger.warn(
          scope,
          `Warning(${command} ${args.join(' ')}): ${typeof stderr === 'string' ? stderr : stderr.toString()}`
        );
      }

      resolve({ exitCode: code ?? 0, stdout: stdout, stderr: stderr });
    });

    if (stdin) {
      if (typeof stdin === 'string') {
        proc.stdin.end(stdin, (stdinEncoding ?? 'utf8') as BufferEncoding);
      } else if (stdin instanceof Buffer) {
        proc.stdin.end(stdin);
      }
    }
  });
}

export async function fsExists(path: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => access(path, constants.F_OK, (err) => resolve(err == null)));
}
