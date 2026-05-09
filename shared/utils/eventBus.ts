import type { Disposable, Uri } from 'vscode';
import { EventEmitter } from 'vscode';
import type { ViewIds, WebviewIds } from '../webviews/constants/constants.views';

export type FileSelectedEvent = EventBusEvent;
interface FileSelectedEventArgs {
  readonly uri: Uri;
  readonly preserveFocus?: boolean;
  readonly preserveVisibility?: boolean;
}

/**
 * 编辑器激活事件参数
 */
export interface EditorActiveEventArgs {
  /** 当前编辑的节点 ID（对应树节点） */
  rootId: string;
  /** 应用 ID */
  appId: string;
}

type EventsMapping = {
  'file:selected': FileSelectedEventArgs;
  'editor:active': EditorActiveEventArgs;
};

interface EventBusEvent<T extends keyof EventsMapping = keyof EventsMapping> {
  name: T;
  data: EventsMapping[T];
  source?: EventBusSource | undefined;
}

export type EventBusSource = ViewIds | WebviewIds;

export type EventBusOptions = {
  source?: EventBusSource;
};

type CacheableEventsMapping = {
  'file:selected': FileSelectedEventArgs;
  'editor:active': EditorActiveEventArgs;
};

const _cacheableEventNames = new Set<keyof CacheableEventsMapping>(['file:selected', 'editor:active']);
const _cachedEventArgs = new Map<keyof CacheableEventsMapping, CacheableEventsMapping[keyof CacheableEventsMapping]>();

export class EventBus implements Disposable {
  private readonly _emitter = new EventEmitter<EventBusEvent>();

  dispose(): void {
    this._emitter.dispose();
  }

  /* 同步触发事件
   * 立即调用事件处理程序
   * 注意：如果事件处理程序是异步的，可能会导致意外行为
   * 建议使用 fireAsync 方法，以确保事件在当前调用栈结束后触发
   * 仅在确定事件处理程序是同步时使用此方法
   */
  fire<T extends keyof EventsMapping>(name: T, data: EventsMapping[T], options?: EventBusOptions): void {
    if (canCacheEventArgs(name)) {
      _cachedEventArgs.set(name, data as CacheableEventsMapping[typeof name]);
    }
    this._emitter.fire({
      name: name,
      data: data,
      source: options?.source
    });
  }

  // 异步触发事件
  // 使用 queueMicrotask 确保事件在当前调用栈结束后触发
  // 这有助于避免在同步代码中直接触发事件可能导致的问题
  fireAsync<T extends keyof EventsMapping>(name: T, data: EventsMapping[T], options?: EventBusOptions): void {
    queueMicrotask(() => this.fire(name, data, options));
  }

  // 获取缓存的事件参数
  // 仅当事件名在 _cacheableEventNames 中时才会缓存参数，否则返回 undefined，以减少不必要的缓存开销。
  getCachedEventArgs<T extends keyof CacheableEventsMapping>(name: T): CacheableEventsMapping[T] | undefined {
    return _cachedEventArgs.get(name) as CacheableEventsMapping[T] | undefined;
  }

  // 监听事件
  on<T extends keyof EventsMapping>(name: T, handler: (e: EventBusEvent<T>) => void, thisArgs?: unknown): Disposable {
    return this._emitter.event(
      // eslint-disable-next-line prefer-arrow-callback
      function (e) {
        if (name !== e.name) return;
        handler.call(thisArgs, e as EventBusEvent<T>);
      },
      thisArgs
    );
  }
}

function canCacheEventArgs(name: keyof EventsMapping): name is keyof CacheableEventsMapping {
  return _cacheableEventNames.has(name as keyof CacheableEventsMapping);
}
