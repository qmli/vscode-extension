/**
 * CommandQuickPickItem / ActionQuickPickItem / QuickPickResult 使用示例
 *
 * 展示用法包括：
 * - CommandQuickPickItem.fromCommand(label, command) / fromCommand(item, command)
 * - new CommandQuickPickItem(labelOrItem, iconPath?, command?, args?, options?)
 * - options.onDidPressKey、options.suppressKeyPress
 * - ActionQuickPickItem：仅执行自定义逻辑，不执行 GlCommands
 * - createQuickPickSeparator 分组
 * - QuickPickResult<T>：选中值 | 指令（取消/上一步等）的类型收窄与处理
 * - 选中后 execute() 或按 result 分支处理，支持异步
 */
import type { Disposable, QuickPickItem } from 'vscode';
import { ThemeIcon, window } from 'vscode';
import type { QuickPickResult } from '../items/common';
import { ActionQuickPickItem, CommandQuickPickItem, createQuickPickSeparator } from '../items/common';
import { createDirectiveQuickPickItem, Directive, isDirectiveQuickPickItem } from '../items/directive';

/** 展示由 CommandQuickPickItem / ActionQuickPickItem 组成的快速选择框，选中即执行并关闭 */
export async function showCommandQuickPickExample(title: string = '选择要执行的命令'): Promise<void> {
  const items: QuickPickItem[] = [
    createQuickPickSeparator('工作区与项目'),
    CommandQuickPickItem.fromCommand('切换工作区', 'autosar.workspace.switch'),
    CommandQuickPickItem.fromCommand('工作区配置', 'autosar.workspace'),
    new CommandQuickPickItem(
      { label: '新建项目', description: '创建新的 AUTOSAR 项目' },
      undefined,
      'autosar.project.create'
    ),
    createQuickPickSeparator('树与刷新'),
    new CommandQuickPickItem('刷新项目树', new ThemeIcon('refresh'), 'autosar.tree.project.refresh'),
    new CommandQuickPickItem(
      {
        label: '新建 SWC',
        description: '在树下创建软件组件',
        detail: '选中或按键将执行 autosar.tree.project.createSWC'
      },
      undefined,
      'autosar.tree.project.createSWC',
      [],
      {
        onDidPressKey: function (key, result) {
          result.then(() => {
            void window.showInformationMessage(`已通过按键 (${key}) 触发新建 SWC`);
          });
        }
      }
    ),
    CommandQuickPickItem.fromCommand(
      { label: '新建 SWC（简洁写法）', description: '无 options' },
      'autosar.tree.project.createSWC'
    ),
    createQuickPickSeparator('自定义动作'),
    new ActionQuickPickItem({ label: '仅提示消息', description: '不执行命令，仅执行自定义 action' }, () => {
      void window.showInformationMessage('这是 ActionQuickPickItem 的自定义逻辑');
    }),
    new ActionQuickPickItem('打开输出通道', async () => {
      const channel = window.createOutputChannel('CommandQuickPick 示例');
      channel.appendLine('来自 ActionQuickPickItem 的输出');
      channel.show();
    })
  ];

  const quickpick = window.createQuickPick<QuickPickItem>();
  quickpick.title = title;
  quickpick.placeholder = '选择一项将直接执行对应命令或动作';
  quickpick.matchOnDescription = true;
  quickpick.matchOnDetail = true;
  quickpick.ignoreFocusOut = true;
  quickpick.items = items;

  const disposables: Disposable[] = [];

  try {
    await new Promise<void>((resolve) => {
      disposables.push(
        quickpick.onDidHide(() => resolve()),
        quickpick.onDidAccept(async () => {
          if (quickpick.activeItems.length === 0) return;

          const item = quickpick.activeItems[0];
          if (CommandQuickPickItem.is(item)) {
            quickpick.hide();
            try {
              await item.execute();
            } finally {
              resolve();
            }
          }
        })
      );
      quickpick.show();
    });
  } finally {
    quickpick.dispose();
    disposables.forEach((d) => void d.dispose());
  }
}

/** 可选环境类型 */
type EnvOption = 'development' | 'staging' | 'production';

/**
 * QuickPickResult 示例：返回选中值或指令，调用方根据 result 分支处理。
 * 展示如何用 QuickPickResult<T> 表达“选中某一项”或“取消/返回”的两种结果。
 */
export async function showQuickPickResultExample(): Promise<QuickPickResult<EnvOption>> {
  const options: QuickPickItem[] = [
    { label: 'development', description: '开发环境' },
    { label: 'staging', description: '预发环境' },
    { label: 'production', description: '生产环境' },
    createQuickPickSeparator(),
    createDirectiveQuickPickItem(Directive.Cancel, undefined, { label: '取消' })
  ];

  const quickpick = window.createQuickPick<QuickPickItem>();
  quickpick.title = '选择环境';
  quickpick.placeholder = '选择一项或取消';
  quickpick.items = options;
  quickpick.ignoreFocusOut = true;

  const disposables: Disposable[] = [];

  try {
    const picked = await new Promise<QuickPickItem | undefined>((resolve) => {
      disposables.push(
        quickpick.onDidHide(() => resolve(undefined)),
        quickpick.onDidAccept(() => {
          if (quickpick.activeItems.length > 0) {
            resolve(quickpick.activeItems[0]);
          }
        })
      );
      quickpick.show();
    });

    if (picked == null) {
      return { directive: Directive.Cancel };
    }
    if (isDirectiveQuickPickItem(picked)) {
      return { directive: picked.directive };
    }
    const value = picked.label as EnvOption;
    return { value: value };
  } finally {
    quickpick.dispose();
    disposables.forEach((d) => void d.dispose());
  }
}

function isDirectiveResult<T>(r: QuickPickResult<T>): r is { directive: Directive } {
  return Object.prototype.hasOwnProperty.call(r, 'directive');
}

/** 调用 QuickPickResult 示例并处理两种分支 */
export async function runQuickPickResultExample(): Promise<void> {
  const result = await showQuickPickResultExample();

  if (isDirectiveResult(result)) {
    const dir = result.directive;
    if (dir === Directive.Cancel) {
      void window.showInformationMessage('已取消');
      return;
    }
    void window.showInformationMessage(`指令: ${Directive[dir]}`);
    return;
  }

  const val = result.value;
  void window.showInformationMessage(`已选择环境: ${val !== undefined ? val : '(未选)'}`);
}
