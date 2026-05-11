import { IpcCommand } from '@orientais/shared';

// 泛型，command 类型由调用方注入，默认 string
export interface ExecuteCommandParams<TCommand extends string = string> {
  command: TCommand;
  args?: unknown[];
}
export const ExecuteCommand = new IpcCommand<ExecuteCommandParams>('core', 'command/execute');
