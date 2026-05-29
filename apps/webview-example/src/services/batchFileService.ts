import type { Disposable } from '@orientais/webview-core';
import { useWebviewIPC } from '@orientais/webview-core';
import type {
  BatchTransferCompletedParams,
  BatchTransferItem,
  BatchTransferProgressParams,
  BatchTransferRequest,
  BatchTransferResponse
} from '@shared/example.protocol';
import {
  BatchTransferCommand,
  DidChangeBatchTransferProgress,
  DidCompleteBatchTransfer
} from '@shared/example.protocol';

export class BatchTransferManager implements Disposable {
  private _progressCallback?: (progress: BatchTransferProgressParams) => void;
  private _completedCallback?: (result: BatchTransferCompletedParams) => void;
  private readonly _ipc: ReturnType<typeof useWebviewIPC>;
  private readonly _disposable: Disposable;

  constructor() {
    this._ipc = useWebviewIPC();
    this._disposable = this._ipc.onMessage((msg) => {
      if (DidChangeBatchTransferProgress.is(msg)) {
        this._progressCallback?.(msg.params);
      } else if (DidCompleteBatchTransfer.is(msg)) {
        this._completedCallback?.(msg.params);
      }
    });
  }

  dispose(): void {
    this._progressCallback = undefined;
    this._completedCallback = undefined;
    this._disposable.dispose();
  }

  /**
   * 执行批量传输
   */
  async transfer(
    items: BatchTransferItem[],
    options?: BatchTransferRequest['options']
  ): Promise<BatchTransferResponse> {
    const request: BatchTransferRequest = {
      items: items,
      options: {
        continueOnError: true,
        timeout: 30000,
        ...options
      }
    };
    return this._ipc.sendRequest(BatchTransferCommand, request);
  }

  /**
   * 设置进度回调
   */
  onProgress(callback: (progress: BatchTransferProgressParams) => void): void {
    this._progressCallback = callback;
  }

  /**
   * 设置完成回调
   */
  onCompleted(callback: (result: BatchTransferCompletedParams) => void): void {
    this._completedCallback = callback;
  }

  /**
   * 创建批量传输项的辅助方法
   */
  static createItem(
    id: string,
    type: 'File',
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): BatchTransferItem {
    return { id: id, type: type, data: data, metadata: metadata };
  }

  /**
   * 批量创建多个传输项
   */
  static createItems<T extends Record<string, unknown>>(
    type: 'File',
    dataArray: T[],
    idGenerator?: (item: T, index: number) => string
  ): BatchTransferItem[] {
    return dataArray.map((data, index) => ({
      id: idGenerator?.(data, index) ?? `${type}_${index}`,
      type: type,
      data: data
    }));
  }
}
