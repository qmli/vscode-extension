/**
 * 核心功能：作�?autosar 命令的注册入口点，负责将所有命令注册到 VS Code 命令系统�? * 功能特点�? * - 定义 registerCommands 方法，用于集中式命令注册�? * - 通过调用 GlCommandBase 子类的实例，将命令逻辑�?VS Code 命令系统连接起来�? * 主要职责�? * - 命令注册：集中式地将所有命令（例如 CreateProjectCommand）注册到 VS Code�? * - 命令管理：统一管理命令的生命周期和依赖关系�? * - 扩展入口点：作为 autosar 扩展的核心命令注册点�? */
import type {
  CoreCommands,
  GlCommands,
  GlCommandsDeprecated,
  WebviewCommands,
  WebviewViewCommands
} from '@shared/webviews/constants/constants.commands';
import type { Command, Disposable } from 'vscode';
import { commands } from 'vscode';
import type { Container } from '@/container';
import type { GlCommandBase } from './commandBase';

export type CommandCallback = Parameters<typeof commands.registerCommand>[1];
type CommandConstructor = new (container: Container, ...args: any[]) => GlCommandBase;
const registrableCommands: CommandConstructor[] = [];

export function command(): ClassDecorator {
  return (target: any) => {
    registrableCommands.push(target);
  };
}

export function registerCommand(
  command: GlCommands | GlCommandsDeprecated,
  callback: CommandCallback,
  thisArg?: any
): Disposable {
  return commands.registerCommand(
    command,
    function (this: any, ...args) {
      return callback.call(this, ...args);
    },
    thisArg
  );
}
export function registerWebviewCommand(
  command: WebviewCommands | WebviewViewCommands,
  callback: CommandCallback,
  thisArg?: any
): Disposable {
  return commands.registerCommand(
    command,
    function (this: any, ...args) {
      return callback.call(this, ...args);
    },
    thisArg
  );
}

export function registerCommands(container: Container): Disposable[] {
  return registrableCommands.map((c) => container.instantiationService.createInstance(c, container));
}

/**
 *
 * @param command 终端链接命令
 * @param args 在终端点击指�? * @returns
 */
export function createTerminalLinkCommand<T extends object>(
  command: GlCommands,
  args: T
): { command: GlCommands; args: T } {
  return { command: command, args: args };
}

/**
 * 执行 autosar 内置的命令注册的命令
 * @param command autosar 命令
 */
export function executeCommand<U = any>(command: GlCommands): Thenable<U>;
export function executeCommand<T = unknown, U = any>(command: GlCommands, arg: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: GlCommands, ...args: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: GlCommands, ...args: T): Thenable<U> {
  return commands.executeCommand<U>(command, ...args);
}

export function createCoreCommand<T extends unknown[]>(command: CoreCommands, title: string, ...args: T): Command {
  return { command: command, title: title, arguments: args };
}

/**
 * 执行 VS Code 内置的核心命�? * @param command VS Code 核心命令：执�?VS Code 内置的核心命�? * @param arg   执行核心命令所需的参�? */
export function executeCoreCommand<T = unknown, U = any>(command: CoreCommands, arg: T): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
  command: CoreCommands,
  ...args: T
): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
  command: CoreCommands,
  ...args: T
): Thenable<U> {
  return commands.executeCommand<U>(command, ...args);
}
