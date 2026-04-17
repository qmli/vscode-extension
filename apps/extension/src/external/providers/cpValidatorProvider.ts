import { ProviderName } from '../externalExecutableService';
import { LocalExecutableProviderBase } from './localExecutableProviderBase';

/**
 * CP 验证器 Provider。
 */
export class CpValidatorProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.CpValidator;
  readonly version = '1.0.0';
}
