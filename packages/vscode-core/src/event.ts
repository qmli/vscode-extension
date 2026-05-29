/**
 * 事件工具模块
 * 提供对 VSCode Event 的封装：只触发一次、按次数/条件截取、转 Promise、可取消的延迟 Promise、弱引用监听等
 */
import type { Disposable, Event } from 'vscode';
import type { Deferred } from './promise';

/**
 * 将事件包装为「只触发一次」的事件，首次触发后自动取消订阅
 * @param event 原始事件
 * @returns 只触发一次的事件
 */
export function once<T>(event: Event<T>): Event<T> {
  return take<T>(event, 1);
}

/**
 * 只接收事件的前 count 次触发，达到次数后自动取消订阅
 * @param event 原始事件
 * @param count 最多触发的次数
 * @returns 有限次数触发的事件
 */
export function take<T>(event: Event<T>, count: number): Event<T> {
  return (listener: (e: T) => unknown, thisArgs?: unknown) => {
    let i = 0;
    const result = event((e) => {
      if (++i >= count) {
        result.dispose();
      }
      return listener.call(thisArgs, e);
    });

    return result;
  };
}

/**
 * 将事件转为 Promise：在事件首次触发时 resolve，并得到该次的事件值
 * @param event 原始事件
 * @returns 在下次事件触发时 resolve 的 Promise
 */
export function promisify<T>(event: Event<T>): Promise<T> {
  return new Promise<T>((resolve) => once(event)(resolve));
}

/**
 * 监听事件直到 predicate(e) 为 true，此时自动取消订阅
 * @param event 原始事件
 * @param predicate 判断是否停止监听的函数
 * @returns 在满足条件前持续触发的事件
 */
export function takeUntil<T>(event: Event<T>, predicate: (e: T) => boolean): Event<T> {
  return (listener: (e: T) => unknown, thisArgs?: unknown) => {
    const result = event((e) => {
      if (predicate(e)) {
        result.dispose();
      }
      return listener.call(thisArgs, e);
    });

    return result;
  };
}

/** 可取消的延迟事件类型（不含 fulfill，由事件驱动完成） */
export type DeferredEvent<T> = Omit<Deferred<T>, 'fulfill'>;

/** 延迟事件的执行器：收到事件值后通过 resolve/reject 决定 Promise 的完成方式 */
export type DeferredEventExecutor<T, U> = (
  value: T,
  resolve: (value: U | PromiseLike<U>) => void,
  reject: (reason: any) => void
) => any;

/** 默认执行器：直接使用事件值 resolve */
const resolveExecutor = (value: any, resolve: (value?: any) => void) => resolve(value);

/**
 * 返回一个可取消的 Promise，其完成时机由执行器决定（默认为下一次事件触发时 resolve）
 *
 * 若提供 executor，会以 (value, resolve, reject) 形式在每个事件上调用，
 * 直到该执行器内部调用 resolve 或 reject。
 *
 * 默认执行器仅用事件值 resolve。
 *
 * @param event 原始事件
 * @param executor 控制返回 Promise 何时 resolve/reject 的执行器
 * @returns 可取消的延迟 Promise，其完成方式由 executor 决定
 */
export function promisifyDeferred<T, U>(
  event: Event<T>,
  executor: DeferredEventExecutor<T, U> = resolveExecutor
): DeferredEvent<U> {
  let cancel: ((reason?: any) => void) | undefined;
  let disposable: Disposable;

  let pending = true;
  const promise = new Promise<U>((resolve, reject) => {
    cancel = () => {
      pending = false;
      cancel = undefined;
      reject();
    };

    disposable = event(async (value: T) => {
      try {
        await executor(value, resolve, reject);
        pending = false;
      } catch (ex) {
        pending = false;

        reject(ex instanceof Error ? ex : new Error(String(ex)));
      }
    });
  }).then(
    (value: U) => {
      disposable.dispose();
      return value;
    },
    (reason: unknown) => {
      disposable.dispose();
      throw reason;
    }
  );

  return {
    get pending() {
      return pending;
    },
    promise: promise,
    cancel: () => cancel?.()
  };
}

/**
 * 使用弱引用绑定 thisArg 订阅事件：当 thisArg 被 GC 回收时自动取消订阅，避免内存泄漏
 * @param event 原始事件
 * @param listener 事件回调
 * @param thisArg 作为 listener 的 this，且被弱引用持有
 * @param alsoDisposeOnReleaseOrDispose 可选，与本次订阅一并 dispose 的其他 Disposable
 * @returns 可手动 dispose 的订阅对象
 */
export function weakEvent<T, U extends object>(
  event: Event<T>,
  listener: (e: T) => any,
  thisArg: U,
  alsoDisposeOnReleaseOrDispose?: Disposable[]
): Disposable {
  const ref = new WeakRef<U>(thisArg);

  let disposable: Disposable;

  const d = event((e: T) => {
    const obj = ref.deref();
    if (obj != null) {
      listener.call(obj, e);
    } else {
      disposable.dispose();
    }
  });

  if (alsoDisposeOnReleaseOrDispose == null) {
    disposable = d;
  } else {
    disposable = disposableFrom(d, ...alsoDisposeOnReleaseOrDispose);
  }
  return disposable;
}

/** 将多个带 dispose 的对象合并为一个 Disposable，dispose 时依次调用各自的 dispose */
function disposableFrom(...inDisposables: { dispose(): any }[]): Disposable {
  let disposables: ReadonlyArray<{ dispose(): any }> | undefined = inDisposables;
  return {
    dispose: function () {
      if (disposables) {
        for (const disposable of disposables) {
          if (disposable && typeof disposable.dispose === 'function') {
            disposable.dispose();
          }
        }
        disposables = undefined;
      }
    }
  };
}
