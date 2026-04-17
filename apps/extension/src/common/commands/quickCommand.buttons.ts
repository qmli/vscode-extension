/**
 * 定义了与 QuickPick 和 QuickInput 相关的按钮逻辑。
 * 提供了按钮的行为处理，例如确认、取消、加载更多等。
 */
import type { QuickInput, QuickInputButton } from 'vscode';
import { ThemeIcon, Uri } from 'vscode';
import { Container } from '@/container';

/**
 * 状态管理：通过 on 属性表示当前是“开”还是“关”状态。可以通过设置 on 属性来切换状态。
 * 图标和提示：根据当前状态，动态显示不同的图标（iconPath）和提示文本（tooltip）。图标可以是字符串（SVG 文件名）、VS Code 的 ThemeIcon，或自定义的亮/暗主题图标对象。
 * 构造参数：
 * state：定义“开”和“关”状态下的图标和提示，可以是对象或返回该对象的函数（支持动态变化）。
 * _on：初始状态，默认为 false（关）。
 * 点击事件：可选的 onDidClick 方法，允许在按钮被点击时执行自定义逻辑（如刷新界面或切换状态）。
 */
export class ToggleQuickInputButton implements QuickInputButton {
  constructor(
    private readonly state:
      | {
          on: { icon: string | { light: Uri; dark: Uri } | ThemeIcon; tooltip: string };
          off: { icon: string | { light: Uri; dark: Uri } | ThemeIcon; tooltip: string };
        }
      | (() => {
          on: { icon: string | { light: Uri; dark: Uri } | ThemeIcon; tooltip: string };
          off: { icon: string | { light: Uri; dark: Uri } | ThemeIcon; tooltip: string };
        }),
    private _on = false
  ) {}

  get iconPath(): { light: Uri; dark: Uri } | ThemeIcon {
    const icon = this.getToggledState().icon;
    return typeof icon === 'string'
      ? {
          dark: Uri.file(Container.instance.context.asAbsolutePath(`images/dark/${icon}.svg`)),
          light: Uri.file(Container.instance.context.asAbsolutePath(`images/light/${icon}.svg`))
        }
      : icon;
  }

  get tooltip(): string {
    return this.getToggledState().tooltip;
  }

  get on(): boolean {
    return this._on;
  }
  set on(value: boolean) {
    this._on = value;
  }

  /**
   * @returns 如果步骤应该重试（刷新），则返回 `true`
   */
  onDidClick?(quickInput: QuickInput): boolean | void | Promise<boolean | void>;

  private getState() {
    return typeof this.state === 'function' ? this.state() : this.state;
  }

  private getToggledState() {
    return this.on ? this.getState().on : this.getState().off;
  }
}

export const RenameFileQuickInputButton: QuickInputButton = {
  iconPath: new ThemeIcon('edit'),
  tooltip: 'Rename File'
};

export const CopyCommitShaQuickInputButton: QuickInputButton = {
  iconPath: new ThemeIcon('copy'),
  tooltip: 'Copy SHA'
};

export const CompareWithWorkingQuickInputButton: QuickInputButton = {
  iconPath: new ThemeIcon('diff'),
  tooltip: 'Compare with Working Tree'
};

export const LoadMoreQuickInputButton: QuickInputButton = {
  iconPath: new ThemeIcon('refresh'),
  tooltip: 'Load More'
};

export class FileContextQuickInputButton extends ToggleQuickInputButton {
  constructor(
    private readonly context: {
      hasCommit?: boolean;
      hasFile?: boolean;
      allowRename?: boolean;
    },
    on = false
  ) {
    super(
      () => ({
        on: {
          tooltip: '隐藏文件操作',
          icon: new ThemeIcon('chevron-up')
        },
        off: {
          tooltip: '显示文件操作',
          icon: new ThemeIcon('chevron-down')
        }
      }),
      on
    );
  }

  override onDidClick(_quickInput: QuickInput): boolean | void {
    // Toggle visibility of context-specific actions
    this.on = !this.on;
    return true; // Refresh the quick pick
  }
}

export const WillConfirmForcedQuickInputButton: QuickInputButton = {
  iconPath: new ThemeIcon('autosar-confirm-checked'),
  tooltip: '在执行操作之前，您将被要求进行必要的确认步骤'
};

export const checkboxButton: QuickInputButton = {
  iconPath: new ThemeIcon('check'),
  tooltip: '请选择'
};

export class WillConfirmToggleQuickInputButton extends ToggleQuickInputButton {
  constructor(on = false, isConfirmationStep: boolean, onDidClick?: (quickInput: QuickInput) => void) {
    super(
      () => ({
        on: {
          tooltip: isConfirmationStep
            ? '对于未来的操作，执行操作之前将会显示确认步骤\n点击切换'
            : '执行操作之前将会显示确认步骤\n点击切换',
          icon: new ThemeIcon('autosar-confirm-checked')
        },
        off: {
          tooltip: isConfirmationStep
            ? '对于未来的操作，执行操作之前不会显示确认步骤\n点击切换'
            : '执行操作之前不会显示确认步骤\n点击切换',
          icon: new ThemeIcon('autosar-confirm-unchecked')
        }
      }),
      on
    );

    this.onDidClick = onDidClick;
  }
}
