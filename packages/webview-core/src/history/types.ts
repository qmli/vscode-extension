/**
 * History / Undo-Redo 类型定义
 * 包含命令接口、History 配置选项、状态接口以及事件类型定义。
 */

// ─── 命令接口 ────────────────────────────────────────────────────────────────

/**
 * 命令接口
 * 每个可撤销的操作都必须实现此接口。
 *
 * - `execute()` 执行/重做操作
 * - `undo()`    撤销操作
 * - `update()`  （可选）将后续同类型命令合并到当前命令中（用于连续输入防抖合并）
 */
export interface HCommand {
  /** 历史队列内自增 ID，由 History 分配 */
  id: number;
  /** 命令类型字符串，用于识别是否可合并 */
  type: string;
  /** 显示在撤销/重做提示中的名称 */
  name: string;
  /**
   * 是否允许与前一条同类命令合并。
   * 设为 true 后，若两条命令在 `mergeWindow` 时间窗口内且类型相同，
   * 则调用 `update()` 合并，而非压入新条目。
   */
  updatable: boolean;

  execute(): void | Promise<void>;
  undo(): void | Promise<void>;

  /** 将 `newCmd` 的最新状态合并进自身（updatable = true 时有效） */
  update?(newCmd: HCommand): void;

  /**
   * 精细化合并守卫（可选）。
   * 当 `updatable === true` 且类型匹配时，History 会额外调用此方法做二次判断。
   * 返回 false 则阻止合并，压入新条目。
   * 用途：`SetValueCommand` 需检查 object 与 attributeName 是否相同。
   */
  canMergeWith?(cmd: HCommand): boolean;

  /** 可选序列化支持（持久化/跨会话恢复） */
  toJSON?(): Record<string, unknown>;
  fromJSON?(json: Record<string, unknown>): void;
}

// ─── History 配置 ────────────────────────────────────────────────────────────

export interface HistoryOptions {
  /**
   * 最大撤销步数，默认 100。
   * 超出后最旧的条目将被丢弃。
   */
  maxHistorySize?: number;

  /**
   * 同类型命令合并时间窗口（毫秒），默认 500ms。
   * 在此时间内连续产生的同类型 updatable 命令会被合并为一条。
   */
  mergeWindow?: number;

  /**
   * 单次操作超时时间（毫秒），默认 5000ms。
   * execute / undo / redo 超过此时间未完成将抛出超时错误并释放 busy 锁。
   * 设为 0 表示不启用超时保护。
   */
  operationTimeout?: number;
}

// ─── 响应式状态 ──────────────────────────────────────────────────────────────

/** History 对外暴露的响应式只读快照 */
export interface HistoryState {
  /** 当前是否可以撤销 */
  canUndo: boolean;
  /** 当前是否可以重做 */
  canRedo: boolean;
  /** 最近一条可撤销命令的名称（用于 Tooltip） */
  undoName: string;
  /** 最近一条可重做命令的名称（用于 Tooltip） */
  redoName: string;
  /** 撤销队列长度 */
  undoCount: number;
  /** 重做队列长度 */
  redoCount: number;
  /**
   * 当前是否正在执行异步命令（execute / undo / redo）。
   * 为 true 时表示有异步操作进行中，UI 应禁用相关按钮防止并发竞态。
   */
  busy: boolean;
}

// ─── 事件 ────────────────────────────────────────────────────────────────────

export type HistoryEventType = 'execute' | 'undo' | 'redo' | 'clear' | 'error';

export interface HistoryEvent {
  type: HistoryEventType;
  command?: HCommand;
  /** 仅 type === 'error' 时有值 */
  error?: unknown;
  /**
   * 仅 type === 'execute' 时有意义。
   * - `true`：本次执行被合并进上一条命令（未新建历史条目）
   * - `false` / `undefined`：本次执行新建了一条历史条目
   *
   * 用于让监听方区分"新条目"与"合并更新"，例如 VSCode 原生撤销栈集成
   * 只需为新条目注册撤销记录，合并更新不应重复注册。
   */
  merged?: boolean;
}

export type HistoryListener = (event: HistoryEvent) => void;
