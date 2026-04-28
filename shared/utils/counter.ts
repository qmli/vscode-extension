const maxSmallIntegerV8 = 2 ** 30 - 1; // V8 引擎中可存储的最大小整数（smis）

export type Counter = { readonly current: number; next(): number; reset(): void };

export function getScopedCounter(): Counter {
  let counter = 0;
  return {
    get current() {
      return counter;
    },
    next: function () {
      if (counter === maxSmallIntegerV8) {
        counter = 0;
      }
      return ++counter;
    },
    reset: function () {
      counter = 0;
    }
  };
}
