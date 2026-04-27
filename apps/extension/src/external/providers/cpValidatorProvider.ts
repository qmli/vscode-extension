import { ProviderName } from '@orientais/vscode-external/externalExecutableService';
import { LocalExecutableProviderBase } from '@orientais/vscode-external/providers/localExecutableProviderBase';

/**
 * CP 验证器 Provider。
 */
export class CpValidatorProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.CpValidator;
  readonly version = '1.0.0';
}
