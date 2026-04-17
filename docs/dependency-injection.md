# 依赖注入系统详解

本架构是基于VSCode 依赖注入系统中的 **四个关键部分**，它们各自承担不同的职责，**组合在一起**才能实现完整的依赖注入流程。
拒绝循环依赖注入

## 四者职责概览

| 组件                                     | 作用                                            | 类比                 | 使用场景                             |
| ---------------------------------------- | ----------------------------------------------- | -------------------- | ------------------------------------ |
| `createDecorator`<br/>（+ `@MyService`） | 定义服务的 **标识符**，用于声明依赖             | 服务的 **名字/标签** | 所有服务声明                         |
| `ServiceCollection`                      | 注册服务的 **实现** 或 **构造描述**，构成“容器” | **容器/注册表**      | 服务注册与配置                       |
| `InstantiationService`                   | 读取依赖、创建实例、**自动注入**                | **工厂/调度器**      | 类实例化（`createInstance`）         |
| **`invokeFunction`**                     | **直接调用函数**并注入 `ServicesAccessor`       | **临时执行器**       | **非DI管理的函数**、启动初始化、测试 |

---

## 1、 `createDecorator` + `@MyService`

### 作用：

- 定义服务的**唯一标识符**（基于 Symbol 或函数对象）。
- 作为 TypeScript 装饰器，注解构造函数的参数，让 DI 系统知道“这里需要注入什么服务”。

### 示例：

```typescript
// 定义服务标识符（instantiation/common/instantiation.ts）
export const ILogService = createDecorator<ILogService>('logService');

// 使用服务（声明依赖）
class MyComponent {
  constructor(
    @ILogService private readonly logService: ILogService,
    @ICommandService private readonly commandService: ICommandService
  ) {}
}
```

**核心实现**（`createDecorator`）：

```typescript
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
  const id = function (target: Function, key: string, index: number) {
    storeServiceDependency(id, target, index); // 记录到 DI_DEPENDENCIES
  } as ServiceIdentifier<T>;
  // ...
  return id;
}
```

这一步**只声明依赖**，还没告诉系统服务从哪里来。

---

## 2、 `ServiceCollection`

### 作用：

- 用来**注册服务的实现**（实例、`SyncDescriptor` 构造器描述）。
- 类似一个服务“仓库”或“注册表”，支持父子继承（通过 `createChild`）。

### 示例：

```typescript
const services = new ServiceCollection();

// 注册实例（立即可用）
services.set(ILogService, new LogServiceImpl());

// 注册延迟构造描述（推荐，大多数服务使用此方式）
services.set(ILogService, new SyncDescriptor(LogServiceImpl));

// 覆盖服务（测试、子容器常用）
services.set(IMyService, mockService);
```

**实现简述** (`serviceCollection.ts`)：

```typescript
export class ServiceCollection {
	private _entries = new Map<ServiceIdentifier<any>, any>();

	set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>) {
		this._entries.set(id, instanceOrDescriptor);
		return previous;
	}

	get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> { ... }
}
```

---

## 3、 `InstantiationService`

### 作用：

- **根据依赖关系自动实例化类**（`createInstance`）。
- 解析构造函数上的 `@Decorator` 依赖，递归创建/获取服务并注入。
- 支持追踪（Tracing）、循环依赖检测、延迟实例化（`GlobalIdleValue`）、子容器（`createChild`）。

### 示例：

```typescript
const instantiationService = new InstantiationService(services);
const myComponent = instantiationService.createInstance(MyComponent); // 自动注入所有 @xxx 服务
```

**`createInstance` 内部流程**（简化）：

1. 读取 `_util.getServiceDependencies(ctor)`（从装饰器记录的元数据）。
2. 对每个依赖调用 `_getOrCreateServiceInstance(id)`。
3. 如果是 `SyncDescriptor`，则递归构造实例并缓存。
4. 使用 `Reflect.construct` 组合静态参数 + 服务参数创建对象。

---

## 4、 **`invokeFunction`** （**重点补充**）

### 作用：

- **执行者不是 DI 管理的服务/类**，无法通过构造函数注入——这是 `invokeFunction` 的主战场。
- 提供一个临时的 `ServicesAccessor`，允许在普通函数中**动态获取任意已注册服务**。
- 常用于：
  1. **启动/初始化阶段**（命令、贡献点、激活逻辑，服务还未完全构造好）。
  2. **测试代码**中临时访问/模拟服务。
  3. **事件处理器、Action.run、命令执行**等非类上下文。
  4. 需要一次性获取多个服务，而不想把整个 `InstantiationService` 注入到类中。

### 核心实现（`instantiationService.ts`）：

```typescript
invokeFunction<R, TS extends any[] = []>(
	fn: (accessor: ServicesAccessor, ...args: TS) => R,
	...args: TS
): R {
	const accessor: ServicesAccessor = {
		get: <T>(id: ServiceIdentifier<T>) => {
			// 内部调用 _getOrCreateServiceInstance(id) 解析并创建服务
			return this._getOrCreateServiceInstance(id, _trace);
		}
	};
	return fn(accessor, ...args);  // 执行用户函数，accessor 仅在本次调用有效
}
```

**`ServicesAccessor` 接口**：

```typescript
export interface ServicesAccessor {
  get<T>(id: ServiceIdentifier<T>): T;
}
```

### 实际使用示例

#### 示例1：命令执行（最常见）后面会纳入架构中

```typescript
registerCommand('my.command', (accessor: ServicesAccessor) => {
  const logService = accessor.get(ILogService);
  const editorService = accessor.get(IEditorService);

  logService.info('命令执行了');
  // ... 业务逻辑
});
```

#### 示例2：测试中使用

```typescript
test('some feature', function () {
  const collection = new ServiceCollection();
  collection.set(ILogService, new MockLogService());
  const service = new InstantiationService(collection);

  service.invokeFunction((accessor) => {
    const log = accessor.get(ILogService);
    assert.ok(log);
    // 测试逻辑...
  });
});
```

#### 示例3：启动初始化阶段

```typescript
// 在 container.ts 启动、extension 激活等场景
instantiationService.invokeFunction(async (accessor) => {
  const extensionService = accessor.get(IExtensionService);
  const telemetryService = accessor.get(ITelemetryService);

  await initializeSomething(extensionService, telemetryService);
});
```

**注意事项**：

- `accessor` **仅在 `fn` 执行期间有效**，函数返回后立即失效（`_done` 标志保护）。
- 内部会进行性能追踪（`Trace.traceInvocation`）。
- 支持额外静态参数：`invokeFunction(fn, arg1, arg2)`。
- 比直接注入 `IInstantiationService` 更轻量、意图更清晰。

---

## 三驾马车 + invokeFunction 的关系总结图

```mermaid
graph TD
    A[MyComponent<br/>@ILogService] -->|createInstance| B[InstantiationService]
    C[OrdinaryFunction<br/>(命令/测试/初始化)] -->|invokeFunction| B
    B -->|读取装饰器依赖<br/>或 accessor.get()| D[ServiceCollection]
    D -->|SyncDescriptor<br/>或实例| E[LogServiceImpl<br/>或其他服务]
    E -->|注入| A
    E -->|返回| C
```

---

## 总结

| 组件                   | 主要职责                         | 典型使用方式                                          |
| ---------------------- | -------------------------------- | ----------------------------------------------------- |
| `createDecorator`      | **声明依赖**（你想要什么服务）   | `@IService` 装饰器                                    |
| `ServiceCollection`    | **注册服务**（怎么提供服务）     | `set(id, descriptor)`                                 |
| `InstantiationService` | **类实例化 + 自动注入**          | `createInstance(Clazz)`                               |
| **`invokeFunction`**   | **函数级服务访问**（非类上下文） | `invokeFunction((accessor) => { accessor.get(...) })` |

**它们是 VSCode 依赖注入的“四驾马车”**，必须配合使用才能让服务在各种场景下正确注入：

- **类/组件** → 使用 `createInstance` + 构造函数注入
- **函数/命令/测试/初始化** → 使用 `invokeFunction` + `accessor.get()`

---

**文档来源**：基于 `instantiation/common/` 核心实现（`instantiation.ts`、`instantiationService.ts`、`serviceCollection.ts`、`descriptors.ts`）及测试用例。
