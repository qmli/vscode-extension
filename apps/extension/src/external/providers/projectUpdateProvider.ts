import { ProviderName } from '@orientais/vscode-external/externalExecutableService';
import { LocalExecutableProviderBase } from '@orientais/vscode-external/providers/localExecutableProviderBase';

/**
 * 项目升级 Provider。
 */
export class ProjectUpdateProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.ProjectUpdate;
  readonly version = '1.0.0';
}
