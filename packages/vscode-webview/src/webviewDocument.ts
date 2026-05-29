/* eslint-disable @typescript-eslint/no-unused-vars */
// =============================================================================
// WebviewDocument — CustomEditorProvider 模式下的文档对象
// =============================================================================
import type { CustomDocument, FileChangeEvent, FileStat, FileSystemProvider } from 'vscode';
import { Disposable, EventEmitter, FileType, Uri } from 'vscode';

/**
 * `CustomDocument` 实现，用于 `registerCustomEditorPanel` 模式。
 */
export class WebviewDocument implements CustomDocument {
  constructor(readonly uri: Uri) {}
  dispose(): void {}
}

/**
 * 从虚拟 URI 解析 `instanceId`。
 * - 单实例：路径不含 UUID，返回 `undefined`
 * - 多实例：路径末尾含 UUID（`Title-<uuid>.webview-panel`），返回 UUID
 */
export function getInstanceIdFromUri(uri: Uri): string | undefined {
  const basename = uri.query?.replace(/^id=/, '') ?? undefined;
  return basename;
}

/**
 * 将标题转换为合法文件名片段（保留中文、英文、数字、连字符，其余替换为 `-`）。
 */
function sanitizeTitle(title: string): string {
  return (
    title
      .replace(/[^\w\u4e00-\u9fff-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'panel'
  );
}

/**
 * 构造虚拟 URI。
 * - 单实例（`instanceId` 为 `undefined`）：`webview-panel://<panelId>/<Title>.webview-panel`
 * - 多实例（`instanceId` 非 `undefined`）：`webview-panel://<panelId>/<Title>-<instanceId>.webview-panel`
 */
export function buildCustomEditorUri(viewType: string, instanceId: string | undefined, title: string): Uri {
  const safeTitle = sanitizeTitle(title);
  return Uri.from({
    scheme: 'webview-panel',
    authority: viewType,
    path: `/${safeTitle}.webview-panel`,
    query: instanceId != null ? `id=${instanceId}` : undefined // UUID 移到 query
  });
}

/**
 * `webview-panel://` Scheme 的极简内存文件系统提供者。
 *
 * VS Code 在打开自定义 URI 时会先通过 `stat()` 验证资源是否存在。
 * 没有 `FileSystemProvider` 时 VS Code 无法打开该 URI，`vscode.openWith`
 * 会静默失败或退化到文本编辑器。
 *
 * 所有 I/O 方法均为空操作：实际数据由 `CustomEditorProvider` 回调管理。
 */
export class WebviewPanelFileSystemProvider implements FileSystemProvider, Disposable {
  private readonly _onDidChangeFile = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile = this._onDidChangeFile.event;

  watch(_uri: Uri, _options: { recursive: boolean; excludes: string[] }): Disposable {
    return Disposable.from();
  }

  stat(_uri: Uri): FileStat {
    return { type: FileType.File, ctime: 0, mtime: 0, size: 0 };
  }

  readDirectory(_uri: Uri): [string, FileType][] {
    return [];
  }
  createDirectory(_uri: Uri): void {}
  readFile(_uri: Uri): Uint8Array {
    return new Uint8Array();
  }
  writeFile(_uri: Uri, _content: Uint8Array, _options: { create: boolean; overwrite: boolean }): void {}
  delete(_uri: Uri, _options: { recursive: boolean }): void {}
  rename(_uri: Uri, _newUri: Uri, _options: { overwrite: boolean }): void {}

  dispose(): void {
    this._onDidChangeFile.dispose();
  }
}
