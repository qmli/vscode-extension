import type { IDisposable } from './lifecycle';

export let runWhenIdle: (callback: (idle: IdleDeadline) => void, timeout?: number) => IDisposable;

//#region -- run on idle tricks ------------

export interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

/**
 * An implementation of the "idle-until-urgent"-strategy as introduced
 * here: https://philipwalton.com/articles/idle-until-urgent/
 */
export class IdleValue<T> {
  private readonly _executor: () => void;
  private readonly _handle: IDisposable;

  private _didRun: boolean = false;
  private _value?: T;
  private _error: unknown;

  constructor(executor: () => T) {
    this._executor = () => {
      try {
        this._value = executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._didRun = true;
      }
    };
    this._handle = runWhenIdle(() => this._executor());
  }

  dispose(): void {
    this._handle.dispose();
  }

  get value(): T {
    if (!this._didRun) {
      this._handle.dispose();
      this._executor();
    }
    if (this._error) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw this._error;
    }
    return this._value!;
  }

  get isInitialized(): boolean {
    return this._didRun;
  }
}
