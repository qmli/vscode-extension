import { basename, dirname, join } from 'path';
import { Uri, window, workspace, WorkspaceEdit } from 'vscode';

export async function renameWorkspaceFile(filePath: string, workspaceRoot?: string): Promise<void> {
  const currentName = basename(filePath);
  const directory = dirname(filePath);

  try {
    const newName = await window.showInputBox({
      title: 'Rename File',
      prompt: 'Enter the new file name',
      value: currentName,
      validateInput: (value: string) => {
        if (!value.trim()) {
          return 'File name cannot be empty';
        }
        if (value === currentName) {
          return 'Please enter a different name';
        }
        if (value.includes('/') || value.includes('\\')) {
          return 'File name cannot contain path separators';
        }
        if (
          value.includes(':') ||
          value.includes('*') ||
          value.includes('?') ||
          value.includes('"') ||
          value.includes('<') ||
          value.includes('>') ||
          value.includes('|')
        ) {
          return 'File name contains invalid characters';
        }
        return undefined;
      }
    });

    if (!newName || newName === currentName) {
      return;
    }

    const oldUri = Uri.file(workspaceRoot ? join(workspaceRoot, filePath) : filePath);
    const newPath = join(directory, newName);
    const newUri = Uri.file(workspaceRoot ? join(workspaceRoot, newPath) : newPath);

    const edit = new WorkspaceEdit();
    edit.renameFile(oldUri, newUri);

    const success = await workspace.applyEdit(edit);
    if (success) {
      void window.showInformationMessage(`File renamed from '${currentName}' to '${newName}'`);
    } else {
      void window.showErrorMessage('Failed to rename file');
    }
  } catch (ex) {
    void window.showErrorMessage(`Failed to rename file: ${ex instanceof Error ? ex.message : String(ex)}`);
  }
}
