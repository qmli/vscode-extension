import { version as codeVersion } from 'vscode';
import { compare } from './_utils/version';
import type { CoreCommands } from '@packages/common/webviews/constants/constants.commands';
import type { ViewIds } from '@packages/common/webviews/constants/constants.views';

export function getViewFocusCommand(viewId: ViewIds): CoreCommands {
  if (compare(codeVersion, '1.100') >= 0) {
    return `${viewId}.open`;
  }
  return `${viewId}.focus`;
}
