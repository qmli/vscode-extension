# History —— 撤销 / 重做开发指南

## 目录结构

```
src/history/
├── types.ts                  # HCommand、HistoryOptions、HistoryState 等接口
├── Command.ts                # 抽象基类（继承后实现 execute / undo）
├── History.ts                # 核心管理器（undo / redo 栈 + Vue3 reactive state）
├── useHistory.ts             # Vue3 Composable（键盘快捷键 + 便捷包装方法）
├── commands/
│   ├── SetValueCommand.ts    # 修改对象单个属性（支持连续输入自动合并）
│   ├── SetValuesCommand.ts   # 原子批量修改多个属性
│   ├── AddItemCommand.ts     # 向数组插入元素
│   ├── RemoveItemCommand.ts  # 从数组删除元素
│   ├── MoveItemCommand.ts    # 数组元素移动（拖拽排序）
│   ├── BatchCommand.ts       # 组合多条命令为一个原子操作
│   └── index.ts
├── stores/
│   └── useHistoryStore.ts    # Pinia Store（全局共享实例 + DevTools 可见）
└── index.ts                  # 统一导出
```

---

## 核心概念

### 架构对照表

| 1   | 本实现                 | 说明                                          |
| --- | ---------------------- | --------------------------------------------- |
| 2   | `History.ts`           | undo / redo 栈核心，加入 Vue3 `reactive` 状态 |
| 3   | `Command.ts`           | 抽象基类                                      |
| 4   | `SetValueCommand.ts`   | 同名，加了 TypeScript 泛型与合并守卫          |
| 5   | `BatchCommand.ts`      | 原子组合命令                                  |
| 6   | `History.on()` + Pinia | 事件通知机制                                  |
| 7   | `useHistory.ts`        | Vue3 Composable                               |
| 8   | `useHistoryStore.ts`   | Pinia DevTools 可视化                         |

### `HCommand` 接口

所有可撤销命令均须实现 `HCommand` 接口：

```ts
interface HCommand {
  id: number; // 由 History 分配，勿手动设置
  type: string; // 命令类型标识，用于合并判断
  name: string; // 显示在撤销/重做提示中的名称
  updatable: boolean; // 是否允许在时间窗口内与同类命令合并

  // 支持同步或异步实现；History 内部会 await 其返回值
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;

  // 可选：精细化合并守卫（updatable=true 时生效）
  canMergeWith?(cmd: HCommand): boolean;
  // 可选：合并时将新命令状态融入自身
  update?(newCmd: HCommand): void;
  // 可选：序列化
  toJSON?(): Record<string, unknown>;
  fromJSON?(json: Record<string, unknown>): void;
}
```

### 命令合并机制

`History.execute(cmd)` 在以下**全部条件**成立时将新命令合并到上一条（调用 `update()`），而非新建历史条目：

1. 上一条命令 `updatable === true`
2. 两条命令 `type` 相同
3. 距上一条命令时间 < `mergeWindow`（默认 500ms）
4. 若命令实现了 `canMergeWith()`，则该方法返回 `true`

> **典型场景**：用户连续在输入框中打字，每次击键都产生 `SetValueCommand`，得益于合并机制，最终只会生成一条撤销记录，而非每个字符一条。

### 异步命令与错误处理

`execute()` / `undo()` 允许返回 `Promise<void>`，便于命令内部执行异步 IO（如网络请求、文件读写）。相应地，`History.execute()` / `undo()` / `redo()` 均返回 `Promise`。

当命令的 `execute()` / `undo()` 抛出异常时，`History` 会：

1. 派发一条 `type: 'error'` 的事件（携带 `command` 与 `error` 字段）供监听者观测；
2. **回滚栈状态**：`undo` 失败时把命令推回 `undos`，`redo` 失败时把命令推回 `redos`，`execute` 失败时不入栈；
3. 原样抛出异常，由调用方决定后续处理（例如提示用户）。

> 调用方应使用 `try / catch` 或 `.catch()` 捕获 Promise 错误。若不关心异常（如键盘快捷键场景），使用 `void history.undo()` / `void history.redo()` 即可。

#### 操作超时保护

当命令的异步操作超过 `operationTimeout`（默认 5000ms）仍未完成时，`History` 会自动抛出超时错误，释放 `busy` 锁，让后续排队的操作得以继续执行。设为 `0` 可关闭超时保护。

```ts
// 自定义超时（适合涉及网络 / IPC 的耗时命令）
const history = new History({ operationTimeout: 10000 });

// 关闭超时保护（纯内存操作场景）
const history = new History({ operationTimeout: 0 });
```

---

## 快速上手

### 安装 / 引入

```ts
// 通过 webview-core 统一入口引入
import {
  useHistory,
  useHistoryStore,
  History,
  Command,
  SetValueCommand,
  SetValuesCommand,
  AddItemCommand,
  RemoveItemCommand,
  MoveItemCommand,
  BatchCommand
} from '@packages/webview-core';
```

---

## 使用场景

### 场景一：表单字段撤销（最常用）

使用 `trackInput` 追踪 `@change` 事件，500ms 内对同一字段的连续修改自动合并为一条记录。

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { useHistory } from '@packages/webview-core';

const form = reactive({ name: 'Alice', age: 18 });

// shared: true → 整个页面共享同一撤销栈；Ctrl+Z 自动绑定
const { state, trackInput, undo, redo } = useHistory({ shared: true });

// trackInput 返回 { onFocus, onChange } 对象，需同时绑定两个事件
const nameHandlers = trackInput(form, 'name', '修改姓名');
const ageHandlers = trackInput(form, 'age', '修改年龄');
</script>

<template>
  <!-- @focus 在编辑前抓取旧值，@change 在提交后创建命令 -->
  <el-input v-model="form.name" @focus="nameHandlers.onFocus" @change="nameHandlers.onChange" />
  <el-input-number v-model="form.age" @focus="ageHandlers.onFocus" @change="ageHandlers.onChange" />

  <el-button :disabled="!state.canUndo" @click="undo"> 撤销 {{ state.undoName }} </el-button>
  <el-button :disabled="!state.canRedo" @click="redo"> 重做 {{ state.redoName }} </el-button>
</template>
```

> `trackInput` 与 `trackModel` 的区别：
>
> - `trackInput` 返回 `{ onFocus, onChange }` 对象：`onFocus` 在编辑开始前抓取真实旧值，`onChange` 在提交后创建撤销记录。**两个事件均需绑定**，否则连续编辑后撤销会出现旧值错乱。
> - `trackModel` 返回 `(newVal, oldVal) => void` 回调，直接传给 `watch` 的第二个参数，由 Vue 框架提供旧值，无需 `@focus`。

---

### 场景二：通过 `record()` 手动执行命令

```ts
import { useHistory, SetValueCommand } from '@packages/webview-core';

const { record } = useHistory({ shared: true });

// 直接执行一条命令并记录历史；record 返回 Promise，可按需 await
await record(new SetValueCommand(form, 'name', 'Bob', '修改姓名'));
```

---

### 场景三：批量原子操作

一次撤销即可还原所有字段，中途不会出现半还原状态。

```ts
import { useHistory, SetValuesCommand, BatchCommand, SetValueCommand, AddItemCommand } from '@packages/webview-core';

const { record } = useHistory({ shared: true });

// 方式 A：SetValuesCommand —— 一次还原对象多个属性
record(new SetValuesCommand(form, { name: 'Bob', age: 20 }, '重置表单'));

// 方式 B：BatchCommand —— 组合任意类型的命令
record(
  new BatchCommand('初始化配置')
    .add(new SetValueCommand(form, 'name', 'Charlie'))
    .add(new AddItemCommand(tagList, 'vue3'))
);
```

---

### 场景四：列表增删排序

```ts
import { useHistory, AddItemCommand, RemoveItemCommand, MoveItemCommand } from '@packages/webview-core';

const list = reactive<string[]>(['a', 'b', 'c']);
const { record } = useHistory({ shared: true });

// 追加到末尾
record(new AddItemCommand(list, 'd', '添加项目'));

// 在索引 1 处插入
record(new AddItemCommand(list, 'x', '插入项目', 1));

// 删除索引 2 的元素
record(new RemoveItemCommand(list, 2, '删除项目'));

// 拖拽排序：将索引 3 的元素移到索引 0
record(new MoveItemCommand(list, 3, 0, '拖拽排序'));
```

---

### 场景五：自定义命令

继承 `Command` 抽象类，实现 `execute()` 和 `undo()`：

```ts
import { Command } from '@packages/webview-core';

class ToggleVisibleCommand extends Command {
  override type = 'ToggleVisibleCommand';
  override updatable = false;

  constructor(private node: { visible: boolean }) {
    super();
    this.name = '切换可见性';
  }

  execute(): void {
    this.node.visible = !this.node.visible;
  }
  undo(): void {
    this.node.visible = !this.node.visible;
  }
}

record(new ToggleVisibleCommand(someNode));
```

#### 异步命令示例（IPC 通信 · 乐观更新模式）

当命令需要通过 IPC 通知后端时，推荐 **"先更新本地状态，再发送 IPC"** 的乐观更新模式：
UI 立即响应，不卡等待网络；若 IPC 失败，命令不入栈且 `History` 触发 `error` 事件以便回滚提示。

```ts
import { Command } from '@packages/webview-core';
import type { INodeData } from './types';

class CreateNodeCommand extends Command {
  override type = 'CreateNodeCommand';
  override updatable = false;

  constructor(
    private readonly nodes: INodeData[],   // Vue reactive 数组
    private readonly newNode: INodeData,
    private readonly ipc: NodeIpcService   // 注入 IPC 服务
  ) {
    super();
    this.name = '创建节点';
  }

  async execute(): Promise<void> {
    // Phase 1：立即更新本地状态（UI 瞬间响应）
    this.nodes.push(this.newNode);
    // Phase 2：异步通知后端（失败时 History 不入栈并触发 error 事件）
    await this.ipc.createNode(this.newNode);
  }

  async undo(): Promise<void> {
    const idx = this.nodes.findIndex((n) => n.id === this.newNode.id);
    if (idx > -1) this.nodes.splice(idx, 1);
    await this.ipc.deleteNode(this.newNode.id);
  }
}

// 调用方处理 IPC 失败
try {
  await record(new CreateNodeCommand(nodes, newNode, ipcService));
} catch {
  ElMessage.error('创建节点失败，已取消');
}
```

> **并发保护**：`History` 内部维护一条串行队列，多次连续调用 `execute / undo / redo`
> 会依次排队执行，**不会丢弃任何操作**。执行期间 `state.busy = true`，
> `state.canUndo / canRedo` 自动置为 `false`，UI 按钮无需额外判断即可禁用。

```vue
<!-- busy 期间按钮自动禁用，无需手动维护 loading 状态 -->
<el-button :disabled="!state.canUndo" @click="undo">撤销</el-button>
<el-button :disabled="!state.canRedo" @click="redo">重做</el-button>
```

#### 自定义可合并命令

设置 `updatable = true` 并实现 `canMergeWith()` 与 `update()`：

```ts
class SetColorCommand extends Command {
  override type = 'SetColorCommand';
  override updatable = true;

  private readonly oldColor: string;
  private newColor: string;

  constructor(
    protected readonly target: { color: string },
    newColor: string,
    name = '修改颜色'
  ) {
    super();
    this.oldColor = target.color;
    this.newColor = newColor;
    this.name = name;
  }

  execute(): void {
    this.target.color = this.newColor;
  }
  undo(): void {
    this.target.color = this.oldColor;
  }

  // 同一对象才合并
  override canMergeWith(cmd: HCommand): boolean {
    return (cmd as SetColorCommand).target === this.target;
  }

  override update(cmd: HCommand): void {
    this.newColor = (cmd as SetColorCommand).newColor;
    this.execute();
  }
}
```

---

### 场景六：Pinia Store（全局共享，推荐跨组件场景）

```ts
// main.ts —— 应用启动时初始化
import { useHistoryStore } from '@packages/webview-core';
const historyStore = useHistoryStore();
historyStore.init({ maxHistorySize: 200, mergeWindow: 800 });
```

```ts
// 任意子组件中
import { useHistoryStore } from '@packages/webview-core';

const hs = useHistoryStore();

// 内置快捷方法（均返回 Promise，可按需 await）
await hs.setValue(form, 'name', 'Dave', '修改姓名');
await hs.setValues(form, { name: '', age: 0 }, '清空表单');
await hs.addItem(list, newItem, '添加行');
await hs.removeItem(list, 2, '删除行');
await hs.moveItem(list, 3, 0, '排序');

// 批量操作（空 batch 返回 void；非空 batch 返回 Promise<void>）
await hs.batch('批量重置', (b) => {
  b.add(new SetValueCommand(form, 'name', ''));
  b.add(new SetValueCommand(form, 'age', 0));
});

// 撤销 / 重做（异步）
await hs.undo();
await hs.redo();

// 响应式状态（可直接在模板中使用）
hs.canUndo; // boolean
hs.canRedo; // boolean
hs.undoName; // string，最近可撤销命令名
hs.redoName; // string，最近可重做命令名
```

---

### 场景七：键盘快捷键

`useHistory` 默认自动绑定快捷键（组件挂载时注册，卸载时移除）：

| 快捷键                   | 操作 |
| ------------------------ | ---- |
| `Ctrl / Cmd + Z`         | 撤销 |
| `Ctrl / Cmd + Y`         | 重做 |
| `Ctrl / Cmd + Shift + Z` | 重做 |

**与 VSCode 原生撤销/重做的关系**

`vscodeUndoRedo`（默认 `true`）和 `keyboardShortcuts`（默认 `true`）**互斥**：

- 若 `vscodeUndoRedo: true` 且 IPC 连接成功，快捷键由 VSCode 接管，通过 IPC 通知驱动 `undo/redo`，webview 自身**不再**绑定 `keydown` 监听，避免一次按键触发双重撤销。
- 若 IPC 不可用（如纯浏览器环境、测试场景），自动回退到 `keydown` 监听。
- 若明确不需要 VSCode 集成，设置 `vscodeUndoRedo: false`，此时 `keyboardShortcuts` 始终生效。

```ts
// 默认：VSCode 集成优先，IPC 不可用时自动回退到键盘监听
const { state } = useHistory({ shared: true });

// 仅 VSCode 集成，完全禁用 webview 键盘监听
const { state } = useHistory({ vscodeUndoRedo: true, keyboardShortcuts: false });

// 禁用所有快捷键（手动调用 undo / redo）
const { state } = useHistory({ keyboardShortcuts: false, vscodeUndoRedo: false });
```

> **共享实例下的去重保护**：多个组件调用 `useHistory({ shared: true })` 时，监听器按 `History` 实例做引用计数，全局只绑定一次；最后一个组件卸载后才解绑，不会因多个组件注册而导致一次操作撤销多步。

---

### 场景八：事件监听

```ts
const { history } = useHistory({ shared: true });

const unsubscribe = history.on((event) => {
  // event.type: 'execute' | 'undo' | 'redo' | 'clear' | 'error'
  if (event.type === 'error') {
    // 仅 error 事件携带 error 字段
    console.error(`[History] 命令执行失败：${event.command?.name}`, event.error);
    return;
  }
  console.log(`[History] ${event.type}:`, event.command?.name);
});

// 组件卸载时取消订阅
onUnmounted(unsubscribe);
```

---

## 实例管理策略

| 策略                | 代码                                  | 适用场景                       |
| ------------------- | ------------------------------------- | ------------------------------ |
| 全局共享 Composable | `useHistory({ shared: true })`        | 单页面所有组件共享同一历史     |
| Pinia Store         | `useHistoryStore()`                   | 需要 DevTools 调试或跨模块访问 |
| 独立实例            | `useHistory()`                        | 组件内部私有历史，互不干扰     |
| 传入已有实例        | `useHistory({ instance: myHistory })` | 手动控制实例生命周期           |

> **注意**：`useHistory({ shared: true })` 与 `useHistoryStore()` 的共享实例**相互独立**，不要在同一应用中混用两种全局共享方式。

> **共享实例的 `options` 仅首次创建生效**：调用 `useHistory({ shared: true, maxHistorySize: 200 })` 时，若共享实例已存在，`maxHistorySize` 等配置项将被忽略。如需自定义配置，请在应用启动时最早一次调用中传入，或改用 `useHistoryStore()`（支持 `init()` 显式初始化）。

---

## `useHistory` 返回值速查

| 属性 / 方法                   | 类型                          | 说明                                          |
| ----------------------------- | ----------------------------- | --------------------------------------------- |
| `history`                     | `History`                     | 底层实例，可调用所有方法                      |
| `state`                       | `HistoryState`                | 响应式状态（canUndo / canRedo / busy / 名称 / 计数） |
| `canUndo`                     | `Readonly<Ref<boolean>>`      | 是否可撤销                                    |
| `canRedo`                     | `Readonly<Ref<boolean>>`      | 是否可重做                                    |
| `undo()`                      | `() => Promise<HCommand \| undefined>` | 撤销（异步）                         |
| `redo()`                      | `() => Promise<HCommand \| undefined>` | 重做（异步）                         |
| `record(cmd)`                 | `(cmd: HCommand) => Promise<void>` | 执行并记录命令（异步）                    |
| `trackInput(obj, key, name?)` | `{ onFocus: () => void; onChange: (newVal) => void }` | 生成 `@focus` + `@change` 处理函数对，**两个事件均需绑定** |
| `trackModel(obj, key, name?)` | `(newVal, oldVal) => void`    | 生成 `watch` 回调，由 Vue 提供旧值            |

---

## `History` 配置项

```ts
new History({
  maxHistorySize: 100,    // 最大撤销步数，超出后丢弃最旧条目，默认 100
  mergeWindow: 500,       // 同类命令合并时间窗口（ms），默认 500
  operationTimeout: 5000  // 单次操作超时（ms），超时后抛出错误并释放 busy 锁，默认 5000；设为 0 禁用
});
```
