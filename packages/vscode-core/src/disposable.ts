import { onceFn } from './index';

export type UnifiedDisposable = { dispose: () => void } & Disposable;
export type UnifiedAsyncDisposable = { dispose: () => Promise<void> } & AsyncDisposable;

export function createDisposable(dispose: () => void, options?: { once?: boolean }): UnifiedDisposable;
export function createDisposable(
  dispose: (() => void) | undefined,
  options?: { once?: boolean }
): UnifiedDisposable | undefined;
export function createDisposable(
  dispose?: (() => void) | undefined,
  options?: { once?: boolean }
): UnifiedDisposable | undefined {
  if (dispose == null) return undefined;
  if (options?.once) {
    dispose = onceFn(dispose);
  }

  return {
    dispose: dispose,
    [Symbol.dispose]: dispose
  };
}

export function createAsyncDisposable(
  dispose: () => Promise<void>,
  options?: { once?: boolean }
): UnifiedAsyncDisposable {
  if (options?.once) {
    dispose = onceFn(dispose);
  }

  return {
    dispose: dispose,
    [Symbol.asyncDispose]: dispose
  };
}

/** Returns the existing object with disposable methods added */
export function mixinDisposable<T extends { dispose: () => void }>(disposable: T): T & UnifiedDisposable;
export function mixinDisposable<T extends { dispose: () => void } | undefined>(
  disposable: T
): (T & UnifiedDisposable) | undefined;
export function mixinDisposable<T extends object & { dispose?: never }>(
  obj: T,
  dispose: () => void
): T & UnifiedDisposable;
export function mixinDisposable<T extends (object & { dispose?: never }) | { dispose: () => void }>(
  obj: T,
  dispose?: () => void
): (T & UnifiedDisposable) | undefined {
  if (obj == null) return undefined;

  const record = obj as Record<string | symbol, unknown>;
  if (dispose != null) {
    record['dispose'] = dispose;
    record[Symbol.dispose] = dispose;
    return obj as T & UnifiedDisposable;
  }

  if ('dispose' in obj && obj.dispose != null) {
    record[Symbol.dispose] = obj.dispose;
    return obj as T & UnifiedDisposable;
  }

  throw new Error('Object does not have a dispose method or a dispose function was not provided');
}

/** 返回已存在对象，并添加异步释放方法 */
export function mixinAsyncDisposable<T extends { dispose: () => Promise<void> }>(
  disposable: T
): T & UnifiedAsyncDisposable;
export function mixinAsyncDisposable<T extends { dispose: () => Promise<void> } | undefined>(
  disposable: T
): (T & UnifiedAsyncDisposable) | undefined;
export function mixinAsyncDisposable<T extends object & { dispose?: never }>(
  obj: T,
  dispose: () => Promise<void>
): T & UnifiedAsyncDisposable;
export function mixinAsyncDisposable<T extends (object & { dispose?: never }) | { dispose: () => Promise<void> }>(
  obj: T,
  dispose?: () => Promise<void>
): (T & UnifiedAsyncDisposable) | undefined {
  if (obj == null) return undefined;

  const record = obj as Record<string | symbol, unknown>;
  if (dispose != null) {
    record['dispose'] = dispose;
    record[Symbol.asyncDispose] = dispose;
    return obj as T & UnifiedAsyncDisposable;
  }

  if ('dispose' in obj && obj.dispose != null) {
    record[Symbol.asyncDispose] = obj.dispose;
    return obj as T & UnifiedAsyncDisposable;
  }

  throw new Error('Object does not have a dispose method or a dispose function was not provided');
}
