/**
 * IPC (进程间通信) 模块
 *
 * 这个文件实现了 Webview 与 VS Code 扩展主进程之间的双向通信机制，包含：
 * 1. HostIpcApi 接口 - VS Code 提供的基础 API
 * 2. HostIpc 类 - 封装的高级 IPC 通信客户端
 * 3. Promise 序列化/反序列化机制
 * 4. 消息队列和超时处理
 * 5. 状态持久化功能
 *
 * 特点：
 * - 支持命令发送和请求/响应模式
 * - 自动处理 Promise 的序列化传输
 * - 支持消息压缩(Uint8Array)
 * - 提供状态持久化机制
 * - 自动超时和错误处理
 */

/*global window */
import { getScopedCounter } from '@orientais/vscode-core';

import { DOM } from './dom';
import type { Disposable, Event } from './events';
import { Emitter } from './events';
import {
  IpcCallParamsType,
  IpcCallResponseParamsType,
  IpcCommand,
  IpcMessage,
  ipcPromiseSettled,
  IpcRequest,
  isIpcPromise
} from '@orientais/vscode-core';

/**
 * VS Code Webview 主机 API 接口
 * 这是 VS Code 提供给 webview 的基础通信接口
 */
export interface HostIpcApi {
  /**
   * 向扩展主进程发送消息
   * @param msg 要发送的消息对象
   */
  postMessage(msg: unknown): void;

  /**
   * 设置 webview 的持久化状态
   * @param state 要保存的状态对象
   */
  setState(state: unknown): void;

  /**
   * 获取 webview 的持久化状态
   * @returns 之前保存的状态对象
   */
  getState(): unknown;
}

/**
 * VS Code 提供的全局函数，用于获取 webview API
 * 这个函数只能在 VS Code webview 环境中调用
 */
declare function acquireVsCodeApi(): HostIpcApi;

/** 缓存的 API 实例 */
let _api: HostIpcApi | undefined;

/**
 * 获取 VS Code Webview API 实例
 * 使用单例模式确保只调用一次 acquireVsCodeApi()
 *
 * @returns HostIpcApi 实例
 */
export function getHostIpcApi(): HostIpcApi {
  // if (typeof window !== 'undefined' && (window as any).acquireVsCodeApi) {
  //   return (window as any).acquireVsCodeApi() as HostIpcApi;(_api ??= typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined);
  // }
  return (_api ??=
    typeof acquireVsCodeApi === 'function'
      ? acquireVsCodeApi()
      : ({
          postMessage: () => {},
          setState: () => {},
          getState: () => {}
        } satisfies HostIpcApi));
}

/** IPC 消息序列号生成器 */
const ipcSequencer = getScopedCounter();

/**
 * 生成下一个唯一的 IPC 消息 ID
 *
 * @returns 格式为 "webview:序号" 的唯一标识符
 */
function nextIpcId() {
  return `webview:${ipcSequencer.next()}`;
}

/**
 * 待处理消息的处理函数类型
 */
type PendingHandler = (msg: IpcMessage) => void;

/**
 * Webview 端的 IPC 通信客户端
 *
 * 提供了与 VS Code 扩展主进程通信的高级接口，支持：
 * - 命令发送（单向通信）
 * - 请求/响应（双向通信）
 * - Promise 的序列化传输
 * - 状态持久化
 * - 自动错误处理和超时
 */
export class HostIpc implements Disposable {
  /** 接收消息的事件发射器 */
  private _onReceiveMessage = new Emitter<IpcMessage>();

  /**
   * 接收消息事件
   * 当收到来自扩展主进程的消息时触发
   */
  get onReceiveMessage(): Event<IpcMessage> {
    return this._onReceiveMessage.event;
  }

  /** VS Code API 实例 */
  private readonly _api: HostIpcApi;

  /** 消息监听器的释放器 */
  private readonly _disposable: Disposable;

  /** 待处理的响应处理器映射 (方法名|ID -> 处理函数) */
  private _pendingHandlers = new Map<string, PendingHandler>();

  /** 文本解码器，用于解压缩消息 */
  private _textDecoder: TextDecoder | undefined;

  /**
   * 创建 IPC 客户端实例
   *
   * @param appName 应用名称，用于日志标识
   */
  constructor(private readonly appName: string) {
    this._api = getHostIpcApi();

    // 监听来自主进程的消息
    this._disposable = DOM.on(window, 'message', (e) => this.onMessageReceived(e));
  }

  /**
   * 释放资源
   * 取消消息监听器
   */
  dispose(): void {
    this._disposable.dispose();
  }

  /**
   * 处理接收到的消息
   *
   * @param e 消息事件
   */
  private onMessageReceived(e: MessageEvent) {
    const msg = e.data as IpcMessage;
    // 如果消息被压缩，先解压缩
    if (msg.packed && msg.params instanceof Uint8Array) {
      this._textDecoder ??= new TextDecoder();
      msg.params = JSON.parse(this._textDecoder.decode(msg.params));
    }
    // 将 IPC Promise 对象还原为真正的 Promise
    this.replaceIpcPromisesWithPromises(msg.params);

    // 如果有 completionId，说明这是对请求的响应，直接交给对应的处理器
    if (msg.completionId != null) {
      const queueKey = getQueueKey(msg.method, msg.completionId);
      this._pendingHandlers.get(queueKey)?.(msg);
      return;
    }
    // 否则作为普通消息触发事件
    this._onReceiveMessage.fire(msg);
  }

  /**
   * 递归地将数据中的 IPC Promise 对象替换为真正的 Promise
   *
   * IPC Promise 是序列化后的 Promise 表示形式，包含方法名和 ID，
   * 需要在接收端还原为可以 await 的 Promise 对象
   *
   * @param data 要处理的数据对象
   */
  replaceIpcPromisesWithPromises(data: unknown): void {
    if (data == null || typeof data !== 'object') return;
    for (const key in data) {
      const value = (data as Record<string, unknown>)[key];
      if (isIpcPromise(value)) {
        // 将 IPC Promise 替换为真正的 Promise
        (data as Record<string, unknown>)[key] = this.getResponsePromise(value.method, value.id);
      } else {
        // 递归处理嵌套对象
        this.replaceIpcPromisesWithPromises(value);
      }
    }
  }

  /**
   * 发送命令（单向通信，无返回值）
   *
   * @param commandType 命令类型定义
   * @param params 命令参数（可选）
   */
  sendCommand<T extends IpcCommand>(commandType: T, params?: never): void;
  sendCommand<T extends IpcCommand<unknown>>(commandType: T, params: IpcCallParamsType<T>): void;
  sendCommand<T extends IpcCommand | IpcCommand<unknown>>(commandType: T, params?: IpcCallParamsType<T>): void {
    const id = nextIpcId();
    // this.log(`${this.appName}.sendCommand(${id}): name=${command.method}`);

    this.postMessage({
      id: id,
      scope: commandType.scope,
      method: commandType.method,
      params: params
    } satisfies IpcMessage<IpcCallParamsType<T>>);
  }

  /**
   * 发送请求（双向通信，等待响应）
   *
   * @param requestType 请求类型定义
   * @param params 请求参数
   * @returns Promise，解析为响应数据
   */
  async sendRequest<T extends IpcRequest<unknown, unknown>>(
    requestType: T,
    params: IpcCallParamsType<T>
  ): Promise<IpcCallResponseParamsType<T>> {
    const id = nextIpcId();

    const promise = this.getResponsePromise(requestType.response.method, id);
    this.postMessage({
      id: id,
      scope: requestType.scope,
      method: requestType.method,
      params: params,
      completionId: id
    } satisfies IpcMessage<IpcCallParamsType<T>>);

    return promise;
  }

  /**
   * 创建等待响应的 Promise
   *
   * @param method 期待的响应方法名
   * @param id 请求 ID
   * @returns Promise，在收到对应响应时解析
   */
  private getResponsePromise<T extends IpcRequest<unknown, unknown>>(method: string, id: string) {
    const promise = new Promise<IpcCallResponseParamsType<T>>((resolve, reject) => {
      const queueKey = getQueueKey(method, id);
      let timeout: ReturnType<typeof setTimeout> | undefined;

      /**
       * 清理函数：清除超时定时器和待处理的处理器
       */
      function dispose(this: HostIpc) {
        clearTimeout(timeout);
        timeout = undefined;
        this._pendingHandlers.delete(queueKey);
      }

      // 设置超时处理（500ms 后超时）
      timeout = setTimeout(
        () => {
          dispose.call(this);
          reject(new Error(`Timed out waiting for completion of ${queueKey}`));
        },
        5 * 60 * 1000
      );

      // 注册响应处理器
      this._pendingHandlers.set(queueKey, (msg) => {
        dispose.call(this);

        // 处理 Promise settled 消息（用于传输 Promise 结果）
        if (msg.method === ipcPromiseSettled.method) {
          const params = msg.params as PromiseSettledResult<unknown>;
          if (params.status === 'rejected') {
            queueMicrotask(() => reject(new Error(params.reason)));
          } else {
            queueMicrotask(() => resolve(params.value));
          }
        } else {
          // 普通响应消息
          queueMicrotask(() => resolve(msg.params));
        }
      });
    });
    return promise;
  }

  /**
   * 设置持久化状态
   *
   * 状态会在 webview 重新加载时保持，由 VS Code 自动管理
   *
   * @param state 要保存的状态对象
   */
  setPersistedState<T>(state: Partial<T>): void {
    this._api.setState(state);
  }

  /**
   * 更新持久化状态
   *
   * 将新的状态与现有状态合并后保存
   *
   * @param update 要更新的状态字段
   */
  updatePersistedState<T>(update: Partial<T>): void {
    let state = this._api.getState() as Partial<T> | undefined;
    if (state != null && typeof state === 'object') {
      state = { ...state, ...update };
      this._api.setState(state);
    } else {
      state = update;
    }
    this.setPersistedState(state);
  }

  getPersistedState<T>(): Partial<T> | undefined {
    return this._api.getState() as Partial<T> | undefined;
  }

  /**
   * 发送消息到主进程
   *
   * @param e 要发送的 IPC 消息
   */
  private postMessage(e: IpcMessage) {
    this._api.postMessage(e);
  }
}

/**
 * 生成队列键
 *
 * 用于在待处理处理器映射中唯一标识一个请求/响应对
 *
 * @param method 方法名
 * @param id 消息 ID
 * @returns 格式为 "方法名|ID" 的唯一键
 */
function getQueueKey(method: string, id: string) {
  return `${method}|${id}`;
}
