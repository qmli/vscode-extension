/**
 * Logger 使用示例
 *
 * 本文件演示了日志系统的三个核心模块的用法：
 * - Logger（logger.ts）：日志单例，提供 log / debug / warn / error 等方法
 * - @log / @debug / @logName 装饰器（log.ts）：方法级别的自动日志记录
 * - LogScope（logger.scope.ts）：日志作用域管理，用于追踪调用链路
 */

import { debug, log, logName } from '@orientais/vscode-core/log';
import { Logger } from '@orientais/vscode-core/logger';
import { getNewLogScope, setLogScopeExit, startLogScope } from '@orientais/vscode-core/logger.scope';

// ============================================================================
// 1. Logger 基础用法 —— 直接调用 Logger 单例
// ============================================================================

/**
 * 示例：Logger 的基本日志方法
 *
 * Logger 提供四个日志级别：debug < info(log) < warn < error
 * 需要先调用 Logger.configure() 初始化后才能输出日志
 */
function basicLoggerUsage(): void {
  // 普通信息日志（info 级别）
  Logger.log('这是一条普通日志');

  // 带参数的日志
  Logger.log('用户登录成功', { userId: '123', username: 'admin' });

  // 调试日志（debug 级别，仅在 debug 模式下可见）
  Logger.debug('调试信息：变量值', { count: 42 });

  // 警告日志
  Logger.warn('配置项缺失，将使用默认值');

  // 错误日志（第一个参数为 Error 对象或 unknown）
  Logger.error(new Error('连接超时'), '数据库连接失败');
  Logger.error(null, '操作失败但无异常对象');

  // 检查日志级别是否启用
  if (Logger.enabled('debug')) {
    Logger.debug('只有在 debug 级别启用时才会执行到这里');
  }

  // 将对象转换为可记录的字符串（自动脱敏 accessToken、password、token 等字段）
  const sensitiveData = { username: 'admin', password: 'secret123', token: 'abc-xyz' };
  const safeString = Logger.toLoggable(sensitiveData);
  Logger.log('脱敏后的数据', safeString);
  // 输出: {"username":"admin","password":"<password>","token":"<token>"}

  // 显示输出频道面板
  Logger.showOutputChannel(true); // preserveFocus = true
}

// ============================================================================
// 2. Logger + LogScope —— 带作用域的日志
// ============================================================================

/**
 * 示例：在 Logger 方法中传入 LogScope，实现调用链追踪
 *
 * LogScope 可以关联前后调用关系，日志输出会带上作用域前缀，
 * 方便在复杂调用链中定位问题。
 */
function loggerWithScopeUsage(): void {
  // 创建一个新的日志作用域
  const scope = getNewLogScope('MyService.fetchData', true);

  // 带作用域的日志（第一个参数为 scope）
  Logger.log(scope, '开始获取数据...');
  Logger.debug(scope, '请求参数', { url: '/api/data', method: 'GET' });

  // 模拟一些处理
  try {
    Logger.log(scope, '数据获取成功，开始解析');
    // ... 业务逻辑 ...
    Logger.log(scope, '解析完成');
  } catch (ex) {
    Logger.error(ex, scope, '数据获取失败');
  }
}

/**
 * 示例：使用 startLogScope 创建可自动释放的作用域
 *
 * startLogScope 返回的作用域实现了 Disposable 接口，
 * 可配合 using 语法（TypeScript 5.2+）自动清理。
 */
function logScopeLifecycle(): void {
  // 方式一：手动管理（传统方式）
  const scope = getNewLogScope('TaskRunner.execute', true);
  Logger.log(scope, '任务开始');

  // 设置作用域的退出详情（在任务完成时附加到日志）
  setLogScopeExit(scope, ' — 处理了 100 条记录');
  Logger.log(scope, '任务完成');

  // 设置作用域退出为失败状态
  setLogScopeExit(scope, ' — 重试 3 次后', '超时失败');
  Logger.log(scope, '任务异常');

  // 方式二：使用 startLogScope（自动注册到 scopes Map，支持 Symbol.dispose）
  {
    using _scope = startLogScope('AutoCleanup.process', true);
    Logger.log(_scope, '自动清理作用域内的操作');
    // 离开代码块时自动调用 clearLogScope
  }
}

/**
 * 示例：嵌套作用域 —— 追踪多层调用链路
 */
function nestedScopeUsage(): void {
  // 外层作用域
  const outerScope = getNewLogScope('Repository.save', true);
  Logger.log(outerScope, '开始保存数据');

  // 内层作用域（传入外层 scope，会自动关联 prevScopeId）
  const innerScope = getNewLogScope('.validate', outerScope);
  Logger.log(innerScope, '数据校验中...');
  Logger.log(innerScope, '校验通过');

  // 再嵌套一层
  const deepScope = getNewLogScope('.commit', outerScope);
  Logger.log(deepScope, '提交到数据库');
  Logger.log(deepScope, '提交成功');

  Logger.log(outerScope, '保存完成');
}

// ============================================================================
// 3. @log / @debug 装饰器 —— 方法级别自动日志
// ============================================================================

/**
 * 示例：使用 @log 装饰器自动记录方法的进入、参数、耗时和退出信息
 *
 * @log 装饰器会在方法调用前后自动插入日志，支持：
 * - 自动记录方法参数
 * - 自动记录执行耗时
 * - 自动创建日志作用域
 * - 慢调用告警（超过 500ms 的调用会以 warn 级别记录）
 */
class UserService {
  /**
   * 基础用法：无配置，自动记录参数和耗时
   */
  @log()
  async findUser(userId: string): Promise<{ id: string; name: string } | null> {
    // 模拟数据库查询
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { id: userId, name: '张三' };
  }

  /**
   * 隐藏敏感参数：args 选项可以控制参数的记录方式
   * - false：完全不记录该参数
   * - 字符串：用固定字符串替代
   * - 函数：自定义转换逻辑
   */
  @log<typeof UserService.prototype.login>({
    args: {
      0: (username: string) => username, // 第1个参数：正常记录
      1: '<password>' // 第2个参数：用固定字符串替代密码
    }
  })
  async login(username: string, _password: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return true;
  }

  /**
   * 不记录任何参数
   */
  @log<typeof UserService.prototype.refreshToken>({
    args: false
  })
  async refreshToken(): Promise<string> {
    return 'new-token-xxx';
  }

  /**
   * 记录退出信息：exit 选项
   * - true：记录返回值
   * - 函数：自定义返回值的日志格式
   */
  @log<typeof UserService.prototype.getUserCount>({
    exit: (result) => `共 ${result} 个用户`
  })
  async getUserCount(): Promise<number> {
    return 42;
  }

  /**
   * 记录进入信息：enter 选项
   */
  @log<typeof UserService.prototype.syncData>({
    enter: (source: string) => ` [从 ${source} 同步]`,
    exit: true
  })
  async syncData(source: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return `同步完成: ${source}`;
  }

  /**
   * 条件日志：if 选项，只在满足条件时记录
   */
  @log<typeof UserService.prototype.updateCache>({
    if: function (_key: string, value: unknown) {
      return value != null; // 只有 value 不为 null 时才记录日志
    }
  })
  updateCache(_key: string, _value: unknown): void {
    // 缓存更新逻辑
  }

  /**
   * 自定义前缀：prefix 选项
   */
  @log<typeof UserService.prototype.processTask>({
    prefix: (context, taskId: string) => `[Task:${taskId}] ${context.prefix}`
  })
  async processTask(taskId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  /**
   * 单行日志 + 日志阈值：仅当执行时间超过阈值时才记录
   * 适用于高频调用，避免日志过多
   */
  @log<typeof UserService.prototype.quickLookup>({
    singleLine: true,
    logThreshold: 100 // 仅当耗时 > 100ms 时才记录
  })
  async quickLookup(key: string): Promise<string | null> {
    // 大部分情况下很快返回，不会触发日志
    return `value-of-${key}`;
  }
}

// ============================================================================
// 4. @debug 装饰器 —— 仅在 debug 模式下记录
// ============================================================================

/**
 * 示例：@debug 装饰器与 @log 用法相同，但仅在 debug 级别下生效
 *
 * 适用于开发调试时需要的详细日志，生产环境中不会输出。
 */
class CacheService {
  @debug()
  get(key: string): string | undefined {
    return `cached-${key}`;
  }

  @debug<typeof CacheService.prototype.set>({
    args: {
      0: (key: string) => key,
      1: false // 不记录缓存值（可能很大）
    }
  })
  set(key: string, _value: unknown): void {
    // 设置缓存
  }
}

// ============================================================================
// 5. @logName 装饰器 —— 自定义类的日志名称
// ============================================================================

/**
 * 示例：@logName 装饰器可以自定义类实例在日志中的显示名称
 *
 * 默认情况下日志使用类的构造函数名，@logName 可以提供更有意义的名称。
 * 例如：带有 id 或其他标识信息的名称。
 */
@logName<ConnectionPool>((instance, name) => `${name}(${instance.poolId})`)
class ConnectionPool {
  constructor(public readonly poolId: string) {}

  /**
   * 日志输出会显示为：ConnectionPool(main-pool).connect
   * 而不是普通的：ConnectionPool.connect
   */
  @log()
  async connect(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  @log<typeof ConnectionPool.prototype.query>({
    exit: (result) => `返回 ${result.length} 行`
  })
  async query(_sql: string): Promise<any[]> {
    return [{ id: 1 }, { id: 2 }];
  }
}

// ============================================================================
// 6. 综合示例 —— 模拟真实业务场景
// ============================================================================

/**
 * 综合示例：模拟一个完整的业务操作流程
 *
 * 展示如何在实际业务中组合使用 Logger、装饰器和作用域。
 */
@logName<OrderService>((instance, name) => `${name}#${instance.serviceId}`)
class OrderService {
  readonly serviceId = 'order-001';

  /**
   * 创建订单 —— 自动记录参数、耗时、退出信息
   */
  @log<typeof OrderService.prototype.createOrder>({
    args: {
      0: (userId: string) => userId,
      1: (items: any[]) => `${items.length} 件商品`
    },
    enter: (userId: string) => ` [用户: ${userId}]`,
    exit: (result) => `订单号: ${result.orderId}`
  })
  async createOrder(userId: string, items: { productId: string; quantity: number }[]): Promise<{ orderId: string }> {
    // 手动使用作用域追踪子步骤
    const scope = getNewLogScope('OrderService.createOrder.validate', true);
    Logger.log(scope, `校验 ${items.length} 件商品的库存...`);

    await new Promise((resolve) => setTimeout(resolve, 30));
    Logger.log(scope, '库存校验通过');

    // 模拟创建订单
    const orderId = `ORD-${Date.now()}`;
    Logger.log(`订单创建成功: ${orderId}, 用户: ${userId}`);

    return { orderId: orderId };
  }

  /**
   * 取消订单 —— 使用条件日志，仅在非测试环境下记录
   */
  @log<typeof OrderService.prototype.cancelOrder>({
    if: function () {
      return !Logger.isDebugging; // 示例条件
    },
    exit: true
  })
  async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    Logger.warn(`订单取消请求: ${orderId}, 原因: ${reason}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return true;
  }
}

// ============================================================================
// 运行所有示例
// ============================================================================

export async function runLoggerExample(): Promise<void> {
  Logger.log('========================================');
  Logger.log('开始运行 Logger 使用示例...');
  Logger.log('========================================');

  // 1. Logger 基础用法
  Logger.log('\n>>> 1. Logger 基础用法');
  basicLoggerUsage();

  // 2. Logger + LogScope
  Logger.log('\n>>> 2. Logger + LogScope 作用域日志');
  loggerWithScopeUsage();

  // 3. LogScope 生命周期
  Logger.log('\n>>> 3. LogScope 生命周期管理');
  logScopeLifecycle();

  // 4. 嵌套作用域
  Logger.log('\n>>> 4. 嵌套作用域追踪');
  nestedScopeUsage();

  // 5. @log 装饰器
  Logger.log('\n>>> 5. @log 装饰器示例');
  const userService = new UserService();
  await userService.findUser('user-001');
  await userService.login('admin', 'my-secret-password');
  await userService.refreshToken();
  await userService.getUserCount();
  await userService.syncData('remote-server');
  userService.updateCache('theme', 'dark');
  userService.updateCache('empty', null); // 不会记录日志（if 条件不满足）
  await userService.processTask('task-42');
  await userService.quickLookup('config');

  // 6. @debug 装饰器
  Logger.log('\n>>> 6. @debug 装饰器示例（仅 debug 模式可见）');
  const cacheService = new CacheService();
  cacheService.get('session-key');
  cacheService.set('session-key', { user: 'admin', expires: Date.now() });

  // 7. @logName 装饰器
  Logger.log('\n>>> 7. @logName 装饰器示例');
  const pool = new ConnectionPool('main-pool');
  await pool.connect();
  await pool.query('SELECT * FROM users');

  // 8. 综合业务场景
  Logger.log('\n>>> 8. 综合业务场景');
  const orderService = new OrderService();
  await orderService.createOrder('user-001', [
    { productId: 'prod-1', quantity: 2 },
    { productId: 'prod-2', quantity: 1 }
  ]);
  await orderService.cancelOrder('ORD-12345', '用户主动取消');

  Logger.log('\n========================================');
  Logger.log('所有 Logger 示例运行完成！');
  Logger.log('========================================');
}
