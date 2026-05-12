/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WebviewHost } from '../webviewHost.js';
import type {
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcCommand,
  IpcMessage,
  IpcRequest
} from '@orientais/shared';

/** 从 IpcCommand 或 IpcRequest 中提取参数类型 */
export type IpcParams<T extends IpcCommand<any> | IpcRequest<any, any>> = IpcCallParamsType<T>;

/** 从 IpcRequest 中提取响应类型 */
export type IpcResponse<T extends IpcRequest<any, any>> = IpcCallResponseParamsType<T>;

/** 按类构造函数存储处理器元数据 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const ipcHandlerRegistry = new WeakMap<Function, Map<string, IpcHandlerEntry>>();

type IpcHandlerType = 'command' | 'request';

/** 每个 @ipc 装饰方法存储的元数据 */
interface IpcHandlerEntry {
  /** 完整的方法字符串（例如 'commitDetails/file/open'） */
  method: string;
  /** 被装饰方法的属性键 */
  propertyKey: string | symbol;
  /** 处理器类型 */
  type: IpcHandlerType;
  /** 对于请求处理器，响应时使用的请求类型 */
  requestType?: IpcRequest<unknown, unknown>;
}

/** 可以被处理的消息类型联合类型 */
type IpcMessageType = IpcCommand<any> | IpcRequest<any, any>;

function registerHandler(
  target: object,
  propertyKey: string | symbol,
  messageType: IpcMessageType,
  type: IpcHandlerType
): void {
  const ctor = target.constructor;
  let handlers = ipcHandlerRegistry.get(ctor);
  if (handlers == null) {
    handlers = new Map();
    ipcHandlerRegistry.set(ctor, handlers);
  }

  handlers.set(messageType.method, {
    method: messageType.method,
    propertyKey: propertyKey,
    type: type,
    requestType: type === 'request' ? (messageType as IpcRequest<unknown, unknown>) : undefined
  });
}

/** 命令处理函数类型 - 接收参数（或无参数时为 void），返回 void */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type CommandHandler<Params> = Params extends void
  ? () => void | Promise<void>
  : (params: Params) => void | Promise<void>;

/** 请求处理函数类型 - 接收参数（或无参数时为 void），返回响应 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type RequestHandler<Params, Response> = Params extends void
  ? () => Response | Promise<Response>
  : (params: Params) => Response | Promise<Response>;

/**
 * 装饰器：为 IPC 命令（即发即弃）注册处理器（接收 `params` 并返回 void）
 */
export function ipcCommand<Params>(
  commandType: IpcCommand<Params>
): <F extends CommandHandler<Params>>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<F>
) => void {
  return function <F extends CommandHandler<Params>>(
    target: object,
    propertyKey: string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _descriptor: TypedPropertyDescriptor<F>
  ): void {
    registerHandler(target, propertyKey, commandType, 'command');
  };
}

/**
 * 装饰器：为 IPC 请求注册处理器（接收 `params` 并返回 `Response`）
 * 会自动调用 `host.respond()` 返回结果
 */
export function ipcRequest<Params, Response>(
  requestType: IpcRequest<Params, Response>
): <F extends RequestHandler<Params, Response>>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<F>
) => void {
  return function <F extends RequestHandler<Params, Response>>(
    target: object,
    propertyKey: string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _descriptor: TypedPropertyDescriptor<F>
  ): void {
    registerHandler(target, propertyKey, requestType, 'request');
  };
}

/**
 * 将 IPC 消息分发到实例上相应的装饰方法。
 *
 * 对于命令（`@ipcCommand`），处理器接收 `params` 并返回 void。
 * 对于请求（`@ipcRequest`），处理器接收 `params` 并返回响应。
 * 分发器会自动调用 `host.respond()` 返回结果。
 *
 * @param host - 用于发送请求响应的 WebviewHost
 * @param instance - 包含处理器的对象实例
 * @param e - 要分发的 IPC 消息
 * @returns 如果找到并调用了处理器返回 true，否则返回 false。
 */
export async function dispatchIpcMessage(host: WebviewHost<any>, instance: object, e: IpcMessage): Promise<boolean> {
  const handlers = ipcHandlerRegistry.get(instance.constructor);
  if (handlers == null) return false;

  const entry = handlers.get(e.method);
  if (entry == null) return false;

  // 从实例获取方法（确保正确的 `this` 绑定）
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const handler = (instance as Record<string | symbol, Function>)[entry.propertyKey];
  if (typeof handler !== 'function') return false;

  switch (entry.type) {
    case 'command':
      // 命令只接收参数
      await handler.call(instance, e.params);
      break;

    case 'request':
      // 请求接收参数，并自动用返回值响应
      if (entry.requestType == null) {
        throw new Error(`@ipcRequest 处理器 "${String(entry.propertyKey)}" 缺少 requestType`);
      }
      // eslint-disable-next-line no-case-declarations
      const result = await handler.call(instance, e.params);
      void host.respond(entry.requestType, e, result);
      break;
  }

  return true;
}

/**
 * 创建一个绑定到特定 host 和实例的分发函数。
 * 当你需要可复用的分发器或自定义编排时很有用。
 */
export function createIpcDispatcher(host: WebviewHost<any>, instance: object): (e: IpcMessage) => Promise<boolean> {
  return (e) => dispatchIpcMessage(host, instance, e);
}
