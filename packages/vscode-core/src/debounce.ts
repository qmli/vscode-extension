// 防抖函数选项接口
export interface DebounceOptions<F extends (...args: unknown[]) => ReturnType<F>> {
  /**
   * 可选的 AbortSignal，用于取消防抖函数
   */
  signal?: AbortSignal;

  /**
   * 指定函数应该在前沿、后沿还是两者上调用
   * 如果设置为 "leading"，函数将在延迟周期开始时调用
   * 如果设置为 "trailing"，函数将在延迟周期结束时调用
   * 如果设置为 "both"，函数将在延迟周期的开始和结束时都调用
   * @default "trailing"
   */
  edges?: 'leading' | 'trailing' | 'both';

  /**
   * 最大等待时间，无论后续调用如何都会强制执行
   * 当指定时，自初始调用以来经过这么长时间后，即使防抖超时尚未完成，也会调用函数
   */
  maxWait?: number;

  /**
   * 可选的函数，用于聚合多次调用的参数
   * 当指定时，不是仅使用最新的参数，而是会调用此函数
   * 将先前和当前的参数传递给防抖函数，以产生新的参数集
   */
  aggregator?: (prevArgs: Parameters<F>, nextArgs: Parameters<F>) => Parameters<F>;
}

// 可延迟函数接口
export interface Deferrable<F extends (...args: any[]) => unknown> {
  (...args: Parameters<F>): ReturnType<F> | undefined;

  /**
   * 取消防抖函数的任何待执行操作
   * 此方法清除活动计时器并重置任何存储的上下文或参数
   */
  cancel: () => void;

  /**
   * 如果有待执行的操作，立即调用防抖函数
   * 此方法还会取消当前计时器，确保函数立即执行
   *
   * @returns 调用函数的结果，如果没有待执行操作则返回 undefined
   */
  flush: () => ReturnType<F> | undefined;

  /**
   * 检查防抖函数是否有待执行的操作
   *
   * @returns {boolean} 如果防抖函数有待执行操作则返回 true，否则返回 false
   */
  pending: () => boolean;
}

/**
 * 创建一个防抖函数，延迟调用提供的函数，直到自上次调用防抖函数以来经过了 `wait` 毫秒
 * 防抖函数还具有 `cancel`、`flush` 和 `pending` 方法来控制其行为
 *
 * @template F - 函数类型
 * @param {F} fn - 要防抖的函数
 * @param {number} wait - 延迟的毫秒数
 * @param {DebounceOptions} options - 选项对象
 * @param {AbortSignal} options.signal - 可选的 AbortSignal，用于取消防抖函数
 * @param {Array<'leading' | 'trailing'>} options.edges - 何时调用防抖函数
 * @param {number} options.maxWait - 强制执行前的最大等待时间
 * @param {Function} options.aggregator - 可选函数，用于聚合多次调用的参数
 * @returns 带有额外控制方法的新防抖函数
 */
export function debounce<F extends (...args: any[]) => ReturnType<F>>(
  fn: F,
  wait: number,
  options?: DebounceOptions<F>
): Deferrable<F> {
  let lastThis: unknown = undefined; // 上次调用时的 this 上下文
  let lastArgs: Parameters<F> | undefined; // 上次调用的参数
  let lastCallTime: number | undefined; // 上次调用的时间戳
  let lastInvokeTime = 0; // 上次实际执行的时间戳

  let result: ReturnType<F> | undefined; // 函数执行结果

  let timer: ReturnType<typeof setTimeout> | undefined; // 防抖计时器
  let maxTimer: ReturnType<typeof setTimeout> | undefined; // 最大等待计时器

  // 解构选项参数
  let edges: DebounceOptions<F>['edges'];
  let maxWait: DebounceOptions<F>['maxWait'];
  let signal: DebounceOptions<F>['signal'];
  let aggregator: DebounceOptions<F>['aggregator'];

  if (options != null) {
    ({ edges, maxWait, signal, aggregator } = options);
  }

  edges ??= 'trailing'; // 默认在尾部触发
  const leading = edges === 'leading' || edges === 'both'; // 是否在前沿触发
  const trailing = edges === 'trailing' || edges === 'both'; // 是否在后沿触发

  // 执行原函数
  function invoke(): ReturnType<F> | undefined {
    if (lastArgs != null) {
      lastInvokeTime = Date.now(); // 更新最后执行时间
      const args = lastArgs;
      const thisArg = lastThis;

      // 清空存储的参数和上下文
      lastThis = undefined;
      lastArgs = undefined;

      // 执行原函数
      result = fn.apply(thisArg, args);
      return result;
    }
    return undefined;
  }

  // 判断是否应该执行函数
  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime ?? 0); // 距离上次调用的时间
    const timeSinceLastInvoke = time - lastInvokeTime; // 距离上次执行的时间

    // 以下情况之一时应该执行：
    // 1. 这是第一次调用
    // 2. 活动已停止且在尾部边缘
    // 3. 系统时间倒退，视为尾部边缘
    // 4. 达到了最大等待限制
    return (
      lastCallTime == null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait != null && timeSinceLastInvoke >= maxWait)
    );
  }

  // 计时器到期处理
  function timerExpired() {
    const time = Date.now();

    // 如果应该执行且在尾部触发，则执行
    if (shouldInvoke(time) && trailing) {
      invoke();
    }

    cancel(); // 清理状态
  }

  // 安排计时器
  function schedule() {
    cancelTimer(); // 取消现有计时器

    const time = Date.now();
    lastCallTime = time;

    // 设置常规防抖计时器
    timer = setTimeout(() => {
      timer = undefined;
      timerExpired();
    }, wait);

    // 如果需要，设置最大等待计时器
    if (maxWait != null && !maxTimer) {
      const timeWaiting = maxWait - (time - lastInvokeTime);

      if (timeWaiting > 0) {
        // 设置最大等待计时器
        maxTimer = setTimeout(() => {
          maxTimer = undefined;
          if (trailing && lastArgs != null) {
            invoke(); // 达到最大等待时间，执行函数
          }
          // 不在这里调用 cancel() - 只重置 maxTimer
          lastInvokeTime = Date.now();
        }, timeWaiting);
      } else {
        // 如果已经超过最大等待时间，立即执行
        if (trailing && lastArgs != null) {
          invoke();
        }
        cancel();
      }
    }
  }

  // 取消防抖计时器
  function cancelTimer() {
    if (timer != null) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  // 取消最大等待计时器
  function cancelMaxTimer() {
    if (maxTimer != null) {
      clearTimeout(maxTimer);
      maxTimer = undefined;
    }
  }

  // 取消所有计时器并重置状态
  function cancel() {
    cancelTimer();
    cancelMaxTimer();

    lastThis = undefined;
    lastArgs = undefined;
    lastCallTime = undefined;
    lastInvokeTime = 0;
  }

  // 立即执行并清理计时器
  function flush(): ReturnType<F> | undefined {
    cancelTimer();
    cancelMaxTimer();
    return invoke();
  }

  // 检查是否有待执行的操作
  function pending(): boolean {
    return timer != null || maxTimer != null;
  }

  // 防抖函数主体
  function debounced(this: any, ...args: Parameters<F>): ReturnType<F> | undefined {
    if (signal?.aborted) return undefined; // 如果信号已中止，直接返回

    const time = Date.now();

    // 如果提供了参数聚合器且有之前的参数，则聚合参数
    if (aggregator != null && lastArgs != null) {
      lastArgs = aggregator(lastArgs, args);
    } else {
      // 保存当前调用的上下文和参数
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastThis = this;
      lastArgs = args;
    }

    const isFirstCall = timer == null && maxTimer == null; // 是否是第一次调用

    lastCallTime = time;
    schedule(); // 安排执行

    // 如果是前沿触发且是第一次调用，立即执行
    if (leading && isFirstCall) {
      return invoke();
    }

    return result; // 返回上次执行的结果
  }

  // 绑定控制方法
  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  // 监听中止信号
  signal?.addEventListener('abort', cancel, { once: true });

  return debounced;
}
