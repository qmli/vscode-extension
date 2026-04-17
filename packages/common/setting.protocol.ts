import type { IpcScope, WebviewState } from './protocol';
import { IpcCommand, IpcNotification, IpcRequest } from './protocol';
import type { Config, ConfigPath, ConfigPathValue, CoreConfigPath, Path, PathValue } from './settings/config';

const scope: IpcScope = 'settings';

export interface State extends WebviewState {
  version: string;
  config: Config;
  customSettings?: Record<string, any>;
  scope: 'user' | 'workspace';
  scopes: ['user' | 'workspace', string][];
}

export interface DidChangeConfigurationParams {
  config: Config;
  customSettings: Record<string, any>;
}
export const DidChangeConfigurationNotification = new IpcNotification<DidChangeConfigurationParams>(
  'core',
  'configuration/didChange'
);

interface CustomConfig {
  rebaseEditor: {
    enabled: boolean;
  };
  currentLine: {
    useUncommittedChangesFormat: boolean;
  };
}

export type CustomConfigPath = Path<CustomConfig>;
export type CustomConfigPathValue<P extends CustomConfigPath> = PathValue<CustomConfig, P>;

const customConfigKeys: readonly CustomConfigPath[] = [];
const coreConfigKeys: readonly CoreConfigPath[] = ['workbench.colorTheme'];

export function isCustomConfigKey(key: string): key is CustomConfigPath {
  return customConfigKeys.includes(key as CustomConfigPath);
}
export function isCoreConfigKey(key: string): key is CoreConfigPath {
  return coreConfigKeys.includes(key as CoreConfigPath);
}

export function assertsConfigKeyValue<T extends ConfigPath>(
  _key: T,
  value: unknown
): asserts value is ConfigPathValue<T> {
  // Noop
}

export interface UpdateConfigurationParams {
  changes: {
    [key in ConfigPath | CustomConfigPath]?: ConfigPathValue<ConfigPath> | CustomConfigPathValue<CustomConfigPath>;
  };
  removes: (keyof { [key in ConfigPath | CustomConfigPath]?: ConfigPathValue<ConfigPath> })[];
  scope?: 'user' | 'workspace';
  uri?: string;
}
export const UpdateConfigurationCommand = new IpcCommand<UpdateConfigurationParams>('core', 'configuration/update');

export interface DidOpenAnchorParams {
  anchor: string;
  scrollBehavior: 'auto' | 'smooth';
}
export const DidOpenAnchorNotification = new IpcNotification<DidOpenAnchorParams>(scope, 'didOpenAnchor');

export interface DidGenerateConfigurationPreviewParams {
  settingScopes: 'user' | 'workspace';
}
export const GenerateConfigurationPreviewRequest = new IpcRequest<
  DidGenerateConfigurationPreviewParams,
  DidChangeConfigurationParams
>(scope, 'configuration/preview');
