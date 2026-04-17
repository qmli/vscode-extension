/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export {
  IObservable,
  IObserver,
  IReader,
  ISettable,
  ISettableObservable,
  ITransaction,
  IChangeContext,
  IChangeTracker,
  observableValue,
  disposableObservableValue,
  transaction,
  subtransaction
} from './observableInternal/base';
export { derived, derivedOpts, derivedHandleChanges, derivedWithStore } from './observableInternal/derived';
export {
  autorun,
  autorunDelta,
  autorunHandleChanges,
  autorunWithStore,
  autorunOpts,
  autorunWithStoreHandleChanges
} from './observableInternal/autorun';
export {
  IObservableSignal,
  constObservable,
  debouncedObservable,
  derivedObservableWithCache,
  derivedObservableWithWritableCache,
  keepAlive,
  observableFromEvent,
  observableFromPromise,
  observableSignal,
  observableSignalFromEvent,
  waitForState,
  wasEventTriggeredRecently
} from './observableInternal/utils';

import { ConsoleObservableLogger, setLogger } from './observableInternal/logging';

const enableLogging = false;
if (enableLogging) {
  setLogger(new ConsoleObservableLogger());
}
