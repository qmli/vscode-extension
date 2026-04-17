/**
 * 事件系统模块
 *
 * 这个文件实现了一个完整的事件发射器(Emitter)和观察者模式系统，包含：
 * 1. Disposable 接口 - 资源释放接口
 * 2. Event 类型 - 事件订阅函数类型
 * 3. Emitter 类 - 事件发射器，支持事件的订阅和触发
 * 4. LinkedList 类 - 高效的双向链表实现，用于管理监听器
 * 5. Node 类 - 链表节点实现
 *
 * 特点：
 * - 支持 thisArgs 绑定
 * - 自动资源管理
 * - 高效的事件分发
 * - 支持嵌套事件触发
 */

/**
 * 资源释放接口
 * 所有可释放的资源都应该实现这个接口
 */
export interface Disposable {
  /**
   * 释放资源
   */
  dispose(): void;
}

/**
 * 事件订阅函数类型
 *
 * @template T 事件数据的类型
 * @param listener 事件监听器函数
 * @param thisArgs 可选的 this 上下文对象
 * @param disposables 可选的 Disposable 数组，用于批量管理资源
 * @returns 返回一个 Disposable 对象，用于取消订阅
 */
export type Event<T> = (listener: (e: T) => unknown, thisArgs?: unknown, disposables?: Disposable[]) => Disposable;

/**
 * 监听器类型定义
 * 可以是简单的函数，也可以是包含 this 上下文的元组
 *
 * @template T 事件数据的类型
 */
type Listener<T> = [(e: T) => void, unknown] | ((e: T) => void);

/**
 * 事件发射器类
 *
 * 实现了观察者模式，允许对象订阅和取消订阅事件，以及触发事件给所有订阅者。
 * 支持嵌套事件触发和自动资源管理。
 *
 * @template T 事件数据的类型
 */
export class Emitter<T> {
  /**
   * 空操作函数，用于避免重复释放资源
   */
  private static readonly _noop = function (this: void) {
    /* noop */
  };

  /** 标记发射器是否已被释放 */
  private _disposed: boolean = false;

  /** 缓存的事件订阅函数 */
  private _event?: Event<T>;

  /** 事件分发队列，用于处理嵌套事件触发 */
  private _deliveryQueue?: LinkedList<[Listener<T>, T]>;

  /** 监听器列表 */
  protected listeners?: LinkedList<Listener<T>>;

  /**
   * 获取事件订阅器
   *
   * 公开的事件订阅接口，允许外部代码订阅此发射器的事件
   * 使用懒加载模式，只在第一次访问时创建
   *
   * @returns 事件订阅函数
   */
  get event(): Event<T> {
    if (this._event == null) {
      this._event = (listener: (e: T) => unknown, thisArgs?: unknown, disposables?: Disposable[]) => {
        // 懒加载监听器列表
        if (this.listeners == null) {
          this.listeners = new LinkedList();
        }

        // 根据是否有 thisArgs 来决定存储格式
        const remove = this.listeners.push(thisArgs == null ? listener : [listener, thisArgs]);

        // 创建可释放的订阅对象
        const result = {
          dispose: () => {
            // 防止重复释放
            result.dispose = Emitter._noop;
            // 只有在发射器未被释放时才移除监听器
            if (!this._disposed) {
              remove();
            }
          }
        };

        // 如果提供了 disposables 数组，将此订阅添加到数组中以便批量管理
        if (Array.isArray(disposables)) {
          disposables.push(result);
        }

        return result;
      };
    }
    return this._event;
  }

  /**
   * 触发事件
   *
   * 私有方法，用于向所有订阅者分发事件。
   * 使用队列机制处理嵌套事件触发，确保事件按正确顺序处理。
   *
   * @param event 要分发的事件数据
   */
  fire(event: T): void {
    if (this.listeners != null) {
      // 将所有 [监听器, 事件] 对放入分发队列
      // 然后依次触发所有事件。内部/嵌套事件可能是这个过程的驱动者

      // 懒加载分发队列
      if (this._deliveryQueue == null) {
        this._deliveryQueue = new LinkedList();
      }

      // 遍历所有监听器，将它们与事件数据配对加入队列
      for (let iter = this.listeners.iterator(), e = iter.next(); !e.done; e = iter.next()) {
        this._deliveryQueue.push([e.value, event]);
      }

      // 依次处理队列中的所有事件
      while (this._deliveryQueue.size > 0) {
        const [listener, event] = this._deliveryQueue.shift()!;
        try {
          if (typeof listener === 'function') {
            // 简单函数监听器
            listener(event);
          } else {
            // 带有 this 上下文的监听器
            listener[0].call(listener[1], event);
          }
        } catch (_ex) {
          // 监听器执行出错时进入调试模式
          // 在生产环境中，这里可能需要更优雅的错误处理
          console.error('监听器执行出错', _ex);
        }
      }
    }
  }

  /**
   * 释放发射器资源
   *
   * 清理所有监听器和分发队列，标记为已释放状态
   */
  dispose(): void {
    this.listeners?.clear();
    this._deliveryQueue?.clear();
    this._disposed = true;
  }
}

/**
 * 迭代器有值结果接口
 * 表示迭代器还有更多值可以返回
 *
 * @template T 值的类型
 */
interface IteratorDefinedResult<T> {
  readonly done: false;
  readonly value: T;
}

/**
 * 迭代器无值结果接口
 * 表示迭代器已经遍历完成
 */
interface IteratorUndefinedResult {
  readonly done: true;
  readonly value: undefined;
}

/** 迭代器结束标记常量 */
const FIN: IteratorUndefinedResult = { done: true, value: undefined };

/**
 * 迭代器结果类型
 * 可能是有值的结果或表示结束的结果
 *
 * @template T 值的类型
 */
type IteratorResult<T> = IteratorDefinedResult<T> | IteratorUndefinedResult;

/**
 * 迭代器接口
 *
 * @template T 迭代的元素类型
 */
interface Iterator<T> {
  /**
   * 获取下一个元素
   *
   * @returns 迭代器结果，包含值或结束标记
   */
  next(): IteratorResult<T>;
}

/**
 * 双向链表节点类
 *
 * @template E 节点存储的元素类型
 */
class Node<E> {
  /** 表示未定义节点的静态常量 */
  static readonly Undefined = new Node<any>(undefined);

  /** 节点存储的元素 */
  element: E;

  /** 指向下一个节点的引用 */
  next: Node<E>;

  /** 指向前一个节点的引用 */
  prev: Node<E>;

  /**
   * 创建新节点
   *
   * @param element 要存储的元素
   */
  constructor(element: E) {
    this.element = element;
    this.next = Node.Undefined;
    this.prev = Node.Undefined;
  }
}

/**
 * 双向链表类
 *
 * 高效的双向链表实现，支持在头部和尾部插入/删除元素，
 * 以及迭代和转换为数组等操作。
 *
 * @template E 列表元素的类型
 */
class LinkedList<E> {
  /** 链表的第一个节点 */
  private _first: Node<E> = Node.Undefined;

  /** 链表的最后一个节点 */
  private _last: Node<E> = Node.Undefined;

  /** 链表中元素的数量 */
  private _size: number = 0;

  /**
   * 获取链表大小
   *
   * @returns 链表中元素的数量
   */
  get size(): number {
    return this._size;
  }

  /**
   * 检查链表是否为空
   *
   * @returns 如果链表为空返回 true，否则返回 false
   */
  isEmpty(): boolean {
    return this._first === Node.Undefined;
  }

  /**
   * 清空链表
   *
   * 移除所有元素，重置链表状态
   */
  clear(): void {
    this._first = Node.Undefined;
    this._last = Node.Undefined;
    this._size = 0;
  }

  /**
   * 在链表头部插入元素
   *
   * @param element 要插入的元素
   * @returns 用于移除此元素的函数
   */
  unshift(element: E): () => void {
    return this._insert(element, false);
  }

  /**
   * 在链表尾部插入元素
   *
   * @param element 要插入的元素
   * @returns 用于移除此元素的函数
   */
  push(element: E): () => void {
    return this._insert(element, true);
  }

  /**
   * 内部插入方法
   *
   * @param element 要插入的元素
   * @param atTheEnd 是否在尾部插入（true）还是头部插入（false）
   * @returns 用于移除此元素的函数
   */
  private _insert(element: E, atTheEnd: boolean): () => void {
    const newNode = new Node(element);

    if (this._first === Node.Undefined) {
      // 空链表，新节点成为唯一节点
      this._first = newNode;
      this._last = newNode;
    } else if (atTheEnd) {
      // 在尾部插入
      const oldLast = this._last;
      this._last = newNode;
      newNode.prev = oldLast;
      oldLast.next = newNode;
    } else {
      // 在头部插入
      const oldFirst = this._first;
      this._first = newNode;
      newNode.next = oldFirst;
      oldFirst.prev = newNode;
    }

    this._size += 1;

    // 返回移除函数，使用闭包确保只能移除一次
    let didRemove = false;
    return () => {
      if (!didRemove) {
        didRemove = true;
        this._remove(newNode);
      }
    };
  }

  /**
   * 移除并返回链表头部元素
   *
   * @returns 头部元素，如果链表为空则返回 undefined
   */
  shift(): E | undefined {
    if (this._first === Node.Undefined) {
      return undefined;
    }
    const res = this._first.element;
    this._remove(this._first);
    return res;
  }

  /**
   * 移除并返回链表尾部元素
   *
   * @returns 尾部元素，如果链表为空则返回 undefined
   */
  pop(): E | undefined {
    if (this._last === Node.Undefined) {
      return undefined;
    }
    const res = this._last.element;
    this._remove(this._last);
    return res;
  }

  /**
   * 内部移除方法
   *
   * 从链表中移除指定节点，正确处理各种边界情况
   *
   * @param node 要移除的节点
   */
  private _remove(node: Node<E>): void {
    if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
      // 中间节点：连接前后节点
      const anchor = node.prev;
      anchor.next = node.next;
      node.next.prev = anchor;
    } else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
      // 唯一节点：清空链表
      this._first = Node.Undefined;
      this._last = Node.Undefined;
    } else if (node.next === Node.Undefined) {
      // 尾节点：更新尾部指针
      this._last = this._last.prev;
      this._last.next = Node.Undefined;
    } else if (node.prev === Node.Undefined) {
      // 头节点：更新头部指针
      this._first = this._first.next;
      this._first.prev = Node.Undefined;
    }

    // 更新大小
    this._size -= 1;
  }

  /**
   * 创建链表迭代器
   *
   * @returns 可用于遍历链表的迭代器
   */
  iterator(): Iterator<E> {
    let element: { done: false; value: E };
    let node = this._first;

    return {
      next: function (): IteratorResult<E> {
        if (node === Node.Undefined) {
          return FIN;
        }

        // 重用结果对象以减少内存分配
        if (element == null) {
          element = { done: false, value: node.element };
        } else {
          element.value = node.element;
        }

        node = node.next;
        return element;
      }
    };
  }

  /**
   * 将链表转换为数组
   *
   * @returns 包含链表所有元素的数组
   */
  toArray(): E[] {
    const result: E[] = [];
    for (let node = this._first; node !== Node.Undefined; node = node.next) {
      result.push(node.element);
    }
    return result;
  }
}
