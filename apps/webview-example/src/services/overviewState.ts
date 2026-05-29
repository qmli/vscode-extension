import type { Disposable, HostIpc } from '@orientais/webview-core';
import { DidChangeIntegrationsConnectionsNotification } from '@shared/global.protocol';
import type { FileChangeShape } from '@/models/fileChange';

export type GetOverviewResponse =
  | {
      recent: FileChangeShape[];
    }
  | undefined;

// export const GetOverview = new IpcNotification<GetOverviewResponse>(scope, 'overview/swc');

export class ActiveOverviewState implements Disposable {
  private readonly _disposable: Disposable | undefined;
  private _msg: GetOverviewResponse;

  constructor(private readonly _ipc: HostIpc) {
    this._disposable = this._ipc.onReceiveMessage((msg) => {
      switch (true) {
        case DidChangeIntegrationsConnectionsNotification.is(msg):
          this._msg = msg.params as GetOverviewResponse;
          break;
      }
    });
  }
  get FileOverviewState(): GetOverviewResponse {
    return this._msg;
  }
  dispose(): void {
    this._disposable?.dispose();
  }

  changeFile(): void {
    // this._ipc.sendCommand(, undefined);
  }
}
