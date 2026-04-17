import { ProviderName } from '../externalExecutableService';
import { LocalExecutableProviderBase } from './localExecutableProviderBase';

/**
 * 项目升级 Provider。
 */
export class ProjectUpdateProvider extends LocalExecutableProviderBase {
  readonly name = ProviderName.ProjectUpdate;
  readonly version = '1.0.0';
}
