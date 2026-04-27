import type { QuickPickItem, ThemeIcon, Uri } from 'vscode';
import { commands, QuickPickItemKind } from 'vscode';

/**
 * 快速选择列表中的分隔项。
 * 用于在列表中插入分组标题或视觉分隔。
 */
export interface QuickPickSeparator extends QuickPickItem {
  kind: QuickPickItemKind.Separator;
}

/**
 * 创建快速选择分隔项。
 * @param label - 可选的分隔标题文案
 * @returns 分隔项实例
 */
export function createQuickPickSeparator<T = QuickPickSeparator>(label?: string): T {
  return { kind: QuickPickItemKind.Separator, label: label ?? '' } as unknown as T;
}

/**
 * 带关联数据的快速选择项。
 * 选中后可通过 item 拿到原始数据，便于与业务类型绑定。
 */
export interface QuickPickItemOfT<T = unknown> extends QuickPickItem {
  readonly item: T;
}

/**
 * 创建带关联数据的快速选择项。
 * @param labelOrItem - 显示文案或已有 QuickPickItem
 * @param item - 关联的业务数据
 * @returns 带 item 的 QuickPickItem
 */
export function createQuickPickItemOfT<T = unknown>(labelOrItem: string | QuickPickItem, item: T): QuickPickItemOfT<T> {
  return typeof labelOrItem === 'string' ? { label: labelOrItem, item: item } : { ...labelOrItem, item: item };
}

/**
 * 快速选择结果：要么返回选中值，要么返回指令（如取消、上一步等）。
 */
export type QuickPickResult<T> = { value: T | undefined; directive?: never } | { directive: number; value?: never };

/**
 * 执行 VS Code 命令的快速选择项。
 * 选中后会调用对应命令（command 参数为字符串命令 id）。
 */
export class CommandQuickPickItem<Arguments extends any[] = any[]> implements QuickPickItem {
  /** 从命令创建一项（仅 label + command，无图标） */
  static fromCommand<T>(label: string, command: string, args?: T): CommandQuickPickItem;
  /** 从已有 QuickPickItem + 命令创建 */
  static fromCommand<T>(item: QuickPickItem, command: string, args?: T): CommandQuickPickItem;
  static fromCommand<T>(labelOrItem: string | QuickPickItem, command: string, args?: T): CommandQuickPickItem {
    return new CommandQuickPickItem(
      typeof labelOrItem === 'string' ? { label: labelOrItem } : labelOrItem,
      undefined,
      command,
      args == null ? [] : Array.isArray(args) ? args : [args]
    );
  }

  /** 判断是否为 CommandQuickPickItem 实例 */
  static is(item: QuickPickItem): item is CommandQuickPickItem {
    return item instanceof CommandQuickPickItem;
  }

  /** 显示主文案 */
  label!: string;
  /** 描述（副标题） */
  description?: string;
  /** 详情说明 */
  detail?: string | undefined;
  /** 图标：Uri、深浅主题双 Uri 或 ThemeIcon */
  iconPath?: Uri | { light: Uri; dark: Uri } | ThemeIcon | undefined;

  constructor(
    labelOrItem: string | QuickPickItem,
    iconPath?: Uri | { light: Uri; dark: Uri } | ThemeIcon | undefined,
    protected readonly command?: string,
    protected readonly args?: Arguments,
    protected readonly options?: {
      onDidPressKey?: (key: string, result: Thenable<unknown>) => void;
      suppressKeyPress?: boolean;
    }
  ) {
    this.command = command;
    this.args = args;

    if (typeof labelOrItem === 'string') {
      this.label = labelOrItem;
    } else {
      Object.assign(this, labelOrItem);
    }

    if (iconPath != null) {
      this.iconPath = iconPath;
    }
  }

  execute(_options?: { preserveFocus?: boolean; preview?: boolean }): Promise<unknown | undefined> {
    if (this.command === undefined) return Promise.resolve(undefined);

    const result = commands.executeCommand(this.command, ...(this.args ?? [])) as Promise<unknown | undefined>;
    return result;
  }

  async onDidPressKey(key: string): Promise<void> {
    if (this.options?.suppressKeyPress) return;

    const result = this.execute({ preserveFocus: true, preview: false });
    this.options?.onDidPressKey?.(key, result);
    void (await result);
  }
}

/**
 * 仅执行自定义逻辑的快速选择项，不绑定任何命令。
 * 适用于需要在选中时执行特定函数，而非调用 VS Code 命令的场景。
 */
export class ActionQuickPickItem extends CommandQuickPickItem {
  constructor(
    labelOrItem: string | QuickPickItem,
    private readonly action: (options?: { preserveFocus?: boolean; preview?: boolean }) => void | Promise<void>
  ) {
    super(labelOrItem, undefined, undefined);
  }

  override async execute(options?: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
    return this.action(options);
  }
}
