import type { WebviewTypes, WebviewViewTypes } from '@shared/webviews/constants/constants.views';
import type { Keys } from './constants';

type WebviewContextStateKeys =
  | `autosar:webview:${WebviewTypes}:visible`
  | `autosar:webview:${WebviewTypes}:active`
  | `autosar:webview:${WebviewTypes}:focused`
  | `autosar:webview:${WebviewTypes}:inputFocused`
  | `autosar:webviewView:${WebviewViewTypes}:visible`
  | `autosar:webviewView:${WebviewViewTypes}:active`
  | `autosar:webviewView:${WebviewViewTypes}:focused`
  | `autosar:webviewView:${WebviewViewTypes}:inputFocused`;

export type ContextKeys = {
  'autosar:': boolean;
  'model.design.status': string; //I_SOFT_GLOBAL.STATUS.MODEL_DESIGN_STATUS
} & Record<`autosar:key:${Keys}`, boolean> &
  Record<WebviewContextStateKeys, boolean>;
