import type { Logger as Logger4 } from 'log4js';
import { configure, getLogger } from 'log4js';
import type { LogOutputChannel } from 'vscode';
import { padOrTruncateEnd } from './_utils/string';
import type { LogLevel } from '@packages/common/webviews/constants/logger.constants';
import type { LogScope } from './logger.scope';

const enum OrderedLevel {
  Off = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4
}

export interface LogChannelProvider {
  readonly name: string;
  createChannel(name: string): LogChannel;
  toLoggable?(o: unknown): string | undefined;

  sanitizeKeys?: Set<string>;
  sanitizer?: (key: string, value: unknown) => unknown;
}

export interface LogChannel {
  readonly name: string;
  isLogOutputChannel?(
    channel: RequireSome<LogChannel, 'dispose'> & { append(value: string): void }
  ): channel is LogOutputChannel;
  appendLine(value: string, logLevel: LogLevel): void;
  dispose?(): void;
  show?(preserveFocus?: boolean): void;
}

const defaultSanitizeKeys = ['accessToken', 'password', 'token'];

class LoggerClass {
  private output: LogChannel | undefined;
  private log4jsLogger: Logger4 | undefined;
  private provider: RequireSome<LogChannelProvider, 'sanitizeKeys'> | undefined;

  configure(provider: LogChannelProvider, logLevel: LogLevel, debugging: boolean = false) {
    if (provider.sanitizeKeys != null) {
      for (const key of defaultSanitizeKeys) {
        provider.sanitizeKeys.add(key);
      }
    } else {
      provider.sanitizeKeys = new Set(defaultSanitizeKeys);
    }
    //-------------------log4js
    configure({
      appenders: {
        error: {
          type: 'dateFile',
          filename: `logs/${provider.name}-extension-error.log`,
          pattern: 'yyyy-MM-dd',
          keepFileExt: true,
          alwaysIncludePattern: true,
          encoding: 'utf-8',
          compress: true,
          level: 'error',
          daysToKeep: 30, // 保留30天的日志
          layout: {
            type: 'pattern',
            pattern: '[%p] %m'
          }
        }
      },
      categories: {
        default: { appenders: ['error'], level: 'warn' }
      }
    });
    this.log4jsLogger = getLogger();
    this.provider = provider as RequireSome<LogChannelProvider, 'sanitizeKeys'>;

    this._isDebugging = debugging;
    this.logLevel = logLevel;
  }

  enabled(level: LogLevel): boolean {
    return this.level >= toOrderedLevel(level);
  }

  private _isDebugging = false;
  get isDebugging() {
    return this._isDebugging;
  }

  private level: OrderedLevel = OrderedLevel.Off;
  private _logLevel: LogLevel = 'off';
  get logLevel(): LogLevel {
    return this._logLevel;
  }
  set logLevel(value: LogLevel) {
    this._logLevel = value;
    this.level = toOrderedLevel(this._logLevel);

    if (value === 'off') {
      this.output?.dispose?.();
      this.output = undefined;
    } else {
      this.output ??= this.provider!.createChannel(this.provider!.name);
    }
  }

  get timestamp(): string {
    return `[${new Date().toLocaleString('zh-CN', { hour12: false })}.${new Date().getMilliseconds().toString().padStart(3, '0')}]`;
  }

  debug(message: string, ...params: any[]): void;
  debug(scope: LogScope | undefined, message: string, ...params: any[]): void;
  debug(scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Debug && !this.isDebugging) return;

    let message;
    if (typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = params.shift();

      if (scopeOrMessage != null) {
        message = `${scopeOrMessage.prefix} ${message ?? ''}`;
      }
    }

    if (this.isDebugging) {
      console.log(`[${padOrTruncateEnd(this.provider!.name, 13)}]`, this.timestamp, message ?? '', ...params);
    }

    if (this.output == null || this.level < OrderedLevel.Debug) return;
    this.output.appendLine(`${this.timestamp} ${message ?? ''}${this.toLoggableParams(true, params)}`, 'debug');
  }

  error(ex: Error | unknown, message?: string, ...params: any[]): void;
  error(ex: Error | unknown, scope?: LogScope, message?: string, ...params: any[]): void;
  error(ex: Error | unknown, scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Error && !this.isDebugging) return;

    let message;
    if (scopeOrMessage == null || typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = `${scopeOrMessage.prefix} ${params.shift() ?? ''}`;
    }

    if (message == null) {
      const stack = ex instanceof Error ? ex.stack : undefined;
      if (stack) {
        const match = /.*\s*?at\s(.+?)\s/.exec(stack);
        if (match != null) {
          message = match[1];
        }
      }
    }

    if (this.isDebugging) {
      if (ex != null) {
        console.error(`[${padOrTruncateEnd(this.provider!.name, 13)}]`, this.timestamp, message ?? '', ...params, ex);
      } else {
        console.error(`[${padOrTruncateEnd(this.provider!.name, 13)}]`, this.timestamp, message ?? '', ...params);
      }
    }
    this.log4jsLogger?.error(
      `${this.timestamp} ${message ?? ''}${this.toLoggableParams(false, params)}${ex != null ? `\n${String(ex)}` : ''}`
    );
    if (this.output == null || this.level < OrderedLevel.Error) return;
    this.output.appendLine(
      `${this.timestamp} ${message ?? ''}${this.toLoggableParams(false, params)}${ex != null ? `\n${String(ex)}` : ''}`,
      'error'
    );
  }

  log(message: string, ...params: any[]): void;
  log(scope: LogScope | undefined, message: string, ...params: any[]): void;
  log(scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Info && !this.isDebugging) return;

    let message;
    if (typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = params.shift();

      if (scopeOrMessage != null) {
        message = `${scopeOrMessage.prefix} ${message ?? ''}`;
      }
    }

    if (this.isDebugging) {
      console.log(`[${padOrTruncateEnd(this.provider!.name, 13)}]`, this.timestamp, message ?? '', ...params);
    }

    if (this.output == null || this.level < OrderedLevel.Info) return;
    this.output.appendLine(`${this.timestamp} ${message ?? ''}${this.toLoggableParams(false, params)}`, 'info');
    this.log4jsLogger?.info(`${this.timestamp} ${message ?? ''}${this.toLoggableParams(false, params)}`);
  }

  warn(message: string, ...params: any[]): void;
  warn(scope: LogScope | undefined, message: string, ...params: any[]): void;
  warn(scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Warn && !this.isDebugging) return;

    let message;
    if (typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = params.shift();

      if (scopeOrMessage != null) {
        message = `${scopeOrMessage.prefix} ${message ?? ''}`;
      }
    }

    if (this.isDebugging) {
      console.warn(this.timestamp, `[${this.provider!.name}]`, message ?? '', ...params);
    }

    if (this.output == null || this.level < OrderedLevel.Warn) return;
    const logMessage = `${this.timestamp} ${message ?? ''}${this.toLoggableParams(false, params)}`;
    this.output.appendLine(logMessage, 'warn');
    this.log4jsLogger?.warn(logMessage);
  }

  showOutputChannel(preserveFocus?: boolean): void {
    this.output?.show?.(preserveFocus);
  }

  toLoggable(o: any, sanitizer?: ((key: string, value: unknown) => unknown) | undefined): string {
    if (typeof o !== 'object') return String(o);

    if (Array.isArray(o)) {
      return `[${o.map((i) => this.toLoggable(i, sanitizer)).join(', ')}]`;
    }

    const loggable = this.provider!.toLoggable?.(o);
    if (loggable != null) {
      return loggable;
    }

    try {
      return JSON.stringify(o, (key: string, value: unknown): unknown => {
        if (this.provider!.sanitizeKeys.has(key)) return `<${key}>`;

        if (sanitizer != null) {
          value = sanitizer(key, value);
        }
        if (this.provider?.sanitizer != null) {
          value = this.provider.sanitizer(key, value);
        }
        return value;
      });
    } catch {
      return '<error>';
    }
  }

  private toLoggableParams(debugOnly: boolean, params: any[]) {
    if (params.length === 0 || (debugOnly && this.level < OrderedLevel.Debug && !this.isDebugging)) {
      return '';
    }

    const loggableParams = params.map((p) => this.toLoggable(p)).join(', ');
    return loggableParams.length !== 0 ? ` \u2014 ${loggableParams}` : '';
  }
}

export const Logger = new LoggerClass();

const maxBufferedLines = 100;

export class BufferedLogChannel implements LogChannel {
  private readonly buffer: { value: string; logLevel: LogLevel }[] = [];
  private bufferTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly channel: RequireSome<LogChannel, 'dispose'> & {
      append(value: string): void;
      debug?(value: string): void;
      warn?(value: string): void;
      error?(value: string): void;
    },
    private readonly interval: number = 500
  ) {
    if (
      this.channel &&
      typeof (this.channel as LogOutputChannel).debug === 'function' &&
      typeof (this.channel as LogOutputChannel).warn === 'function' &&
      typeof (this.channel as LogOutputChannel).error === 'function'
    ) {
      this.channel = this.channel as LogOutputChannel;
    }
  }

  dispose(): void {
    clearInterval(this.bufferTimer);
    this.bufferTimer = undefined;

    this.flush();
    this.channel.dispose();
  }

  get name(): string {
    return this.channel.name;
  }

  appendLine(value: string, logLevel: LogLevel): void {
    this.buffer.push({ value: value, logLevel: logLevel });
    if (this.buffer.length >= maxBufferedLines) {
      this.flush();
    } else {
      this.bufferTimer ??= setInterval(() => this.flush(), this.interval);
    }
  }

  show(preserveFocus?: boolean): void {
    this.channel.show?.(preserveFocus);
  }

  private _emptyCounter = 0;

  private flush() {
    if (this.buffer.length) {
      this._emptyCounter = 0;

      for (const { value, logLevel } of this.buffer) {
        this.outputToChannel(value, logLevel);
      }
      this.buffer.length = 0;
    } else {
      this._emptyCounter++;
      if (this._emptyCounter > 10) {
        clearInterval(this.bufferTimer);
        this.bufferTimer = undefined;
        this._emptyCounter = 0;
      }
    }
  }
  private outputToChannel(value: string, logLevel: LogLevel): void {
    switch (logLevel) {
      case 'debug':
        if (this.channel.debug) {
          this.channel.debug(value);
        } else {
          this.channel.append(value);
        }
        break;
      case 'warn':
        if (this.channel.warn) {
          this.channel.warn(value);
        } else {
          this.channel.append(value);
        }
        break;
      case 'error':
        if (this.channel.error) {
          this.channel.error(value);
        } else {
          this.channel.append(value);
        }
        break;
      default:
        this.channel.append(value);
        break;
    }
  }
}

function toOrderedLevel(logLevel: LogLevel): OrderedLevel {
  switch (logLevel) {
    case 'off':
      return OrderedLevel.Off;
    case 'error':
      return OrderedLevel.Error;
    case 'warn':
      return OrderedLevel.Warn;
    case 'info':
      return OrderedLevel.Info;
    case 'debug':
      return OrderedLevel.Debug;
    default:
      return OrderedLevel.Off;
  }
}

export const customLoggableNameFns = new WeakMap<object, (instance: any, name: string) => string>();

export function getLoggableName(instance: object): string {
  let ctor;
  if (typeof instance === 'function') {
    ctor = instance.prototype?.constructor;
    if (ctor == null) return instance.name;
  } else {
    ctor = instance.constructor;
  }

  let name: string = ctor?.name ?? '';
  // 去除 webpack 模块名称（因为我从不在类名中使用下划线）
  const index = name.indexOf('_');
  if (index !== -1) {
    name = name.substring(index + 1);
  }

  const customNameFn = customLoggableNameFns.get(ctor);
  return customNameFn?.(instance, name) ?? name;
}

export interface LogProvider {
  enabled(logLevel: LogLevel): boolean;
  log(logLevel: LogLevel, scope: LogScope | undefined, message: string, ...params: any[]): void;
}

export const defaultLogProvider: LogProvider = {
  enabled: (logLevel: LogLevel) => Logger.enabled(logLevel) || Logger.isDebugging,
  log: (logLevel: LogLevel, scope: LogScope | undefined, message: string, ...params: any[]) => {
    switch (logLevel) {
      case 'error':
        Logger.error(undefined, scope, message, ...params);
        break;
      case 'warn':
        Logger.warn(scope, message, ...params);
        break;
      case 'info':
        Logger.log(scope, message, ...params);
        break;
      default:
        Logger.debug(scope, message, ...params);
        break;
    }
  }
};
