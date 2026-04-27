/*global document*/
import type { Disposable } from '../browser/events';
export namespace DOM {
  export function on<K extends keyof WindowEventMap>(
    window: Window,
    name: K,
    listener: (e: WindowEventMap[K], target: Window) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable;
  export function on<K extends keyof DocumentEventMap>(
    document: Document,
    name: K,
    listener: (e: DocumentEventMap[K], target: Document) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable;
  export function on<T extends HTMLElement, K extends keyof DocumentEventMap>(
    element: T,
    name: K,
    listener: (e: DocumentEventMap[K] & { target: HTMLElement | null }, target: T) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable;
  export function on<T extends HTMLElement, K>(
    element: T,
    name: string,
    listener: (e: CustomEvent<K> & { target: HTMLElement | null }, target: T) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable;
  export function on<T extends Element, K extends keyof DocumentEventMap>(
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    selector: string,
    name: K,
    listener: (e: DocumentEventMap[K] & { target: HTMLElement | null }, target: T) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable;
  export function on<T extends HTMLElement, K>(
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    selector: string,
    name: string,
    listener: (e: CustomEvent<K> & { target: HTMLElement | null }, target: T) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable;
  export function on<K extends keyof (DocumentEventMap | WindowEventMap), T extends Document | Element | Window>(
    sourceOrSelector: string | Window | Document | Element,
    name: K,
    listener: (e: (DocumentEventMap | WindowEventMap)[K] | CustomEvent<K>, target: T) => void,
    options?: boolean | AddEventListenerOptions
  ): Disposable {
    let disposed = false;

    if (typeof sourceOrSelector === 'string') {
      const filteredListener = function (this: T, e: (DocumentEventMap | WindowEventMap)[K]) {
        const target = (e?.target as HTMLElement)?.closest(sourceOrSelector) as unknown as T | null | undefined;
        if (target == null) return;

        listener(e, target);
      };
      document.addEventListener(name, filteredListener as EventListener, options ?? true);

      return {
        dispose: () => {
          if (disposed) return;
          disposed = true;

          document.removeEventListener(name, filteredListener as EventListener, options ?? true);
        }
      };
    }

    const newListener = function (this: T, e: (DocumentEventMap | WindowEventMap)[K]) {
      listener(e, this as unknown as T);
    };
    sourceOrSelector.addEventListener(name, newListener as EventListener, options ?? false);
    return {
      dispose: () => {
        if (disposed) return;
        disposed = true;

        sourceOrSelector.removeEventListener(name, newListener as EventListener, options ?? false);
      }
    };
  }
}

/** 解析 CSS 的持续时间字符串并返回毫秒数。*/
export function parseDuration(delay: number | string): number {
  delay = delay.toString().toLowerCase();

  if (delay.includes('ms')) {
    return parseFloat(delay);
  }

  if (delay.includes('s')) {
    return parseFloat(delay) * 1000;
  }

  return parseFloat(delay);
}

/** 等待元素发出特定事件。忽略从子元素冒泡上来的事件。 */
export function waitForEvent(el: HTMLElement, eventName: string): Promise<void> {
  return new Promise<void>((resolve) => {
    function done(event: Event) {
      if (event.target === el) {
        el.removeEventListener(eventName, done);
        resolve();
      }
    }

    el.addEventListener(eventName, done);
  });
}

/**
 * 只读蒙版
 */
export function createReadonlyDiv(readonly: boolean = false, callback?: () => void): void {
  const className = 'readonly-mask';
  const hasDiv = document.querySelector(`.${className}`);
  if (!readonly) {
    if (hasDiv) {
      document.body.removeChild(hasDiv);
      callback?.();
    }
    return;
  }
  if (!hasDiv) {
    const div = document.createElement('div');
    div.className = className;
    div.style.backgroundColor = 'var(--el-mask-color)';
    div.style.transition = 'opacity 0.2s';
    div.style.cursor = 'not-allowed';
    div.style.position = 'absolute';
    div.style.opacity = '0.2';
    div.style.bottom = '0';
    div.style.left = '0';
    div.style.right = '0';
    div.style.top = '0';
    div.style.zIndex = '9999';
    div.style.margin = '0';
    document.body.appendChild(div);
  }
}
