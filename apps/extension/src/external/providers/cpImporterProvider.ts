import { ProviderName } from '@orientais/vscode-external/externalExecutableService';
import { LocalExecutableProviderBase } from '@orientais/vscode-external/providers/localExecutableProviderBase';

/**
 * CP 导入器 Provider。
 */
export class CpImporterProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.CpImporter;
  readonly version = '1.0.0';
}
