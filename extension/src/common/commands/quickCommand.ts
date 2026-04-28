/**
 * QuickCommand 基类定义：
 * - 提供 steps 方法用于定义命令的步骤。
 * - 管理 QuickPick 和 QuickInput 的生命周期。
 * - 负责执行命令的逻辑。
 */

import type { InputBox, QuickInput, QuickInputButton, QuickPick, QuickPickItem } from 'vscode';
import type { Keys } from '@/common/constants/constants';
import type { Container } from '@/container';
import { createQuickPickSeparator } from '@/quickpicks/items/common';
import type { DirectiveQuickPickItem } from '@/quickpicks/items/directive';
import { createDirectiveQuickPickItem, Directive, isDirective } from '@/quickpicks/items/directive';
import type { GlCommands } from '@packages/common/webviews/constants/constants.commands';
import type { UnifiedDisposable } from '@orientais/vscode-core';
import { createDisposable } from '@orientais/vscode-core';

/**
 * 定义一个类型工具，用于将某些属性设置为可选。
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };

/**
 * 自定义步骤接口，用于定义命令的自定义步骤。
 */
export interface CustomStep<T = unknown> {
  type: 'custom'; // 步骤类型为自定义
  ignoreFocusOut?: boolean; // 是否忽略焦点丢失
  show(step: CustomStep<T>): Promise<StepResult<Directive | T>>; // 显示步骤的逻辑
}

/**
 * 判断一个步骤是否为自定义步骤。
 */
export function isCustomStep(
  step: QuickPickStep | QuickInputStep | CustomStep | typeof StepResultBreak
): step is CustomStep {
  return typeof step === 'object' && 'type' in step && step.type === 'custom';
}

/**
 * QuickInput 步骤接口，用于定义输入框步骤。
 */
export interface QuickInputStep<T extends string = string> {
  type: 'input'; // 步骤类型为输入框
  additionalButtons?: QuickInputButton[]; // 额外的按钮
  buttons?: QuickInputButton[]; // 输入框按钮
  disallowBack?: boolean; // 是否禁止返回
  ignoreFocusOut?: boolean; // 是否忽略焦点丢失
  isConfirmationStep?: boolean; // 是否为确认步骤
  keys?: StepNavigationKeys[]; // 导航键
  placeholder?: string; // 输入框占位符
  prompt?: string; // 输入框提示
  title?: string; // 步骤标题
  value?: T; // 输入框的初始值
  input?: QuickInput; // 输入框实例
  freeze?: () => UnifiedDisposable; // 冻结输入框的逻辑
  frozen?: boolean; // 是否已冻结
  onDidActivate?(input: QuickInput): void; // 激活输入框时的回调
  onDidClickButton?(input: InputBox, button: QuickInputButton): boolean | void | Promise<boolean | void>; // 点击按钮时的回调
  onDidPressKey?(quickpick: InputBox, key: Keys): void | Promise<void>; // 按键时的回调
  validate?(value: T | undefined): [boolean, T | undefined] | Promise<[boolean, T | undefined]>; // 验证输入值的逻辑
}

/**
 * 判断一个步骤是否为 QuickInput 步骤。
 */
export function isQuickInputStep(
  step: QuickPickStep | QuickInputStep | CustomStep | typeof StepResultBreak
): step is QuickInputStep {
  return typeof step === 'object' && 'type' in step && step.type === 'input';
}

/**
 * QuickPick 步骤接口，用于定义选择框步骤。
 */
export interface QuickPickStep<T extends QuickPickItem = QuickPickItem> {
  type: 'pick'; // 步骤类型为选择框
  additionalButtons?: QuickInputButton[]; // 额外的按钮
  allowEmpty?: boolean; // 是否允许空选择
  buttons?: QuickInputButton[]; // 选择框按钮
  disallowBack?: boolean; // 是否禁止返回
  ignoreFocusOut?: boolean; // 是否忽略焦点丢失
  isConfirmationStep?: boolean; // 是否为确认步骤
  items: (DirectiveQuickPickItem | T)[] | Promise<(DirectiveQuickPickItem | T)[]>; // 选择项
  keys?: StepNavigationKeys[]; // 导航键
  matchOnDescription?: boolean; // 是否匹配描述
  matchOnDetail?: boolean; // 是否匹配详情
  multiselect?: boolean; // 是否支持多选
  placeholder?: string | ((count: number) => string); // 选择框占位符
  selectedItems?: QuickPickItem[]; // 默认选中的项
  title?: string; // 步骤标题
  value?: string; // 选择框的初始值
  selectValueWhenShown?: boolean; // 显示时是否选中值
  quickpick?: QuickPick<DirectiveQuickPickItem | T>; // 选择框实例
  freeze?: () => UnifiedDisposable; // 冻结选择框的逻辑
  frozen?: boolean; // 是否已冻结
  onDidActivate?(quickpick: QuickPick<DirectiveQuickPickItem | T>): void; // 激活选择框时的回调
  onDidAccept?(quickpick: QuickPick<DirectiveQuickPickItem | T>): boolean | Promise<boolean>; // 接受选择时的回调
  onDidChangeValue?(quickpick: QuickPick<DirectiveQuickPickItem | T>): boolean | Promise<boolean>; // 值改变时的回调
  onDidChangeSelection?(quickpick: QuickPick<DirectiveQuickPickItem | T>, selection: readonly T[]): void; // 选择改变时的回调
  onDidClickButton?(
    quickpick: QuickPick<DirectiveQuickPickItem | T>,
    button: QuickInputButton
  ): boolean | void | Promise<boolean | void | IteratorResult<QuickPickStep | QuickInputStep | CustomStep | undefined>>; // 点击按钮时的回调
  onDidClickItemButton?(
    quickpick: QuickPick<DirectiveQuickPickItem | T>,
    button: QuickInputButton,
    item: T
  ): boolean | void | Promise<boolean | void>; // 点击项按钮时的回调
  onDidLoadMore?(
    quickpick: QuickPick<DirectiveQuickPickItem | T>
  ): (DirectiveQuickPickItem | T)[] | Promise<(DirectiveQuickPickItem | T)[]>; // 加载更多项时的回调
  onDidPressKey?(quickpick: QuickPick<DirectiveQuickPickItem | T>, key: Keys, item: T): void | Promise<void>; // 按键时的回调
  onValidateValue?(
    quickpick: QuickPick<DirectiveQuickPickItem | T>,
    value: string,
    items: T[]
  ): boolean | Promise<boolean>; // 验证值的逻辑
  validate?(selection: T[]): boolean; // 验证选择项的逻辑
}

/**
 * 判断一个步骤是否为 QuickPick 步骤。
 */
export function isQuickPickStep(
  step: QuickPickStep | QuickInputStep | CustomStep | typeof StepResultBreak
): step is QuickPickStep {
  return typeof step === 'object' && 'type' in step && step.type === 'pick';
}

// 定义步骤生成器类型，用于生成步骤序列
export type StepGenerator =
  | Generator<QuickPickStep | QuickInputStep | CustomStep, StepResult<void | undefined>>
  | AsyncGenerator<QuickPickStep | QuickInputStep | CustomStep, StepResult<void | undefined>>;

export type StepItemType<T> =
  T extends CustomStep<infer U>
    ? U
    : T extends QuickPickStep<infer U>
      ? U[]
      : T extends QuickInputStep
        ? string
        : never;
export type StepNavigationKeys = Exclude<Keys, 'left' | 'alt+left' | 'ctrl+left'>; // 定义步骤导航键类型，排除某些键
export const StepResultBreak = Symbol('BreakStep'); // 定义步骤结果类型，可以是 BreakStep 或其他值
export type StepResult<T> = typeof StepResultBreak | T;
export type StepResultGenerator<T> = Generator<QuickPickStep | QuickInputStep | CustomStep, StepResult<T>>; // 定义步骤状态类型，用于存储步骤的状态信息
export type AsyncStepResultGenerator<T> = AsyncGenerator<QuickPickStep | QuickInputStep | CustomStep, StepResult<T>>;
export type StepSelection<T> =
  T extends CustomStep<infer U>
    ? Exclude<U, DirectiveQuickPickItem> | Directive
    : T extends QuickPickStep<infer U>
      ? Exclude<U, DirectiveQuickPickItem>[] | Directive
      : T extends QuickInputStep
        ? string | Directive
        : never;
// 定义步骤状态类型，用于存储步骤的状态信息
export type PartialStepState<T = unknown> = Partial<T> & { counter: number; confirm?: boolean; startingStep?: number };
export type StepState<T = Record<string, unknown>> = T & { counter: number; confirm?: boolean; startingStep?: number };

/**
 * 定义 QuickCommand 抽象类，用于实现步骤逻辑
 */
export abstract class QuickCommand<State = any> implements QuickPickItem {
  readonly description?: string;
  readonly detail?: string;

  protected initialState: PartialStepState<State> | undefined;

  private _currentStep: QuickPickStep | QuickInputStep | CustomStep | undefined;
  private _stepsIterator: StepGenerator | undefined;

  constructor(
    protected readonly container: Container,
    public readonly key: string,
    public readonly label: string,
    public readonly title: string,
    options?: {
      description?: string;
      detail?: string;
    }
  ) {
    this.description = options?.description;
    this.detail = options?.detail;
  }

  get canConfirm(): boolean {
    return true;
  }

  get canSkipConfirm(): boolean {
    return true;
  }

  private _picked: boolean = false;
  get picked(): boolean {
    return this._picked;
  }
  set picked(value: boolean) {
    this._picked = value;
    if (!value) {
      this._pickedVia = 'menu';
    }
  }

  private _pickedVia: 'menu' | 'command' = 'menu';
  get pickedVia(): 'menu' | 'command' {
    return this._pickedVia;
  }
  set pickedVia(value: 'menu' | 'command') {
    this._pickedVia = value;
  }

  get skipConfirmKey(): string {
    return `${this.key}:${this.pickedVia}`;
  }

  get value(): QuickPickStep | QuickInputStep | CustomStep | undefined {
    return this._currentStep;
  }

  confirm(override?: boolean): boolean {
    if (!this.canConfirm || !this.canSkipConfirm) return true;

    return override != null ? override : true;
  }

  isMatch(key: string): boolean {
    return this.key === key;
  }

  isFuzzyMatch(name: string): boolean {
    return this.label === name;
  }

  protected abstract steps(state: PartialStepState<State>): StepGenerator;

  executeSteps(): StepGenerator {
    // 当我们将步骤串联在一起时，限制向后导航以获得更自然的体验
    return this.steps(this.getStepState(true));
  }

  async previous(): Promise<QuickPickStep | QuickInputStep | undefined> {
    return (await this.next(Directive.Back)).value;
  }

  async next(
    value?: StepSelection<any>
  ): Promise<IteratorResult<QuickPickStep | QuickInputStep | CustomStep | undefined>> {
    if (this._stepsIterator == null) {
      this._stepsIterator = this.steps(this.getStepState(false));
    }

    const result = await this._stepsIterator.next(value);
    if (result.done) {
      this.initialState = undefined;
      this._stepsIterator = undefined;
    }

    if (result.value === StepResultBreak) {
      this._currentStep = undefined;
      return { ...result, value: undefined };
    }

    this._currentStep = result.value as Exclude<typeof result.value, void | typeof StepResultBreak>;
    return result;
  }

  async retry(): Promise<QuickPickStep | QuickInputStep | CustomStep | undefined> {
    await this.next(Directive.Noop);
    return this.value;
  }

  protected canStepsContinue(state: PartialStepState): boolean {
    return state.counter >= (state.startingStep ?? 0);
  }

  protected createConfirmStep<T extends QuickPickItem>(
    title: string,
    confirmations: T[],
    cancel?: DirectiveQuickPickItem,
    options: Partial<QuickPickStep<T>> = {}
  ): QuickPickStep<T> {
    return createConfirmStep(title, confirmations, { title: this.title }, cancel, options);
  }

  protected getStepState(limitBackNavigation: boolean): PartialStepState<State> {
    // 将最小步骤设置为初始计数器，以便后退按钮按预期工作
    const state: PartialStepState<State> = {
      counter: 0,
      ...this.initialState,
      startingStep: limitBackNavigation ? (this.initialState?.counter ?? 0) : 0
    } as unknown as PartialStepState<State>;
    return state;
  }
}

export function isQuickCommand(item: QuickPickItem): item is QuickCommand {
  return item instanceof QuickCommand;
}

// 判断输入步骤是否可以继续
export async function canInputStepContinue<T extends QuickInputStep>(
  step: T,
  state: PartialStepState,
  value: Directive | StepItemType<T>
): Promise<boolean> {
  if (!canStepContinue(step, state, value)) return false;

  const [valid] = (await step.validate?.(value)) ?? [true];
  if (valid) {
    state.counter++;
    return true;
  }

  return false;
}
// 判断选择步骤是否可以继续
export function canPickStepContinue<T extends QuickPickStep>(
  step: T,
  state: PartialStepState,
  selection: Directive | StepItemType<T>
): selection is StepItemType<T> {
  if (!canStepContinue(step, state, selection)) return false;

  if (step.validate?.(selection) ?? true) {
    state.counter++;
    return true;
  }

  return false;
}

// 判断步骤是否可以继续
export function canStepContinue<T extends QuickInputStep | QuickPickStep | CustomStep>(
  _step: T,
  state: PartialStepState,
  result: Directive | StepItemType<T>
): result is StepItemType<T> {
  if (result == null) return false;

  if (isDirective(result)) {
    switch (result) {
      case Directive.Back:
        state.counter--;
        if (state.counter <= (state.startingStep ?? 0)) {
          state.counter = 0;
        }
        break;
      case Directive.Cancel:
        endSteps(state);
        break;
    }
    return false;
  }

  return true;
}
// 创建确认步骤
export function createConfirmStep<T extends QuickPickItem, Context extends { title: string }>(
  title: string,
  confirmations: T[],
  context: Context,
  cancel?: DirectiveQuickPickItem,
  options?: Partial<QuickPickStep<T>>
): QuickPickStep<T> {
  return createPickStep<T>({
    isConfirmationStep: true,
    placeholder: `Confirm ${context.title}`,
    title: title,
    ignoreFocusOut: true,
    items: [...confirmations, createQuickPickSeparator<T>(), cancel ?? createDirectiveQuickPickItem(Directive.Cancel)],
    selectedItems: [confirmations.find((c) => c.picked) ?? confirmations[0]],
    ...options
  });
}
// 创建输入步骤
export function createInputStep<T extends string>(step: Optional<QuickInputStep<T>, 'type'>): QuickInputStep<T> {
  const original = step.onDidActivate;
  // 确保任何输入步骤在失去焦点时不会关闭
  step = { type: 'input' as const, ...step, ignoreFocusOut: true };
  step.onDidActivate = (input) => {
    step.input = input;
    step.freeze = () => {
      input.enabled = false;
      step.frozen = true;
      return createDisposable(
        () => {
          step.frozen = false;
          input.enabled = true;
          input.show();
        },
        { once: true }
      );
    };
    original?.(input);
  };

  return step as QuickInputStep<T>;
}

// 创建选择步骤
export function createPickStep<T extends QuickPickItem>(step: Optional<QuickPickStep<T>, 'type'>): QuickPickStep<T> {
  const original = step.onDidActivate;
  step = { type: 'pick' as const, ...step };
  step.onDidActivate = (qp) => {
    step.quickpick = qp;
    step.freeze = () => {
      qp.enabled = false;
      const originalFocusOut = qp.ignoreFocusOut;
      qp.ignoreFocusOut = true;
      step.frozen = true;
      return createDisposable(
        () => {
          step.frozen = false;
          qp.enabled = true;
          qp.ignoreFocusOut = originalFocusOut;
          qp.show();
        },
        { once: true }
      );
    };
    original?.(qp);
  };

  return step as QuickPickStep<T>;
}

// 创建自定义步骤
export function createCustomStep<T>(step: Optional<CustomStep<T>, 'type'>): CustomStep<T> {
  return { type: 'custom', ...step };
}
// 结束步骤
export function endSteps(state: PartialStepState): void {
  state.counter = -1;
}
// 定义跨命令引用接口
export interface CrossCommandReference<T = unknown> {
  command: GlCommands;
  args?: T;
}

// 判断是否为跨命令引用
export function isCrossCommandReference<T = unknown>(value: any): value is CrossCommandReference<T> {
  return value.command != null;
}

// 创建跨命令引用
export function createCrossCommandReference<T>(command: GlCommands, args: T): CrossCommandReference<T> {
  return { command: command, args: args };
}
