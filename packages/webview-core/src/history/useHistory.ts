/**
 * useHistory —— Vue3 Composable
 *
 * 提供：
 *  1. 共享/独立的 History 实例
 *  2. 响应式状态（canUndo / canRedo / undoName / redoName）
 *  3. 键盘快捷键绑定（Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z）
 *  4. 便捷包装方法：record()、trackInput()、trackModel()
 *  5. VSCode 原生撤销/重做集成
 *
 * ─── 使用模式 ────────────────────────────────────────────────────────────────
 *
 * 模式一：全局共享实例（推荐，跨组件共享同一历史）
 *   const { history, state, undo, redo } = useHistory({ shared: true });
 *
 * 模式二：独立实例（每个组件各自管理历史）
 *   const { history, state, undo, redo } = useHistory();
 *
 * 模式三：传入已有实例
 *   const myHistory = new History({ maxHistorySize: 50 });
 *   const { state, undo, redo } = useHistory({ instance: myHistory });
 *
 * 模式四：VSCode 原生撤销/重做集成（配合 CustomEditorProvider）
 *   const { history, state, undo, redo } = useHistory({ vscodeUndoRedo: true });
 *   // 此时 Ctrl+Z / Ctrl+Y 由 VSCode 驱动，通过 IPC 通知触发 history.undo/redo
 */

import { HistoryCommandExecutedCommand, HistoryRedoNotification, HistoryUndoNotification } from '@orientais/shared';
import type { Ref } from 'vue';
import { onMounted, onUnmounted, readonly, toRef } from 'vue';
import { useWebviewIPC } from '../composables/useWebview';
import { SetValueCommand } from './commands/SetValueCommand';
import { History } from './History';
import type { HCommand, HistoryOptions } from './types';

// ─── 全局共享实例 ─────────────────────────────────────────────────────────────

let _sharedInstance: History | null = null;

function getSharedHistory(options?: HistoryOptions): History {
  if (!_sharedInstance) {
    _sharedInstance = new History(options);
  }
  return _sharedInstance;
}

/** 销毁共享实例（通常用于测试或应用卸载时）。 */
export function destroySharedHistory(): void {
  _sharedInstance = null;
}

// ─── 全局监听去重（按 History 实例引用计数）─────────────────────────────────────
//
// 共享实例场景下多个组件指向同一个 History，若各自绑定 keydown / IPC 监听，
// 一次按键或一次 VSCode 通知会触发多次 undo/redo（串行队列不丢弃，导致一次操作
// 撤销多步）。这里按 History 实例做引用计数，保证全局监听只绑定一次，
// 最后一个使用者卸载时才解绑。

interface GlobalBinding {
  count: number;
  teardown: () => void;
}

const _globalBindings = new WeakMap<History, GlobalBinding>();

/** 处理撤销/重做快捷键。统一小写比较，避免 Shift 时 e.key 为大写导致 Ctrl+Shift+Z 失效。 */
function handleHistoryKey(e: KeyboardEvent, history: History): void {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  const key = e.key.toLowerCase();
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault();
    void history.undo();
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    e.preventDefault();
    void history.redo();
  }
}

/**
 * 绑定 VSCode 原生撤销/重做集成，成功返回解绑函数，IPC 不可用时返回 undefined。
 *
 * 双向打通：
 *  1. 监听 `HistoryUndoNotification` / `HistoryRedoNotification`，由 VSCode（Ctrl+Z / Ctrl+Y
 *     或 Edit 菜单）驱动 webview 的 `history.undo / redo`。
 *  2. 监听 History 的 `execute` 事件，每**新建**一条命令（合并更新除外）就发送
 *     `HistoryCommandExecutedCommand`，让扩展侧为其注册一个 VSCode 原生撤销栈条目。
 *
 * 第 2 点是必需的：否则 VSCode 撤销栈里永远只有一条记录，Ctrl+Z / Ctrl+Y 执行一次后便失效。
 */
function bindVscodeUndoRedo(history: History): (() => void) | undefined {
  let ipc: ReturnType<typeof useWebviewIPC>;
  try {
    ipc = useWebviewIPC();
  } catch {
    console.warn('[useHistory] IPC not available, vscodeUndoRedo will be disabled');
    return undefined;
  }

  try {
    const disposable = ipc.onMessage((msg) => {
      if (HistoryUndoNotification.is(msg)) {
        void history.undo();
        return;
      }
      if (HistoryRedoNotification.is(msg)) {
        void history.redo();
      }
    });

    // 每新建一条历史条目即通知扩展注册一个 VSCode 撤销栈条目；合并更新不重复注册。
    const unsubscribe = history.on((event) => {
      if (event.type === 'execute' && event.merged !== true) {
        ipc.sendCommand(HistoryCommandExecutedCommand, undefined);
      }
    });

    return () => {
      disposable.dispose();
      unsubscribe();
    };
  } catch (err) {
    console.warn('[useHistory] onMessage failed:', err);
    return undefined;
  }
}

/** 为某个 History 实例创建全局监听。VSCode 集成成功接管时不再绑定 webview 键盘，避免双重撤销。 */
function createGlobalBindings(
  history: History,
  opts: { keyboardShortcuts: boolean; vscodeUndoRedo: boolean }
): () => void {
  const disposers: Array<() => void> = [];

  let vscodeBound = false;
  if (opts.vscodeUndoRedo) {
    const dispose = bindVscodeUndoRedo(history);
    if (dispose) {
      disposers.push(dispose);
      vscodeBound = true;
    }
  }

  // 仅在 VSCode 未接管时才绑定 webview 自身键盘快捷键，否则一次按键会被双重处理。
  if (opts.keyboardShortcuts && !vscodeBound) {
    const handler = (e: KeyboardEvent): void => handleHistoryKey(e, history);
    window.addEventListener('keydown', handler);
    disposers.push(() => window.removeEventListener('keydown', handler));
  }

  return () => {
    for (const dispose of disposers) {
      dispose();
    }
  };
}

/** 获取（必要时创建）某 History 实例的全局监听，引用计数 +1，返回释放函数。 */
function acquireGlobalBindings(
  history: History,
  opts: { keyboardShortcuts: boolean; vscodeUndoRedo: boolean }
): () => void {
  let binding = _globalBindings.get(history);
  if (!binding) {
    binding = { count: 0, teardown: createGlobalBindings(history, opts) };
    _globalBindings.set(history, binding);
  }
  binding.count++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = _globalBindings.get(history);
    if (!current) return;
    current.count--;
    if (current.count <= 0) {
      current.teardown();
      _globalBindings.delete(history);
    }
  };
}

// ─── Composable Options ───────────────────────────────────────────────────────

export interface UseHistoryOptions extends HistoryOptions {
  /**
   * 使用全局共享实例，默认 false。
   * 若设置为 true，则忽略 instance 参数。
   */
  shared?: boolean;

  /**
   * 传入已有 History 实例（优先级高于 shared）。
   */
  instance?: History;

  /**
   * 是否自动绑定键盘快捷键，默认 true。
   * - Ctrl+Z / Cmd+Z     → undo
   * - Ctrl+Y / Cmd+Y     → redo
   * - Ctrl+Shift+Z / Cmd+Shift+Z → redo
   */
  keyboardShortcuts?: boolean;

  /**
   * 启用 VSCode 原生撤销/重做集成（配合 CustomEditorProvider），默认 true。
   * 开启后，Ctrl+Z / Ctrl+Y 由 VSCode 驱动，通过 IPC 通知触发 history.undo/redo。
   */
  vscodeUndoRedo?: boolean;
}

// ─── Return Type ──────────────────────────────────────────────────────────────

export interface UseHistoryReturn {
  /** History 实例，可直接调用 execute / undo / redo */
  history: History;

  /** 响应式状态快照 */
  state: History['state'];

  /** 撤销（等同于 history.undo()） */
  undo(): Promise<HCommand | undefined>;

  /** 重做（等同于 history.redo()） */
  redo(): Promise<HCommand | undefined>;

  /**
   * 执行并记录一条命令的快捷方式。
   * @example
   * record(new SetValueCommand(form, 'name', 'Bob'));
   */
  record(cmd: HCommand): Promise<void>;

  /**
   * 追踪 `<input>` / `<el-input>` 等原生输入事件，返回包含 `onFocus` 和 `onChange` 的处理器对象。
   *
   * - `onFocus`：在用户开始编辑前抓取真实旧值，需绑定到组件的 `@focus` 事件。
   * - `onChange`：在用户提交编辑后创建命令，需绑定到组件的 `@change` 事件。
   *
   * **为什么需要 `onFocus`？**
   * `v-model` 在每次按键时就已将对象属性更新为新值，到 `@change` 触发时旧值已丢失。
   * 通过 `@focus` 在编辑开始前抓取旧值，可确保撤销/重做后再次编辑时旧值始终正确。
   *
   * @example
   * const { trackInput } = useHistory({ shared: true });
   * const handlers = trackInput(form, 'name', '修改姓名');
   * // <el-input v-model="form.name" @focus="handlers.onFocus" @change="handlers.onChange" />
   */
  trackInput<TObj extends object, TKey extends keyof TObj>(
    object: TObj,
    key: TKey,
    name?: string
  ): { onFocus: () => void; onChange: (newVal: TObj[TKey]) => void };

  /**
   * 追踪 v-model 双向绑定，配合 Vue `watch` 使用。
   * 返回一个 `(newVal, oldVal) => void` 回调，直接传给 `watch` 的第二个参数。
   * Vue `watch` 原生提供旧值，无需额外抓取，撤销顺序始终正确。
   *
   * @example
   * const { trackModel } = useHistory({ shared: true });
   * watch(() => form.age, trackModel(form, 'age', '修改年龄'));
   */
  trackModel<TObj extends object, TKey extends keyof TObj>(
    object: TObj,
    key: TKey,
    name?: string
  ): (newVal: TObj[TKey], oldVal: TObj[TKey]) => void;

  /** canUndo 的独立 Ref（方便在模板中单独解构） */
  canUndo: Readonly<Ref<boolean>>;

  /** canRedo 的独立 Ref（方便在模板中单独解构） */
  canRedo: Readonly<Ref<boolean>>;
}

// ─── Composable 实现 ──────────────────────────────────────────────────────────

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const { shared = false, instance, keyboardShortcuts = true, vscodeUndoRedo = true } = options;

  // 决定使用哪个 History 实例。
  // 注意：共享实例只在首次创建时采用 options，后续调用传入的 options 将被忽略。
  const history: History = instance ?? (shared ? getSharedHistory(options) : new History(options));

  const { state } = history;

  // 全局监听（键盘 + VSCode IPC）按 History 实例去重并引用计数，
  // 共享实例下多个组件不会重复绑定导致一次操作触发多次撤销/重做。
  let releaseBindings: (() => void) | undefined;

  onMounted(() => {
    releaseBindings = acquireGlobalBindings(history, {
      keyboardShortcuts: keyboardShortcuts,
      vscodeUndoRedo: vscodeUndoRedo
    });
  });

  onUnmounted(() => {
    releaseBindings?.();
    releaseBindings = undefined;
  });

  // ── 便捷方法 ─────────────────────────────────────────────────────────────

  function record(cmd: HCommand): Promise<void> {
    return history.execute(cmd);
  }

  function trackInput<TObj extends object, TKey extends keyof TObj>(
    object: TObj,
    key: TKey,
    name?: string
  ): { onFocus: () => void; onChange: (newVal: TObj[TKey]) => void } {
    // 在用户开始编辑时（onFocus）抓取真实旧值。
    // 不能依赖上次 @change 的缓存值，因为撤销/重做/外部赋值会改变对象属性，
    // 而那些操作不经过 @change，导致缓存值与实际值脱节，撤销顺序因此错乱。
    let preEditValue: TObj[TKey] = object[key];
    return {
      onFocus: () => {
        preEditValue = object[key];
      },
      onChange: (newVal: TObj[TKey]) => {
        void history.execute(new SetValueCommand(object, key, newVal, name, preEditValue));
      }
    };
  }

  function trackModel<TObj extends object, TKey extends keyof TObj>(
    object: TObj,
    key: TKey,
    name?: string
  ): (newVal: TObj[TKey], oldVal: TObj[TKey]) => void {
    // Vue watch 原生提供 (newVal, oldVal)，直接使用，无需额外缓存，
    // 撤销/重做后旧值始终由框架保证正确。
    return (newVal: TObj[TKey], oldVal: TObj[TKey]) => {
      if (newVal !== oldVal) {
        void history.execute(new SetValueCommand(object, key, newVal, name, oldVal));
      }
    };
  }

  return {
    history: history,
    state: state,
    undo: (): Promise<HCommand | undefined> => history.undo(),
    redo: (): Promise<HCommand | undefined> => history.redo(),
    record: record,
    trackInput: trackInput,
    trackModel: trackModel,
    canUndo: readonly(toRef(state, 'canUndo')),
    canRedo: readonly(toRef(state, 'canRedo'))
  };
}
