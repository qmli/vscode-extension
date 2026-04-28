import type { ISoftHandleType } from './constants/constants.isoft';

// 注意：必须与 package.json 中的 `autosar.advanced.messages` 设置保持同步
export type SuppressedMessages =
  | 'suppressIntegrationDisconnectedTooManyFailedRequestsWarning'
  | 'suppressIntegrationRequestFailed500Warning'
  | 'suppressIntegrationRequestTimedOutWarning'
  | 'suppressBlameInvalidIgnoreRevsFileWarning'
  | 'suppressBlameInvalidIgnoreRevsFileBadRevisionWarning';

export interface ConfigQueue {
  type: ISoftHandleType;
  data: Configuration;
}

export interface Configuration {
  id?: string | string[];
  code?: string;
  name?: string;
  isTab?: boolean;
  isShow?: boolean;
  icon?: string;
  component?: string;
  parentId?: string;
  header?: Record<string, boolean>;
  data?: Record<string, string | number | boolean | unknown>;
  menu?: Configuration[];
}
