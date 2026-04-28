import type { GlCommands, GlCommandsDeprecated } from '@shared/webviews/constants/constants.commands';
import type { TextEditor } from 'vscode';
import { Uri, window } from 'vscode';
import type { CommandContext } from './commandContext';
import type { CommandContextParsingOptions } from './commandContext.utils';

/**
 * 命令格式：command:命令名?参数，参数需序列化并编码。
 * 用途：可用于 webview、markdown 链接、按钮等，点击后自动执行命令。
 * 类型安全：建议参数类型为 unknown[]，并用 JSON.stringify 序列化。
 * VS Code API：返回 vscode.Uri，方便与 VS Code 相关 API 兼容。
 * 注意事项：
 * - 仅支持 VS Code 支持的命令 URI 格式。
 * - 命令名必须已在扩展注册，否则 URI 无效。
 * - 参数必须序列化并编码，否则命令可能无法正确解析。
 * - 获取命令的 URI 可通过 `getCommandUri` 函数。
 * - 适用于各种场景，如 webview、markdown 链接、按钮等。
 * - 通过点击链接或按钮，用户可以直接执行命令，而无需手动输入命令名和参数。
 * - 适用于需要在 VS Code 中执行特定命令的场景，如打开文件、执行操作等。
 * - 通过这种方式，可以简化用户操作，提高工作效率。
 * - 适用于需要在 VS Code 中执行特定命令的场景，如打开文件、执行操作等。
 * 获取命令的 URI
 * @param uri - 可选的 URI
 * @param editor - 可选的文本编辑器
 * @returns - 解析后的 URI
 */
export function getCommandUri(uri?: Uri, editor?: TextEditor): Uri | undefined {
  // 始终使用 editor.uri（如果有），这样在分屏比较时可以保证正确
  return editor?.document?.uri ?? uri;
}
/**
 * 解析命令的上下文参数，返回标准化的 CommandContext 对象和剩余参数。
 * @param command 命令名称
 * @param options 解析选项（如是否需要 editor）
 * @param args 命令参数
 * @returns [CommandContext, 剩余参数数组]
 */
export function parseCommandContext(
  command: GlCommands | GlCommandsDeprecated,
  options?: CommandContextParsingOptions,
  ...args: any[]
): [CommandContext, any[]] {
  let editor: TextEditor | undefined = undefined;

  // 保留原始参数
  const originalArgs = [...args];
  let firstArg = args[0];

  // 如果需要 editor，上下文参数优先处理 editor/uri
  if (options?.expectsEditor) {
    // 如果第一个参数是 editor 或 editor-like 对象
    if (firstArg == null || (firstArg.id != null && firstArg.document?.uri != null)) {
      editor = firstArg;
      args = args.slice(1);
      firstArg = args[0];
    }

    // 如果下一个参数是 uri 或为空
    if (args.length > 0 && (firstArg == null || firstArg instanceof Uri)) {
      const [uri, ...rest] = args as [Uri, any];
      if (uri != null) {
        // 如果 uri 与当前活动编辑器匹配，或命令为 diff 左侧，则使用活动编辑器
        if (
          editor == null &&
          (uri.toString() === window.activeTextEditor?.document.uri.toString() || command.endsWith('InDiffLeft'))
        ) {
          editor = window.activeTextEditor;
        }

        // 如果下一个参数是 uri 数组，返回 uris 类型上下文
        const uris = rest[0];
        if (uris != null && Array.isArray(uris) && uris.length !== 0 && uris[0] instanceof Uri) {
          return [
            { command: command, type: 'uris', args: originalArgs, editor: editor, uri: uri, uris: uris },
            rest.slice(1)
          ];
        }
        // 否则返回 uri 类型上下文
        return [{ command: command, type: 'uri', args: originalArgs, editor: editor, uri: uri }, rest];
      }

      // 如果 uri 为空，继续处理剩余参数
      args = args.slice(1);
    } else if (editor == null) {
      // 如果第一个参数是带有 lineNumber 和 uri 的对象，解析为 editorLine 类型上下文，文本编辑器
      if (firstArg != null && typeof firstArg === 'object' && 'lineNumber' in firstArg && 'uri' in firstArg) {
        const [, ...rest] = args;
        return [
          {
            command: command,
            type: 'editorLine',
            args: originalArgs,
            editor: undefined,
            line: firstArg.lineNumber - 1, // 转为零基行号
            uri: firstArg.uri
          },
          rest
        ];
      }

      // 如果没有 editor 和 uri，则使用当前活动编辑器
      editor = window.activeTextEditor;
    }
  }

  // 如果第一个参数是 ViewNode（视图节点）
  // if (firstArg instanceof ViewNode) {
  //   const [active, selection, ...rest] = args as [ViewNode, unknown];

  //   // 如果第二个参数是 ViewNode 数组，表示多选，返回 viewItems 类型上下文
  //   if (active instanceof ViewNode && Array.isArray(selection) && selection[0] instanceof ViewNode) {
  //     const nodes = selection.filter((n): n is ViewNode => n?.constructor === active.constructor);
  //     return [{ command: command, type: 'viewItems', args: originalArgs, node: active, nodes: nodes }, rest];
  //   }

  //   // 否则返回单个 viewItem 类型上下文
  //   return [{ command: command, type: 'viewItem', args: originalArgs, node: active, uri: active.uri }, rest];
  // }

  // 以上都不匹配时，返回 unknown 类型上下文
  return [{ command: command, type: 'unknown', args: originalArgs, editor: editor, uri: editor?.document.uri }, args];
}
