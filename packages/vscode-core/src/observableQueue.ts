export class ObservableQueue<T> {
  private queue: T[] = [];
  private listeners: ((item: T) => void)[] = [];

  public enqueue(item: T): void {
    this.queue.push(item);
    // 使用 try-catch 防止某个监听器错误影响其他监听器
    this.listeners.forEach((listener) => {
      try {
        listener(item);
      } catch (error) {
        console.error('ObservableQueue listener error:', error);
      }
    });
  }

  public dequeue(): T | undefined {
    return this.queue.shift();
  }

  public onEnqueue(listener: (item: T) => void): () => void {
    this.listeners.push(listener);
    // 返回移除函数，方便清理监听器
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public offEnqueue(listener: (item: T) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public size(): number {
    return this.queue.length;
  }

  public peek(): T | undefined {
    return this.queue[0];
  }

  public clear(): void {
    this.queue = [];
  }

  public clearListeners(): void {
    this.listeners = [];
  }
}
