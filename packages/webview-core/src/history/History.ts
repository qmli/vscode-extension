/**
 * History —— 撤销 / 重做历史管理器
 *
 * 核心思路：
 *   - undos 栈：已执行的命令
 *   - redos 栈：被撤销、等待重做的命令
 *   - execute(cmd)：执行命令并压入 undos，同时清空 redos
 *   - undo()：从 undos 弹出并调用 cmd.undo()，压入 redos
 *   - redo()：从 redos 弹出并调用 cmd.execute()，压入 undos
 *
 * Vue3 集成：
 *   - `state` 是 `reactive` 对象，可直接在模板中使用
 *   - 提供事件监听接口，便于外部扩展（日志、持久化等）
 *
 * 并发保护：
 *   - 串行队列（_queue）确保多次调用依次执行，不丢失任何操作
 *   - _busy 标记当前是否有操作在执行中，驱动 UI 禁用状态
 */

import { reactive } from 'vue';
import type { HCommand, HistoryEvent, HistoryListener, HistoryOptions, HistoryState } from './types';

export class History {
  private readonly undos: HCommand[] = [];
  private readonly redos: HCommand[] = [];
  private idCounter: number = 0;
  private lastCmdTime: number = Date.now();
  private readonly maxHistorySize: number;
  private readonly mergeWindow: number;
  private readonly operationTimeout: number;
  private readonly listeners: HistoryListener[] = [];
  private _busy: boolean = false;
  private _queue: Promise<void> = Promise.resolve();

  /**
   * 响应式状态快照，可直接在 Vue 模板或 computed 中使用。
   * @example
   * const { state } = useHistory();
   * // <button :disabled="!state.canUndo">撤销 {{ state.undoName }}</button>
   */
  readonly state: HistoryState = reactive<HistoryState>({
    canUndo: false,
    canRedo: false,
    undoName: '',
    redoName: '',
    undoCount: 0,
    redoCount: 0,
    busy: false
  });

  constructor(options: HistoryOptions = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.mergeWindow = options.mergeWindow ?? 500;
    this.operationTimeout = options.operationTimeout ?? 5000;
  }

  // ─── 核心操作 ──────────────────────────────────────────────────────────────

  /**
   * 执行一条命令并记录到历史。
   * 若上一条操作仍在进行中，本次调用将排队等待，不会被丢弃。
   *
   * 合并规则
   *   若满足以下**所有**条件，则合并到上一条命令（调用 update() 而非创建新条目）：
   *   1. 上一条命令存在
   *   2. 上一条命令 `updatable === true`
   *   3. 两条命令类型相同
   *   4. 距离上一条命令的时间 < mergeWindow
   */
  execute(cmd: HCommand): Promise<void> {
    return this.enqueue(() => this._doExecute(cmd));
  }

  /** 撤销最近一条命令，返回被撤销的命令（无可撤销命令时返回 undefined）。若上一条操作仍在进行中则排队等待。 */
  undo(): Promise<HCommand | undefined> {
    return this.enqueue(() => this._doUndo());
  }

  /** 重做最近一条被撤销的命令，返回被重做的命令（无可重做命令时返回 undefined）。若上一条操作仍在进行中则排队等待。 */
  redo(): Promise<HCommand | undefined> {
    return this.enqueue(() => this._doRedo());
  }

  /** 清空所有历史记录。 */
  clear(): void {
    this.undos.length = 0;
    this.redos.length = 0;
    this.idCounter = 0;
    this.syncState();
    this.emit({ type: 'clear' });
  }

  // ─── 查询 ──────────────────────────────────────────────────────────────────

  /** 返回撤销队列的只读副本（最新在末尾）。 */
  getUndoStack(): readonly HCommand[] {
    return this.undos;
  }

  /** 返回重做队列的只读副本（最新在末尾）。 */
  getRedoStack(): readonly HCommand[] {
    return this.redos;
  }

  // ─── 事件监听 ──────────────────────────────────────────────────────────────

  /** 注册事件监听器，返回取消订阅函数。 */
  on(listener: HistoryListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  // ─── 私有方法 ──────────────────────────────────────────────────────────────

  /**
   * 将任务追加到串行队列末尾，返回任务本身的 Promise（可感知成功/失败）。
   * 队列链始终保持 resolved，单次任务失败不影响后续操作继续执行。
   */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this._queue.then(task);
    this._queue = result.then(
      () => {},
      () => {}
    );
    return result;
  }

  private async _doExecute(cmd: HCommand): Promise<void> {
    this._busy = true;
    this.syncState();
    try {
      const lastCmd = this.undos[this.undos.length - 1];
      const now = Date.now();
      const timeDelta = now - this.lastCmdTime;

      const shouldMerge =
        lastCmd !== undefined &&
        lastCmd.updatable &&
        timeDelta < this.mergeWindow &&
        lastCmd.type === cmd.type &&
        typeof lastCmd.update === 'function' &&
        // 精细化守卫：若命令提供了 canMergeWith，则以其结果为准
        (typeof lastCmd.canMergeWith !== 'function' || lastCmd.canMergeWith(cmd));

      if (shouldMerge) {
        // 合并：用新值更新已有命令，无需新建历史条目。
        lastCmd.update!(cmd);
      } else {
        // 新建条目
        cmd.id = ++this.idCounter;
        try {
          await this.runWithTimeout(() => cmd.execute());
        } catch (err) {
          // 发一条 error 事件供监听者观测，再原样抛出由调用方决定下一步。
          this.emit({ type: 'error', command: cmd, error: err });
          throw err;
        }
        this.undos.push(cmd);

        // 超出最大历史记录数时丢弃最旧条目
        if (this.undos.length > this.maxHistorySize) {
          this.undos.splice(0, 1);
        }
      }

      // 执行新命令后，重做队列必须清空
      this.redos.length = 0;
      this.lastCmdTime = now;
      this.emit({ type: 'execute', command: lastCmd && shouldMerge ? lastCmd : cmd, merged: shouldMerge });
    } finally {
      this._busy = false;
      this.syncState();
    }
  }

  private async _doUndo(): Promise<HCommand | undefined> {
    if (this.undos.length === 0) return undefined;
    this._busy = true;
    this.syncState();
    const cmd = this.undos.pop()!;
    try {
      await this.runWithTimeout(() => cmd.undo());
      this.redos.push(cmd);
      this.lastCmdTime = Date.now();
      this.emit({ type: 'undo', command: cmd });
      return cmd;
    } catch (err) {
      // 发一条 error 事件供监听者观测，再原样抛出由调用方决定下一步。
      this.undos.push(cmd);
      this.emit({ type: 'error', command: cmd, error: err });
      throw err;
    } finally {
      this._busy = false;
      this.syncState();
    }
  }

  private async _doRedo(): Promise<HCommand | undefined> {
    if (this.redos.length === 0) return undefined;
    this._busy = true;
    this.syncState();
    const cmd = this.redos.pop()!;
    try {
      await this.runWithTimeout(() => cmd.execute());
      this.undos.push(cmd);
      this.lastCmdTime = Date.now();
      this.emit({ type: 'redo', command: cmd });
      return cmd;
    } catch (err) {
      // 发一条 error 事件供监听者观测，再原样抛出由调用方决定下一步。
      this.redos.push(cmd);
      this.emit({ type: 'error', command: cmd, error: err });
      throw err;
    } finally {
      this._busy = false;
      this.syncState();
    }
  }

  private syncState(): void {
    this.state.busy = this._busy;
    this.state.canUndo = !this._busy && this.undos.length > 0;
    this.state.canRedo = !this._busy && this.redos.length > 0;
    this.state.undoName = this.undos[this.undos.length - 1]?.name ?? '';
    this.state.redoName = this.redos[this.redos.length - 1]?.name ?? '';
    this.state.undoCount = this.undos.length;
    this.state.redoCount = this.redos.length;
  }

  private emit(event: HistoryEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private runWithTimeout(fn: () => void | Promise<void>): Promise<void> {
    const timeout = this.operationTimeout;
    if (timeout <= 0) {
      return Promise.resolve(fn());
    }
    return Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`History operation timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }
}
