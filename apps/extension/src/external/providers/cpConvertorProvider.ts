import { ProviderName } from '../externalExecutableService';
import { LocalExecutableProviderBase } from './localExecutableProviderBase';

/**
 * CP 转换器 Provider。
 */
export class CpConvertorProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.CpConvertor;
  readonly version = '1.0.0';
}
