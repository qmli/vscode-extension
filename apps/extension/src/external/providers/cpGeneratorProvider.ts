import { ProviderName } from '../externalExecutableService';
import { LocalExecutableProviderBase } from './localExecutableProviderBase';

/**
 * CP 生成器 Provider。
 */
export class CpGeneratorProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.CpGenerator;
  readonly version = '1.0.0';
}
