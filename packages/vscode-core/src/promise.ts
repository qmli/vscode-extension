/**
 * Promise 工具模块
 * 提供 Promise 的扩展能力：竞态、批处理、可取消、超时、延迟、计时等
 */
import { Logger } from './logger';
import type { CancellationToken, Disposable } from 'vscode';
import { map } from './iterable';

/** 将类型 T 的所有属性变为可写（去除 readonly） */
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/** 表示可能是 Promise 或同步值 */
export type PromiseOrValue<T> = Promise<T> | T;

/**
 * 类似 Promise.any：多个 Promise 中任意一个成功即 resolve，全部失败才 reject
 * @param promises 多个 Promise
 * @returns 第一个成功的结果，或 AggregateError（全部失败时）
 */
export function any<T>(...promises: Promise<T>[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onFullfilled = (r: T) => {
      settled = true;
      resolve(r);
    };

    let errors: Error[];
    const onRejected = (ex: unknown) => {
      if (settled) return;
      if (!(ex instanceof Error)) {
        console.error('any 错误', ex);
        Logger.error(ex);
        return;
      }

      if (errors == null) {
        errors = [ex];
      } else {
        errors.push(ex);
      }

      if (promises.length - errors.length < 1) {
        reject(new AggregateError(errors));
      }
    };

    for (const promise of promises) {
      promise.then(onFullfilled, onRejected);
    }
  });
}

/**
 * 异步迭代每个 Promise 的 settled 结果（按完成顺序 yield，非按传入顺序）
 * @param promises Promise 数组
 * @yields 每个 Promise 的 fulfilled 或 rejected 结果
 */
export async function* asSettled<T>(promises: Promise<T>[]): AsyncIterable<PromiseSettledResult<T>> {
  const map = new Map(
    promises.map(
      (promise, i) =>
        [
          i,
          promise.then(
            (v) =>
              ({ index: i, value: v, status: 'fulfilled' }) as unknown as PromiseFulfilledResult<T> & {
                index: number;
              },
            (ex: unknown) =>
              ({ index: i, reason: ex, status: 'rejected' }) as unknown as PromiseRejectedResult & {
                index: number;
              }
          )
        ] as const
    )
  );

  while (map.size) {
    const result = await Promise.race(map.values());
    map.delete(result.index);
    yield result;
  }
}

/**
 * 按批次执行任务，每批并发执行，批与批之间串行
 * @param items 待处理项数组
 * @param batchSize 每批数量
 * @param task 对每个 item 执行的异步任务（无返回值）
 */
export async function batch<T>(items: T[], batchSize: number, task: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.allSettled(batch.map((item) => task(item)));
  }
}

/**
 * 按批次执行任务并收集每个任务的 settled 结果
 * @param items 待处理项数组
 * @param batchSize 每批数量
 * @param task 对每个 item 执行的异步任务，返回 R
 * @returns 所有任务的 PromiseSettledResult 数组
 */
export async function batchResults<T, R>(
  items: T[],
  batchSize: number,
  task: (item: T) => Promise<R>
): Promise<PromiseSettledResult<Awaited<R>>[]> {
  const results: PromiseSettledResult<Awaited<R>>[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    results.push(...(await Promise.allSettled(batch.map((item) => task(item)))));
  }

  return results;
}

/** 表示 Promise 被取消或超时时抛出的错误 */
export class PromiseCancelledError<T extends Promise<any> = Promise<any>> extends Error {
  constructor(
    public readonly promise: T,
    message: string
  ) {
    super(message);
  }
}

/**
 * 为 Promise 增加取消或超时能力
 * @param promise 原始 Promise
 * @param timeout 超时时间（毫秒）或用作超时的 CancellationToken
 * @param cancellation 取消令牌，触发时 reject
 * @param options.cancelMessage 取消/超时时错误信息
 * @param options.onDidCancel 取消或超时时的回调，可自定义 resolve/reject
 * @returns 支持取消和超时的 Promise
 */
export function cancellable<T>(
  promise: Promise<T>,
  timeout?: number | CancellationToken,
  cancellation?: CancellationToken,
  options?: {
    cancelMessage?: string;
    onDidCancel?(
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
      reason: 'cancelled' | 'timedout'
    ): void;
  }
): Promise<T> {
  if (timeout == null && cancellation == null) return promise;

  return new Promise((resolve, reject) => {
    let fulfilled = false;
    let disposeCancellation: Disposable | undefined;
    let disposeTimeout: Disposable | undefined;

    const resolver = (reason: 'cancelled' | 'timedout') => {
      disposeCancellation?.dispose();
      disposeTimeout?.dispose();

      if (fulfilled) return;

      if (options?.onDidCancel != null) {
        options.onDidCancel(resolve, reject, reason);
      } else {
        reject(
          new PromiseCancelledError(
            promise,
            options?.cancelMessage ?? (reason === 'cancelled' ? 'CANCELLED' : 'TIMED OUT')
          )
        );
      }
    };

    disposeCancellation = cancellation?.onCancellationRequested(() => resolver('cancelled'));
    if (timeout != null) {
      if (typeof timeout === 'number') {
        const timer = setTimeout(() => resolver('timedout'), timeout);
        disposeTimeout = { dispose: () => clearTimeout(timer) };
      } else {
        disposeTimeout = timeout.onCancellationRequested(() => resolver('timedout'));
      }
    }

    promise.then(
      () => {
        fulfilled = true;
        disposeCancellation?.dispose();
        disposeTimeout?.dispose();

        resolve(promise);
      },
      (ex: unknown) => {
        fulfilled = true;
        disposeCancellation?.dispose();
        disposeTimeout?.dispose();

        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(ex);
      }
    );
  });
}

/** 可手动完成或取消的延迟 Promise */
export interface Deferred<T> {
  /** 是否尚未完成/取消 */
  readonly pending: boolean;
  /** 对应的 Promise */
  readonly promise: Promise<T>;
  /** 用给定值完成 */
  fulfill: (value: T) => void;
  /** 取消并可选传入错误 */
  cancel(e?: Error): void;
}

/**
 * 创建一个可手动 resolve 或 cancel 的 Deferred
 * @returns Deferred 实例
 */
export function defer<T>(): Deferred<T> {
  const deferred: Mutable<Deferred<T>> = {
    pending: true,
    promise: undefined!,
    fulfill: undefined!,
    cancel: undefined!
  };
  deferred.promise = new Promise((resolve, reject) => {
    deferred.fulfill = function (value) {
      deferred.pending = false;
      resolve(value);
    };
    deferred.cancel = function (e?: Error) {
      deferred.pending = false;
      if (e != null) {
        reject(e);
      } else {
        reject();
      }
    };
  });

  return deferred;
}

/**
 * 仅当 Deferred 仍处于 pending 时返回其 promise，否则返回 undefined
 */
export function getDeferredPromiseIfPending<T>(deferred: Deferred<T> | undefined): Promise<T> | undefined {
  return deferred?.pending ? deferred.promise : undefined;
}

/** 从 settled 结果中取出成功值，失败或 undefined 时返回默认值（若提供） */
export function getSettledValue<T>(promise: PromiseSettledResult<T> | undefined): T | undefined;
export function getSettledValue<T>(
  promise: PromiseSettledResult<T> | undefined,
  defaultValue: NonNullable<T>
): NonNullable<T>;
export function getSettledValue<T>(
  promise: PromiseSettledResult<T> | undefined,
  defaultValue: T | undefined = undefined
): T | typeof defaultValue {
  return promise?.status === 'fulfilled' ? promise.value : defaultValue;
}

/** 从多个 settled 结果中取出所有成功值，过滤掉 rejected 和 null/undefined */
export function getSettledValues<T extends string | number | boolean | symbol | bigint | object>(
  promises: readonly PromiseSettledResult<T>[]
): T[] {
  return promises.map(getSettledValue).filter((v): v is T => v != null);
}

/** 判断是否为 Promise 或 thenable */
export function isPromise<T>(obj: PromiseLike<T> | T): obj is Promise<T> {
  return obj != null && (obj instanceof Promise || typeof (obj as PromiseLike<T>)?.then === 'function');
}

/** 因取消或超时而暂停时的结果：value 为未完成的 Promise */
type PausedResult<T> = {
  value: Promise<T>;
  paused: true;
  reason: 'cancelled' | 'timedout';
};

/** 正常完成时的结果 */
export type CompletedResult<T> = {
  value: T;
  paused: false;
};

/** 可能是完成或暂停（取消/超时）的结果 */
export type MaybePausedResult<T> = PausedResult<T> | CompletedResult<T>;

/**
 * 在取消或超时时不直接 reject，而是返回「暂停」结果，便于后续继续等待
 * 无 cancellation/timeout 时等价于普通 then，返回 CompletedResult
 * @param promise 原始值或 Promise
 * @param cancellation 取消令牌
 * @param timeout 超时时间（毫秒）或 AbortSignal
 * @param continuation 暂停时的回调（如取消/超时）
 */
export function pauseOnCancelOrTimeout<T>(
  promise: T | Promise<T>,
  cancellation?: undefined,
  timeout?: undefined
): Promise<CompletedResult<T>>;
export function pauseOnCancelOrTimeout<T>(
  promise: T | Promise<T>,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<T>) => void | Promise<void>
): Promise<MaybePausedResult<T>>;
export function pauseOnCancelOrTimeout<T>(
  promise: T | Promise<T>,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<T>) => void | Promise<void>
): Promise<MaybePausedResult<T>> {
  if (!isPromise(promise)) {
    return Promise.resolve({ value: promise, paused: false } satisfies MaybePausedResult<T>);
  }

  if (cancellation == null && timeout == null) {
    return promise.then((value) => ({ value: value, paused: false }) satisfies CompletedResult<T>);
  }

  let disposeCancellation: Disposable | undefined;
  let disposeTimeout: Disposable | undefined;

  const result = Promise.race([
    promise.then((value) => {
      disposeCancellation?.dispose();
      disposeTimeout?.dispose();

      if (cancellation?.isCancellationRequested) {
        return {
          value: Promise.resolve(value),
          paused: true,
          reason: 'cancelled'
        } satisfies MaybePausedResult<T>;
      }

      return { value: value, paused: false } satisfies MaybePausedResult<T>;
    }),
    new Promise<MaybePausedResult<T>>((resolve) => {
      const resolver = (reason: 'cancelled' | 'timedout') => {
        disposeCancellation?.dispose();
        disposeTimeout?.dispose();

        resolve({
          value: promise,
          paused: true,
          reason: reason
        } satisfies MaybePausedResult<T>);
      };

      disposeCancellation = cancellation?.onCancellationRequested(() => resolver('cancelled'));
      if (timeout != null) {
        const signal = typeof timeout === 'number' ? AbortSignal.timeout(timeout) : timeout;

        const handler = () => resolver('timedout');
        signal.addEventListener('abort', handler);
        disposeTimeout = { dispose: () => signal.removeEventListener('abort', handler) };
      }
    })
  ]);

  return continuation == null
    ? result
    : result.then((r) => {
        if (r.paused) {
          setTimeout(() => continuation(r), 0);
        }
        return r;
      });
}

/**
 * 对 Map<Id, Promise<T>> 中每个 Promise 做 pauseOnCancelOrTimeout，返回 Map<Id, MaybePausedResult>
 * @param source Id -> Promise 的 Map
 * @param ignoreErrors 为 true 时忽略错误，将 rejection 转为 undefined
 * @param cancellation 取消令牌
 * @param timeout 超时
 * @param continuation 有任一暂停时的回调
 */
export async function pauseOnCancelOrTimeoutMap<Id, T>(
  source: Map<Id, Promise<T>>,
  ignoreErrors: true,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<Map<Id, CompletedResult<T | undefined>>>) => void | Promise<void>
): Promise<Map<Id, MaybePausedResult<T | undefined>>>;
export async function pauseOnCancelOrTimeoutMap<Id, T>(
  source: Map<Id, Promise<T>>,
  ignoreErrors?: boolean,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<Map<Id, CompletedResult<T | undefined | Error>>>) => void | Promise<void>
): Promise<Map<Id, MaybePausedResult<T | undefined | Error>>>;
export async function pauseOnCancelOrTimeoutMap<Id, T>(
  source: Map<Id, Promise<T>>,
  ignoreErrors?: boolean,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<Map<Id, CompletedResult<T | undefined | Error>>>) => void | Promise<void>
): Promise<Map<Id, MaybePausedResult<T | undefined | Error>>> {
  if (source.size === 0) return source as unknown as Map<Id, MaybePausedResult<T | undefined | Error>>;

  // 如果 timeout 是数字，则将其转换为 AbortSignal，以避免创建大量定时器
  if (timeout != null && typeof timeout === 'number') {
    timeout = AbortSignal.timeout(timeout);
  }

  const results = await Promise.all(
    map(source, ([id, promise]) =>
      pauseOnCancelOrTimeout(
        promise.catch((ex: unknown) => (ignoreErrors || !(ex instanceof Error) ? undefined : ex)),
        cancellation,
        timeout
      ).then((result) => [id, result] as const)
    )
  );

  if (continuation != null) {
    if (results.some(([, r]) => r.paused)) {
      async function getContinuationValue() {
        const completed = new Map<Id, CompletedResult<T | undefined | Error>>();

        for (const [id, result] of results) {
          completed.set(id, { value: result.paused ? await result.value : result.value, paused: false });
        }

        return completed;
      }

      const cancelled = results.some(([, r]) => r.paused && r.reason === 'cancelled');

      void continuation({
        value: getContinuationValue(),
        paused: true,
        reason: cancelled ? 'cancelled' : 'timedout'
      });
    }
  }

  return new Map<Id, MaybePausedResult<T | undefined | Error>>(results);
}

/**
 * 先等待 source（Promise<Map>）完成，再对 Map 中每个 Promise 做 pauseOnCancelOrTimeout
 * @param source 返回 Map<Id, Promise<T>> 的 Promise
 * @param ignoreErrors 是否忽略错误
 * @param cancellation 取消令牌
 * @param timeout 超时
 * @param continuation 暂停时的回调
 */
export async function pauseOnCancelOrTimeoutMapPromise<Id, T>(
  source: Promise<Map<Id, Promise<T>> | undefined>,
  ignoreErrors: true,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<Map<Id, CompletedResult<T | undefined>>>) => void | Promise<void>
): Promise<MaybePausedResult<Map<Id, MaybePausedResult<T | undefined>> | undefined>>;
export async function pauseOnCancelOrTimeoutMapPromise<Id, T>(
  source: Promise<Map<Id, Promise<T>> | undefined>,
  ignoreErrors?: boolean,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<Map<Id, CompletedResult<T | undefined | Error>>>) => void | Promise<void>
): Promise<MaybePausedResult<Map<Id, MaybePausedResult<T | undefined | Error>> | undefined>>;
export async function pauseOnCancelOrTimeoutMapPromise<Id, T>(
  source: Promise<Map<Id, Promise<T>> | undefined>,
  ignoreErrors?: boolean,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (result: PausedResult<Map<Id, CompletedResult<T | undefined | Error>>>) => void | Promise<void>
): Promise<MaybePausedResult<Map<Id, MaybePausedResult<T | undefined | Error>> | undefined>> {
  // 如果 timeout 是数字，则将其转换为 AbortSignal，以避免创建大量定时器
  if (timeout != null && typeof timeout === 'number') {
    timeout = AbortSignal.timeout(timeout);
  }

  const mapPromise = source.then((m) =>
    m == null ? m : pauseOnCancelOrTimeoutMap(m, ignoreErrors, cancellation, timeout, continuation)
  );

  const result = await pauseOnCancelOrTimeout(source, cancellation, timeout);
  return result.paused
    ? { value: mapPromise, paused: result.paused, reason: result.reason }
    : { value: await mapPromise, paused: false };
}

/**
 * 对 Map 中每个条目的「第一个元素」Promise 做 pauseOnCancelOrTimeout，其余元组元素原样保留
 * 条目格式为 [Promise<T> | undefined, ...U]
 * @param source Map<Id, [Promise<T> | undefined, ...U]>
 * @param cancellation 取消令牌
 * @param timeout 超时
 * @param continuation 暂停时的回调
 */
export async function pauseOnCancelOrTimeoutMapTuple<Id, T, U extends unknown[]>(
  source: Map<Id, [Promise<T> | undefined, ...U]>,
  cancellation?: undefined,
  timeout?: undefined
): Promise<Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]>>;
export async function pauseOnCancelOrTimeoutMapTuple<Id, T, U extends unknown[]>(
  source: Map<Id, [Promise<T> | undefined, ...U]>,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (
    result: PausedResult<Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]>>
  ) => void | Promise<void>
): Promise<Map<Id, readonly [MaybePausedResult<T | undefined> | undefined, ...U]>>;
export async function pauseOnCancelOrTimeoutMapTuple<Id, T, U extends unknown[]>(
  source: Map<Id, [Promise<T> | undefined, ...U]>,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (
    result: PausedResult<Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]>>
  ) => void | Promise<void>
): Promise<Map<Id, readonly [MaybePausedResult<T | undefined> | undefined, ...U]>> {
  if (source.size === 0) {
    return source as unknown as Map<Id, [CompletedResult<T | undefined> | undefined, ...U]>;
  }

  // 如果 timeout 是数字，则将其转换为 AbortSignal，以避免创建大量定时器
  if (timeout != null && typeof timeout === 'number') {
    timeout = AbortSignal.timeout(timeout);
  }

  const results = await Promise.all(
    map(source, ([id, [promise, ...rest]]) =>
      promise == null
        ? ([id, [undefined, ...rest]] as const)
        : pauseOnCancelOrTimeout(
            promise.catch(() => undefined),
            cancellation,
            timeout
          ).then((result) => [id, [result as MaybePausedResult<T | undefined> | undefined, ...rest]] as const)
    )
  );

  if (continuation != null) {
    if (results.some(([, [r]]) => r?.paused ?? false)) {
      async function getContinuationValue() {
        const completed = new Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]>();

        for (const [id, [r, ...rest]] of results) {
          completed.set(id, [{ value: r?.paused ? await r.value : r?.value, paused: false }, ...rest] as const);
        }

        return completed;
      }

      const cancelled = results.some(([, [r]]) => r?.paused && r.reason === 'cancelled');

      void continuation({
        value: getContinuationValue(),
        paused: true,
        reason: cancelled ? 'cancelled' : 'timedout'
      });
    }
  }

  return new Map<Id, readonly [MaybePausedResult<T | undefined> | undefined, ...U]>(results);
}

/**
 * 先等待 source（Promise<Map>），再对 Map 中每个条目的第一个 Promise 做 pauseOnCancelOrTimeout（元组版本）
 * @param source 返回 Map<Id, [Promise<T>?, ...U]> 的 Promise
 * @param cancellation 取消令牌
 * @param timeout 超时
 * @param continuation 暂停时的回调
 */
export async function pauseOnCancelOrTimeoutMapTuplePromise<Id, T, U extends unknown[]>(
  source: Promise<Map<Id, [Promise<T> | undefined, ...U]> | undefined>,
  cancellation?: undefined,
  timeout?: undefined
): Promise<CompletedResult<Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]> | undefined>>;
export async function pauseOnCancelOrTimeoutMapTuplePromise<Id, T, U extends unknown[]>(
  source: Promise<Map<Id, [Promise<T> | undefined, ...U]> | undefined>,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (
    result: PausedResult<Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]>>
  ) => void | Promise<void>
): Promise<MaybePausedResult<Map<Id, readonly [MaybePausedResult<T | undefined> | undefined, ...U]> | undefined>>;
export async function pauseOnCancelOrTimeoutMapTuplePromise<Id, T, U extends unknown[]>(
  source: Promise<Map<Id, [Promise<T> | undefined, ...U]> | undefined>,
  cancellation?: CancellationToken,
  timeout?: number | AbortSignal,
  continuation?: (
    result: PausedResult<Map<Id, readonly [CompletedResult<T | undefined> | undefined, ...U]>>
  ) => void | Promise<void>
): Promise<MaybePausedResult<Map<Id, readonly [MaybePausedResult<T | undefined> | undefined, ...U]> | undefined>> {
  // 如果 timeout 是数字，则将其转换为 AbortSignal，以避免创建大量定时器
  if (timeout != null && typeof timeout === 'number') {
    timeout = AbortSignal.timeout(timeout);
  }

  const mapPromise = source.then((m) =>
    m == null ? m : pauseOnCancelOrTimeoutMapTuple(m, cancellation, timeout, continuation)
  );

  const result = await pauseOnCancelOrTimeout(source, cancellation, timeout);
  return result.paused
    ? { value: mapPromise, paused: result.paused, reason: result.reason }
    : { value: await mapPromise, paused: false };
}

/** 带耗时的结果 */
export type TimedResult<T> = { readonly value: T; readonly duration: number };

/**
 * 执行 Promise 并返回结果与耗时（毫秒）
 */
export async function timed<T>(promise: Promise<T>): Promise<TimedResult<T>> {
  const start = Date.now();
  const value = await promise;
  return { value: value, duration: Date.now() - start };
}

/**
 * 执行 Promise 并计时；若超过 slowThreshold.timeout 会调用 onSlow，但仍等待原 Promise 完成
 * @param promise 原始 Promise
 * @param slowThreshold.timeout 视为「慢」的阈值（毫秒）
 * @param slowThreshold.onSlow 超过阈值时的回调，传入已耗时
 */
export async function timedWithSlowThreshold<T>(
  promise: Promise<T>,
  slowThreshold: { timeout: number; onSlow: (duration: number) => void }
): Promise<TimedResult<T>> {
  const start = Date.now();

  const result = await pauseOnCancelOrTimeout(promise, undefined, slowThreshold.timeout);

  const value = result.paused
    ? await result.value.finally(() => slowThreshold.onSlow(Date.now() - start))
    : result.value;

  return { value: value, duration: Date.now() - start };
}

/** 等待指定毫秒数 */
export function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 等待到下一个微任务（queueMicrotask） */
export function waitUntilNextTick(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

/** 聚合多个错误，常用于 Promise.any 全部失败时 */
export class AggregateError extends Error {
  constructor(readonly errors: Error[]) {
    super(`AggregateError(${errors.length})\n${errors.map((e) => `\t${String(e)}`).join('\n')}`);

    Error.captureStackTrace?.(this, AggregateError);
  }
}
