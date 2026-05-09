// ─── Errors ──────────────────────────────────────────────────────────────────
export * from './errors';
export * from './shell.errors';

// ─── Dependency Injection ─────────────────────────────────────────────────────
export * from './instantiation/descriptors';
export * from './instantiation/extensions';
export * from './instantiation/instantiation';
export { InstantiationService } from './instantiation/instantiationService';
export { ServiceCollection } from './instantiation/serviceCollection';

// ─── Logging ──────────────────────────────────────────────────────────────────
export * from './logger';
export * from './logger.scope';
export * from './log';

// ─── Shell / Process ──────────────────────────────────────────────────────────
export * from './shell';

// ─── Events & Async ───────────────────────────────────────────────────────────
// once 与 _utils/function 同名，用别名区分：onceEvent = VSCode Event 版本
export {
  once as onceEvent,
  take,
  promisify,
  promisifyDeferred,
  takeUntil,
  weakEvent,
  type DeferredEvent,
  type DeferredEventExecutor
} from './event';
export * from './promise';
export * from './observableQueue';

// ─── Data Structures ──────────────────────────────────────────────────────────
export * from './history';
export * from './lazy';
export * from './disposable';

// ─── VS Code Integration ──────────────────────────────────────────────────────
export * from './context';
export * from './storage';
export * from './uri';
export * from './vscode.views';

// ─── Crypto ───────────────────────────────────────────────────────────────────
export * from './crypto';

// ─── IPC Protocol ────────────────────────────────────────────────────────────
export * from './protocol';

// ─── Container ───────────────────────────────────────────────────────────────
export * from './container';

// ─── Commands ────────────────────────────────────────────────────────────────
export * from './commands/commandBase';

// ─── QuickPick ────────────────────────────────────────────────────────────────
export * from './quickpick/directive';

// ─── Messages ────────────────────────────────────────────────────────────────
export * from './message';
export * from './quickpick/common';

export * from './iterable';
export * from './_utils/counter';

// ─── Utilities ────────────────────────────────────────────────────────────────
// once 与 event 同名，用别名区分：onceFn = 函数执行版本
export {
  once as onceFn,
  getParameters,
  is,
  partial,
  disposableInterval,
  runSequentially,
  sequentialize
} from './_utils/function';
export * from './_utils/string';
export * from './_utils/version';
