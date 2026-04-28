import { IpcCommand, IpcRequest, scope } from './protocol';

export const ExampleQuickPickSelectCommand = new IpcCommand(scope, 'example/quickPickSelect');

// 批量传输相关的类型定义
export interface BatchTransferItem {
  id: string;
  type: 'File';
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BatchTransferRequest {
  items: BatchTransferItem[];
  options?: {
    validateOnly?: boolean;
    continueOnError?: boolean;
    timeout?: number;
  };
}

export interface BatchTransferItemResult {
  id: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchTransferResponse {
  success: boolean;
  totalItems: number;
  successCount: number;
  failureCount: number;
  results: BatchTransferItemResult[];
  errors?: string[];
}

// 批量传输进度通知
export interface BatchTransferProgressParams {
  totalItems: number;
  processedItems: number;
  currentItemId?: string;
  progress: number; // 0-100
}

// 批量传输完成通知
export interface BatchTransferCompletedParams {
  success: boolean;
  results: BatchTransferResponse;
  timestamp: number;
}

// 批量传输的 IPC 请求
export const BatchTransferCommand = new IpcRequest<BatchTransferRequest, BatchTransferResponse>(
  scope,
  'batch/transfer'
);

export const DidChangeBatchTransferProgress = new IpcRequest<BatchTransferProgressParams, BatchTransferResponse>(
  scope,
  'batch/transfer/progress'
);
export const DidCompleteBatchTransfer = new IpcRequest<BatchTransferCompletedParams, BatchTransferResponse>(
  scope,
  'batch/transfer/completed'
);
