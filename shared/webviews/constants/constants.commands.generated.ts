// 定义扩展所有可执行的命令
export type ContributedCommands = ContributedKeybindingCommands | ContributedPaletteCommands;

// 定义在命令面板(Ctrl+Shift+P)中显示的命令子集
export type ContributedPaletteCommands = 'autosar.editor' | 'autosar.settings';
// 定义在键盘快捷键中可用的命令子集
export type ContributedKeybindingCommands =
  | 'autosar.key.alt+,'
  | 'autosar.key.alt+.'
  | 'autosar.key.alt+enter'
  | 'autosar.key.alt+left'
  | 'autosar.key.alt+right'
  | 'autosar.key.ctrl+enter'
  | 'autosar.key.ctrl+left'
  | 'autosar.key.ctrl+right'
  | 'autosar.key.escape'
  | 'autosar.key.left'
  | 'autosar.key.right';
