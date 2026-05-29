import { hrtime } from 'process';
import { getParameters } from './_utils/function';
import { getDurationMilliseconds } from './_utils/string';
import { slowCallWarningThreshold } from './constants/logger.constants';
import { customLoggableNameFns, getLoggableName, Logger } from './logger';
import type { LogScope } from './logger.scope';
import { clearLogScope, getLoggableScopeBlock, logScopeIdGenerator, setLogScope } from './logger.scope';
import { isPromise } from './promise';

export interface LogContext {
  id: number;
  instance: any;
  instanceName: string;
  name: string;
  prefix: string;
}

interface LogOptions<T extends (...args: any) => any> {
  /**
   * 是否记录函数参数。
   * - `false`：不记录参数。
   * - 对象：指定参数的记录方式，可以通过索引指定参数的处理逻辑。
   *   - `0`, `1`, `2`, ...：表示参数索引。
   *   - 值可以是：
   *     - 函数：接收参数值并返回记录的内容。
   *     - 字符串：直接记录为指定的字符串。
   *     - `false`：忽略该参数。
   */
  args?:
    | false
    | {
        0?: ((arg: Parameters<T>[0]) => unknown) | string | false;
        1?: ((arg: Parameters<T>[1]) => unknown) | string | false;
        2?: ((arg: Parameters<T>[2]) => unknown) | string | false;
        3?: ((arg: Parameters<T>[3]) => unknown) | string | false;
        4?: ((arg: Parameters<T>[4]) => unknown) | string | false;
        [key: number]: (((arg: any) => unknown) | string | false) | undefined;
      };

  /**
   * 条件函数，用于决定是否记录日志。
   * - 如果返回 `true`，则记录日志。
   * - 如果返回 `false`，则跳过日志记录。
   * - 接收当前上下文 (`this`) 和函数参数作为输入。
   */
  if?(this: any, ...args: Parameters<T>): boolean;

  /**
   * 在函数调用开始时记录的日志内容。
   * - 接收函数参数作为输入。
   * - 返回一个字符串，表示进入函数时的日志内容。
   */
  enter?(...args: Parameters<T>): string;

  /**
   * 在函数调用结束时记录的日志内容。
   * - 可以是：
   *   - 函数：接收函数返回值作为输入，返回日志内容。
   *   - 布尔值：
   *     - `true`：记录返回值。
   *     - `false`：不记录返回值。
   */
  exit?: ((result: PromiseType<ReturnType<T>>) => string) | boolean;

  /**
   * 自定义日志前缀。
   * - 接收日志上下文 (`LogContext`) 和函数参数作为输入。
   * - 返回一个字符串，作为日志的前缀。
   */
  prefix?(context: LogContext, ...args: Parameters<T>): string;

  /**
   * 日志记录的时间阈值（毫秒）。
   * - 如果函数执行时间超过该值，则记录为慢调用日志。
   * - 默认为 `0`，表示不限制。
   */
  logThreshold?: number;

  /**
   * 是否启用作用域日志。
   * - `true`：记录日志作用域。
   * - `false`：不记录作用域。
   * - 默认为 `true`。
   */
  scoped?: boolean;

  /**
   * 是否以单行格式记录日志。
   * - `true`：将日志记录为单行。
   * - `false`：允许多行日志。
   * - 默认为 `false`。
   */
  singleLine?: boolean;

  /**
   * 是否记录函数执行时间。
   * - `true`：记录执行时间。
   * - `false`：不记录执行时间。
   * - 默认为 `true`。
   */
  timed?: boolean;
}

export function logName<T>(fn: (c: T, name: string) => string) {
  return (target: any): void => void customLoggableNameFns.set(target, fn);
}

export function debug<T extends (...arg: any) => any>(
  options?: LogOptions<T>
): (_target: any, key: string, descriptor: PropertyDescriptor & Record<string, any>) => void {
  return log<T>(options, true);
}

type PromiseType<T> = T extends Promise<infer U> ? U : T;

export function log<T extends (...arg: any) => any>(
  options?: LogOptions<T>,
  debug = false
): (_target: any, key: string, descriptor: PropertyDescriptor & Record<string, any>) => void {
  let overrides: LogOptions<T>['args'] | undefined;
  let ifFn: LogOptions<T>['if'] | undefined;
  let enterFn: LogOptions<T>['enter'] | undefined;
  let exitFn: LogOptions<T>['exit'] | undefined;
  let prefixFn: LogOptions<T>['prefix'] | undefined;
  let logThreshold: NonNullable<LogOptions<T>['logThreshold']> = 0;
  let scoped: NonNullable<LogOptions<T>['scoped']> = false;
  let singleLine: NonNullable<LogOptions<T>['singleLine']> = false;
  let timed: NonNullable<LogOptions<T>['timed']> = true;
  if (options != null) {
    ({
      args: overrides,
      if: ifFn,
      enter: enterFn,
      exit: exitFn,
      prefix: prefixFn,
      logThreshold = 0,
      scoped = true,
      singleLine = false,
      timed = true
    } = options);
  }

  if (logThreshold > 0) {
    singleLine = true;
    timed = true;
  }

  if (timed) {
    scoped = true;
  }

  const debugging = Logger.isDebugging;
  const logFn: (message: string, ...params: any[]) => void = debug ? Logger.debug : Logger.log;
  const logLevel = debugging ? 'debug' : 'info';

  return (_target: any, key: string, descriptor: PropertyDescriptor & Record<string, any>) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let fn: Function | undefined;
    let fnKey: string | undefined;
    if (typeof descriptor.value === 'function') {
      fn = descriptor.value;
      fnKey = 'value';
    } else if (typeof descriptor.get === 'function') {
      fn = descriptor.get;
      fnKey = 'get';
    }
    if (fn == null || fnKey == null) throw new Error('Not supported');

    const parameters = overrides !== false ? getParameters(fn) : [];

    descriptor[fnKey] = function (this: any, ...args: Parameters<T>) {
      if ((!debugging && !Logger.enabled(logLevel)) || (ifFn != null && !ifFn.apply(this, args))) {
        return fn.apply(this, args);
      }

      const prevScopeId = logScopeIdGenerator.current;
      const scopeId = logScopeIdGenerator.next();

      const instanceName = this != null ? getLoggableName(this) : undefined;

      let prefix = instanceName
        ? scoped
          ? `${getLoggableScopeBlock(scopeId, prevScopeId)} ${instanceName}.${key}`
          : `${instanceName}.${key}`
        : key;

      if (prefixFn != null) {
        prefix = prefixFn(
          {
            id: scopeId,
            instance: this,
            instanceName: instanceName ?? '',
            name: key,
            prefix: prefix
          },
          ...args
        );
      }

      let scope: LogScope | undefined;
      if (scoped) {
        scope = setLogScope(scopeId, { scopeId: scopeId, prevScopeId: prevScopeId, prefix: prefix });
      }

      const enter = enterFn != null ? enterFn(...args) : '';

      let loggableParams: string;
      if (overrides === false || args.length === 0) {
        loggableParams = '';

        if (!singleLine) {
          logFn.call(Logger, `${prefix}${enter}`);
        }
      } else {
        loggableParams = '';

        let paramOverride;
        let paramIndex = -1;
        let paramName;
        let paramLogValue;
        let paramValue;

        for (paramValue of args as unknown[]) {
          paramName = parameters[++paramIndex];

          paramOverride = overrides?.[paramIndex];
          if (paramOverride != null) {
            if (typeof paramOverride === 'boolean') continue;

            if (loggableParams.length > 0) {
              loggableParams += ', ';
            }

            if (typeof paramOverride === 'string') {
              loggableParams += paramOverride;
              continue;
            }

            paramLogValue = String(paramOverride(paramValue));
          } else {
            if (loggableParams.length > 0) {
              loggableParams += ', ';
            }

            paramLogValue = Logger.toLoggable(paramValue);
          }

          loggableParams += paramName ? `${paramName}=${paramLogValue}` : paramLogValue;
        }

        if (!singleLine) {
          logFn.call(Logger, loggableParams ? `${prefix}${enter}(${loggableParams})` : `${prefix}${enter}`);
        }
      }

      if (singleLine || timed || exitFn != null) {
        const start = timed ? hrtime() : undefined;

        const logError = (ex: unknown) => {
          const timing = start !== undefined ? ` [${getDurationMilliseconds(start)}ms]` : '';
          if (singleLine) {
            Logger.error(
              ex,
              loggableParams ? `${prefix}${enter}(${loggableParams})` : `${prefix}${enter}`,
              scope?.exitDetails ? `failed${scope.exitDetails}${timing}` : `failed${timing}`
            );
          } else {
            Logger.error(ex, prefix, scope?.exitDetails ? `failed${scope.exitDetails}${timing}` : `failed${timing}`);
          }

          if (scoped) {
            clearLogScope(scopeId);
          }
        };

        let result;
        try {
          result = fn.apply(this, args);
        } catch (ex) {
          logError(ex);
          throw ex;
        }

        /**
         * 记录日志结果的函数，根据执行时间和结果生成不同级别的日志信息。
         *
         * @param r - 任意类型的结果值，用于生成日志信息。
         * 该函数的主要功能包括：
         * 1.根据开始时间计算执行时长，并判断是否超过慢调用阈值（`slowCallWarningThreshold`），
         *    如果超过则记录警告日志，否则记录普通日志。
         * 2. 根据 `exitFn` 参数处理退出日志信息：
         *    - 如果 `exitFn` 是函数，则调用该函数处理结果。
         *    - 如果 `exitFn` 是布尔值 `true`，则记录返回值。
         *    - 如果 `scope.exitFailed` 存在，则记录失败信息。
         *    - 否则记录默认的 "completed" 信息。
         * 3. 根据 `singleLine` 参数决定日志格式：
         *    - 如果为单行日志，且执行时长超过日志阈值（`logThreshold`），则记录单行日志。
         *    - 否则记录多行日志。
         * 4. 如果启用了作用域日志（`scoped`），在记录日志后清除日志作用域。
         * 注意：
         * - 如果 `start` 为 `null`，则不会计算执行时长。
         * - 如果 `exitFn` 是函数，调用时可能会抛出异常，此时会记录异常信息。
         */
        const logResult = (r: any) => {
          let duration: number | undefined;
          let exitLogFn: typeof logFn;
          let timing;
          if (start != null) {
            duration = getDurationMilliseconds(start);
            if (duration > slowCallWarningThreshold) {
              exitLogFn = Logger.warn;
              timing = ` [*${duration}ms] (slow)`;
            } else {
              exitLogFn = logFn;
              timing = ` [${duration}ms]`;
            }
          } else {
            timing = '';
            exitLogFn = logFn;
          }

          let exit;
          if (exitFn != null) {
            if (typeof exitFn === 'function') {
              try {
                exit = exitFn(r);
              } catch (ex) {
                exit = `@log.exit error: ${ex instanceof Error ? ex.message : String(ex)}`;
              }
            } else if (exitFn === true) {
              exit = `returned ${Logger.toLoggable(r)}`;
            }
          } else if (scope?.exitFailed) {
            exit = scope.exitFailed;
            exitLogFn = (message: string, ...params: any[]) => Logger.error(null, message, ...params);
          } else {
            exit = 'completed';
          }

          if (singleLine) {
            if (logThreshold === 0 || duration! > logThreshold) {
              exitLogFn.call(
                Logger,
                loggableParams
                  ? `${prefix}${enter}(${loggableParams}) ${exit}${scope?.exitDetails || ''}${timing}`
                  : `${prefix}${enter} ${exit}${scope?.exitDetails || ''}${timing}`
              );
            }
          } else {
            exitLogFn.call(
              Logger,
              loggableParams
                ? `${prefix}(${loggableParams}) ${exit}${scope?.exitDetails || ''}${timing}`
                : `${prefix} ${exit}${scope?.exitDetails || ''}${timing}`
            );
          }

          if (scoped) {
            clearLogScope(scopeId);
          }
        };

        if (result != null && isPromise(result)) {
          result.then(logResult, logError);
        } else {
          logResult(result);
        }

        return result;
      }

      return fn.apply(this, args);
    };
  };
}
