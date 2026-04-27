import type { QuickPickItem, ThemeIcon, Uri } from 'vscode';

export enum Directive {
  Back,
  Cancel,
  Reset,
  LoadMore,
  Noop,
  Reload
}

export function isDirective<T>(value: Directive | T): value is Directive {
  return typeof value === 'number' && Directive[value] != null;
}

export interface DirectiveQuickPickItem extends QuickPickItem {
  directive: Directive;
  onDidSelect?: () => void | Promise<void>;
}

export function createDirectiveQuickPickItem(
  directive: Directive,
  picked?: boolean,
  options?: {
    label?: string;
    description?: string;
    detail?: string;
    buttons?: QuickPickItem['buttons'];
    iconPath?: Uri | { light: Uri; dark: Uri } | ThemeIcon;
    onDidSelect?: () => void | Promise<void>;
  }
): DirectiveQuickPickItem {
  let label = options?.label;
  const detail = options?.detail;
  const description = options?.description;
  if (label == null) {
    switch (directive) {
      case Directive.Back:
        label = 'Back';
        break;
      case Directive.Cancel:
        label = 'Cancel';
        break;
      case Directive.LoadMore:
        label = 'Load more';
        break;
      case Directive.Noop:
        label = 'Try again';
        break;
      case Directive.Reload:
        label = 'Refresh';
        break;
      case Directive.Reset:
        label = 'Reset';
        break;
    }
  }

  const item: DirectiveQuickPickItem = {
    label: label,
    description: description,
    detail: detail,
    iconPath: options?.iconPath,
    buttons: options?.buttons,
    alwaysShow: true,
    picked: picked,
    directive: directive,
    onDidSelect: options?.onDidSelect
  };

  return item;
}

export function isDirectiveQuickPickItem(item: QuickPickItem): item is DirectiveQuickPickItem {
  return item != null && 'directive' in item;
}
