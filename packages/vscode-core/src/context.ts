import { commands, EventEmitter } from 'vscode';
import type { Event } from 'vscode';

/**
 * 创建一个类型安全的 VS Code context 管理器。
 *
 * 内部维护一份本地缓存（Map），避免重复调用 `setContext` 命令，
 * 并提供 `onDidChangeContext` 事件，供订阅者监听上下文变更。
 *
 * @example
 * ```typescript
 * const ctx = createVSCodeContext<MyContextKeys>();
 * export const { onDidChangeContext, getContext, setContext } = ctx;
 * ```
 */
export function createVSCodeContext<T extends Record<string, unknown>>() {
  const storage = new Map<keyof T, unknown>();
  const _onDidChange = new EventEmitter<keyof T>();

  function getContext<K extends keyof T>(key: K): T[K] | undefined;
  function getContext<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
  function getContext<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] | undefined {
    return (storage.get(key) as T[K] | undefined) ?? defaultValue;
  }

  async function setContext<K extends keyof T>(key: K, value: T[K] | undefined): Promise<void> {
    if (storage.get(key) === value) return;

    if (value == null) {
      storage.delete(key);
    } else {
      storage.set(key, value);
    }
    void (await commands.executeCommand('setContext', key, value ?? undefined));
    _onDidChange.fire(key);
  }

  return {
    onDidChangeContext: _onDidChange.event as Event<keyof T>,
    getContext,
    setContext
  };
}
