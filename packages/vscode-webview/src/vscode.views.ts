import { version as codeVersion } from 'vscode';
import { compare } from '@orientais/vscode-core';

export function getViewFocusCommand(viewId: string) {
  if (compare(codeVersion, '1.100') >= 0) {
    return `${viewId}.open`;
  }
  return `${viewId}.focus`;
}
