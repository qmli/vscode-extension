/** 提供延迟初始化支持 */
export class Lazy<T> {
  private _evaluated: boolean = false;
  get evaluated(): boolean {
    return this._evaluated;
  }

  private _exception: Error | undefined;
  private _value?: T;

  /**
   * 创建一个新的 Lazy<T> 实例，使用指定的初始化函数。
   * @param valueProvider 用于在需要时生成值的初始化函数。
   */
  constructor(private readonly valueProvider: () => T) {}

  /** 获取当前 Lazy<T> 实例的延迟初始化值 */
  get value(): T {
    if (!this._evaluated) {
      try {
        this._value = this.valueProvider();
      } catch (ex) {
        this._exception = ex instanceof Error ? ex : undefined;
        throw ex;
      } finally {
        this._evaluated = true;
      }
    }

    if (this._exception) throw this._exception;

    return this._value!;
  }
}

/** 使用指定的初始化函数创建一个新的延迟值 */
export function lazy<T>(valueProvider: () => T): Lazy<T> {
  return new Lazy<T>(valueProvider);
}
