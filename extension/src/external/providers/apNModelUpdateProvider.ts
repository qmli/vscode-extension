import { ProviderName } from '@orientais/vscode-external/externalExecutableService';
import { LocalExecutableProviderBase } from '@orientais/vscode-external/providers/localExecutableProviderBase';

/**
 * AP N 模型升级 Provider。
 */
export class ApNModelUpdateProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.ApNModelUpdate;
  readonly version = '1.0.0';
}
