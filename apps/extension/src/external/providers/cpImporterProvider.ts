import { ProviderName } from '../externalExecutableService';
import { LocalExecutableProviderBase } from './localExecutableProviderBase';

/**
 * CP 导入器 Provider。
 */
export class CpImporterProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.CpImporter;
  readonly version = '1.0.0';
}
