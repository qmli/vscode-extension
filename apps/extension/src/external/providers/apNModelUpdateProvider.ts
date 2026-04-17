import { ProviderName } from '../externalExecutableService';
import { LocalExecutableProviderBase } from './localExecutableProviderBase';

/**
 * AP N 模型升级 Provider。
 */
export class ApNModelUpdateProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.ApNModelUpdate;
  readonly version = '1.0.0';
}
