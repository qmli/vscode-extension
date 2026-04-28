/**
 * @fileoverview 扩展的配置管理模块
 *
 * 该模块提供了一个完整的配置管理系统，用于处理VS Code扩展的配置。
 * 它支持配置的读取、写入、监听变化、迁移等功能，并提供了配置覆盖机制。
 *
 * 主要功能包括：
 * - 配置项的读取和更新
 * - 配置变化事件的监听和处理
 * - 配置的检查和迁移
 * - 多层级配置值的获取（全局、工作区、工作区文件夹）
 * - 类型安全的配置路径操作
 */
import type { Config, ConfigPath, ConfigPathValue, CoreConfigPath, CoreConfigPathValue } from '@shared/settings/config';
import type { ConfigurationChangeEvent, ConfigurationScope, Disposable, Event, ExtensionContext } from 'vscode';
import { ConfigurationTarget, EventEmitter, workspace } from 'vscode';
import { extensionPrefix } from '@/common/constants/constants';
import { areEqual } from '@/utils/object';

/**
 * 配置覆盖接口
 *
 * 定义了配置系统的覆盖机制，允许在运行时临时修改配置行为。
 * 这对于测试、调试或特殊场景下的配置定制非常有用。
 */
interface ConfigurationOverrides {
  /** 获取指定配置项的覆盖值 */
  get<T extends ConfigPath>(section: T, value: ConfigPathValue<T>): ConfigPathValue<T>;
  /** 获取所有配置的覆盖版本 */
  getAll(config: Config): Config;
  /** 处理配置变化事件的覆盖逻辑 */
  onDidChange(e: ConfigurationChangeEvent): ConfigurationChangeEvent;
}

/**
 * 扩展的核心配置管理类
 *
 * 该类是扩展配置系统的核心，实现了VS Code的Disposable接口。
 * 它提供了配置的全生命周期管理，包括：
 *
 * - 配置项的类型安全读取和写入
 * - 配置变化事件的监听和分发
 * - 配置的检查、迁移和升级
 * - 多层级配置作用域的支持
 * - 配置覆盖机制的实现
 *
 * @example
 * ```typescript
 *  读取配置
 * const value = configuration.get('blame.toggleMode');
 *
 * 监听配置变化
 * configuration.onDidChange(e => {
 *   if (configuration.changed(e, 'blame.toggleMode')) {
 *     处理配置变化
 *   }
 * });
 *
 * 更新配置
 * await configuration.update('blame.toggleMode', 'file', ConfigurationTarget.Global);
 * ```
 */
export class Configuration implements Disposable {
  /**
   * 配置Configuration类的全局实例
   *
   * 该静态方法用于初始化配置系统，注册必要的事件监听器。
   * 通常在扩展激活时调用。
   *
   * @param context 扩展上下文，用于注册订阅和释放资源
   */
  static configure(context: ExtensionContext): void {
    context.subscriptions.push(
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration)
    );
  }

  /** 配置变化事件发射器 */
  private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();
  /**
   * 配置变化事件
   *
   * 当相关的配置发生变化时触发。
   * 只有影响到扩展的配置变化才会触发此事件。
   */
  get onDidChange(): Event<ConfigurationChangeEvent> {
    return this._onDidChange.event;
  }

  /** 任意配置变化事件发射器 */
  private _onDidChangeAny = new EventEmitter<ConfigurationChangeEvent>();
  /**
   * 任意配置变化事件
   *
   * 当VS Code中的任何配置发生变化时都会触发。
   * 用于监听可能影响扩展的外部配置变化。
   */
  get onDidChangeAny(): Event<ConfigurationChangeEvent> {
    return this._onDidChangeAny.event;
  }

  /**
   * 处理VS Code配置变化事件
   *
   * 该方法是配置变化的核心处理逻辑：
   * 1. 首先触发"任意配置变化"事件
   * 2. 检查变化是否影响扩展
   * 3. 如果有配置覆盖，应用覆盖逻辑
   * 4. 触发扩展专用的配置变化事件
   *
   * @param e VS Code的配置变化事件
   */
  private onConfigurationChanged(e: ConfigurationChangeEvent) {
    this._onDidChangeAny.fire(e);
    if (!e.affectsConfiguration(extensionPrefix)) return;

    if (this._overrides?.onDidChange != null) {
      e = this._overrides.onDidChange(e);
    }

    this._onDidChange.fire(e);
  }

  /** 配置覆盖对象，用于在运行时临时修改配置行为 */
  private _overrides: Partial<ConfigurationOverrides> | undefined;

  /**
   * 释放资源
   *
   * 实现Disposable接口，清理事件监听器和其他资源。
   * 在扩展停用时调用。
   */
  dispose(): void {
    this._onDidChange.dispose();
    this._onDidChangeAny.dispose();
  }

  /**
   * 应用配置覆盖
   *
   * 设置配置覆盖对象，用于在特定场景下修改配置行为。
   * 常用于测试环境或特殊的运行时需求。
   *
   * @param overrides 配置覆盖对象
   */
  applyOverrides(overrides: ConfigurationOverrides): void {
    this._overrides = overrides;
  }

  /**
   * 清除配置覆盖
   *
   * 移除当前的配置覆盖设置，恢复正常的配置行为。
   * 注意：不会立即清除"onChange"覆盖，以确保事件传播完成。
   */
  clearOverrides(): void {
    if (this._overrides == null) return;

    // 不立即清除"onChange"覆盖，需要等待调用栈展开以确保事件正确传播
    this._overrides.get = undefined;
    this._overrides.getAll = undefined;
    queueMicrotask(() => (this._overrides = undefined));
  }

  /**
   * 获取配置项的值
   *
   * 支持多种重载形式，提供类型安全的配置访问。
   * 可以指定作用域、默认值，以及是否跳过覆盖逻辑。
   *
   * @param section 配置项路径（如'blame.toggleMode'）
   * @param scope 配置作用域（全局、工作区或工作区文件夹）
   * @param defaultValue 默认值，如果提供则保证返回非空值
   * @param skipOverrides 是否跳过配置覆盖逻辑
   * @returns 配置项的值
   */
  get<S extends ConfigPath>(section: S, scope?: ConfigurationScope | null): ConfigPathValue<S>;
  get<S extends ConfigPath>(
    section: S,
    scope: ConfigurationScope | null | undefined,
    defaultValue: NonNullable<ConfigPathValue<S>>,
    skipOverrides?: boolean
  ): NonNullable<ConfigPathValue<S>>;
  get<S extends ConfigPath>(
    section: S,
    scope?: ConfigurationScope | null,
    defaultValue?: NonNullable<ConfigPathValue<S>>,
    skipOverrides?: boolean
  ): ConfigPathValue<S> {
    const value =
      defaultValue === undefined
        ? workspace.getConfiguration(extensionPrefix, scope).get<ConfigPathValue<S>>(section)!
        : workspace.getConfiguration(extensionPrefix, scope).get<ConfigPathValue<S>>(section, defaultValue);
    return skipOverrides || this._overrides?.get == null ? value : this._overrides.get<S>(section, value);
  }

  /**
   * 获取所有配置
   *
   * 返回完整的配置对象，包含所有配置项。
   *
   * @param skipOverrides 是否跳过配置覆盖逻辑
   * @returns 完整的配置对象
   */
  getAll(skipOverrides?: boolean): Config {
    const config = workspace.getConfiguration().get<Config>(extensionPrefix)!;
    return skipOverrides || this._overrides?.getAll == null ? config : this._overrides.getAll(config);
  }

  /**
   * 获取任意VS Code配置项的值
   *
   * 不限于扩展配置，可以访问VS Code的任何配置项。
   * 不会应用扩展的配置覆盖逻辑。
   *
   * @param section 配置项路径
   * @param scope 配置作用域
   * @param defaultValue 默认值
   * @returns 配置项的值
   */
  getAny<S extends string, T>(section: S, scope?: ConfigurationScope | null): T | undefined;
  getAny<S extends string, T>(section: S, scope: ConfigurationScope | null | undefined, defaultValue: T): T;
  getAny<S extends string, T>(section: S, scope?: ConfigurationScope | null, defaultValue?: T): T | undefined {
    return defaultValue === undefined
      ? workspace.getConfiguration(undefined, scope).get<T>(section)
      : workspace.getConfiguration(undefined, scope).get<T>(section, defaultValue);
  }

  /**
   * 获取VS Code核心配置项的值
   *
   * 专门用于访问VS Code内置的核心配置项（如editor等）。
   * 提供类型安全的核心配置访问。
   *
   * @param section 核心配置项路径
   * @param scope 配置作用域
   * @param defaultValue 默认值
   * @returns 核心配置项的值
   */
  getCore<S extends CoreConfigPath>(section: S, scope?: ConfigurationScope | null): CoreConfigPathValue<S> | undefined;
  getCore<S extends CoreConfigPath>(
    section: S,
    scope: ConfigurationScope | null | undefined,
    defaultValue: CoreConfigPathValue<S>
  ): CoreConfigPathValue<S>;
  getCore<S extends CoreConfigPath>(
    section: S,
    scope?: ConfigurationScope | null,
    defaultValue?: CoreConfigPathValue<S>
  ): CoreConfigPathValue<S> | undefined {
    return defaultValue === undefined
      ? workspace.getConfiguration(undefined, scope).get<CoreConfigPathValue<S>>(section as string)
      : workspace.getConfiguration(undefined, scope).get<CoreConfigPathValue<S>>(section as string, defaultValue);
  }

  /**
   * 检查配置是否发生变化
   *
   * 检查指定的配置项是否在给定的配置变化事件中被修改。
   * 支持单个配置项或配置项数组的检查。
   *
   * @param e 配置变化事件，如果为null则返回true
   * @param section 要检查的配置项路径或路径数组
   * @param scope 配置作用域
   * @returns 如果指定配置发生变化则返回true
   */
  changed<S extends ConfigPath>(
    e: ConfigurationChangeEvent | undefined,
    section: S | S[],
    scope?: ConfigurationScope | null | undefined
  ): boolean {
    if (e == null) return true;

    return Array.isArray(section)
      ? section.some((s) => e.affectsConfiguration(`${extensionPrefix}.${s}`, scope!))
      : e.affectsConfiguration(`${extensionPrefix}.${section}`, scope!);
  }

  /**
   * 检查任意配置是否发生变化
   *
   * 检查指定的任意VS Code配置项是否在给定的配置变化事件中被修改。
   * 不限于配置，可以检查任何VS Code配置。
   *
   * @param e 配置变化事件，如果为null则返回true
   * @param section 要检查的配置项路径或路径数组
   * @param scope 配置作用域
   * @returns 如果指定配置发生变化则返回true
   */
  changedAny<S extends string>(
    e: ConfigurationChangeEvent | undefined,
    section: S | S[],
    scope?: ConfigurationScope | null | undefined
  ): boolean {
    if (e == null) return true;

    return Array.isArray(section)
      ? section.some((s) => e.affectsConfiguration(s, scope!))
      : e.affectsConfiguration(section, scope!);
  }

  /**
   * 检查VS Code核心配置是否发生变化
   *
   * 检查指定的VS Code核心配置项是否在给定的配置变化事件中被修改。
   * 专门用于检查VS Code内置的核心配置变化。
   *
   * @param e 配置变化事件，如果为null则返回true
   * @param section 要检查的核心配置项路径或路径数组
   * @param scope 配置作用域
   * @returns 如果指定核心配置发生变化则返回true
   */
  changedCore<S extends CoreConfigPath>(
    e: ConfigurationChangeEvent | undefined,
    section: S | S[],
    scope?: ConfigurationScope | null | undefined
  ): boolean {
    if (e == null) return true;

    return Array.isArray(section)
      ? section.some((s) => e.affectsConfiguration(s as string, scope!))
      : e.affectsConfiguration(section as string, scope!);
  }

  /**
   * 检查配置项的详细信息
   *
   * 获取配置项在不同作用域（默认、全局、工作区、工作区文件夹）的值信息。
   * 用于了解配置项的完整层次结构和来源。
   *
   * @param section 配置项路径
   * @param scope 配置作用域
   * @returns 配置项的详细检查信息，包含各个作用域的值
   */
  inspect<S extends ConfigPath, V extends ConfigPathValue<S>>(
    section: S,
    scope?: ConfigurationScope | null
  ): InspectWorkspaceConfiguration<V> | undefined {
    return workspace
      .getConfiguration(extensionPrefix, scope)
      .inspect<V>(section === undefined ? extensionPrefix : section);
  }

  /**
   * 检查任意VS Code配置项的详细信息
   *
   * 获取任意VS Code配置项在不同作用域的值信息。
   * 不限于配置，可以检查任何VS Code配置。
   *
   * @param section 配置项路径
   * @param scope 配置作用域
   * @returns 配置项的详细检查信息
   */
  inspectAny<S extends string, T>(
    section: S,
    scope?: ConfigurationScope | null
  ): InspectWorkspaceConfiguration<T> | undefined {
    return workspace.getConfiguration(undefined, scope).inspect<T>(section);
  }

  /**
   * 检查VS Code核心配置项的详细信息
   *
   * 获取VS Code核心配置项在不同作用域的值信息。
   * 专门用于检查VS Code内置的核心配置。
   *
   * @param section 核心配置项路径
   * @param scope 配置作用域
   * @returns 核心配置项的详细检查信息
   */
  inspectCore<S extends CoreConfigPath, V extends CoreConfigPathValue<S>>(
    section: S,
    scope?: ConfigurationScope | null
  ): InspectWorkspaceConfiguration<V> | undefined {
    return workspace.getConfiguration(undefined, scope).inspect<V>(section as string);
  }

  /**
   * 检查配置项是否未设置
   *
   * 检查指定的配置项是否在所有作用域（全局、工作区、工作区文件夹）都未设置。
   * 如果配置项在任何一个作用域有值，则认为已设置。
   *
   * @param section 配置项路径
   * @param scope 配置作用域
   * @returns 如果配置项在所有作用域都未设置则返回true
   */
  isUnset<S extends ConfigPath>(section: S, scope?: ConfigurationScope | null): boolean {
    const inspect = this.inspect(section, scope)!;
    if (inspect.workspaceFolderValue !== undefined) return false;
    if (inspect.workspaceValue !== undefined) return false;
    if (inspect.globalValue !== undefined) return false;

    return true;
  }

  /**
   * 迁移配置项
   *
   * 将旧的配置项迁移到新的配置项。支持在迁移过程中转换值，
   * 并且会在所有作用域（全局、工作区、工作区文件夹）中进行迁移。
   * 如果没有找到要迁移的值且提供了fallbackValue，会设置fallback值。
   *
   * @param from 源配置项路径
   * @param to 目标配置项路径
   * @param options 迁移选项
   * @param options.fallbackValue 如果没有找到源配置时的回退值
   * @param options.migrationFn 值转换函数，用于在迁移过程中转换值
   * @returns 如果成功迁移了任何值则返回true
   */
  async migrate<S extends ConfigPath>(
    from: string,
    to: S,
    options: { fallbackValue?: ConfigPathValue<S>; migrationFn?(value: any): ConfigPathValue<S> }
  ): Promise<boolean> {
    const inspection = this.inspect(from as any);
    if (inspection === undefined) return false;

    let migrated = false;
    if (inspection.globalValue !== undefined) {
      await this.update(
        to,
        options.migrationFn != null ? options.migrationFn(inspection.globalValue) : inspection.globalValue,
        ConfigurationTarget.Global
      );
      migrated = true;
    }

    if (inspection.workspaceValue !== undefined) {
      await this.update(
        to,
        options.migrationFn != null ? options.migrationFn(inspection.workspaceValue) : inspection.workspaceValue,
        ConfigurationTarget.Workspace
      );
      migrated = true;
    }

    if (inspection.workspaceFolderValue !== undefined) {
      await this.update(
        to,
        options.migrationFn != null
          ? options.migrationFn(inspection.workspaceFolderValue)
          : inspection.workspaceFolderValue,
        ConfigurationTarget.WorkspaceFolder
      );
      migrated = true;
    }

    if (!migrated && options.fallbackValue !== undefined) {
      await this.update(to, options.fallbackValue, ConfigurationTarget.Global);
      migrated = true;
    }

    return migrated;
  }

  /**
   * 条件迁移配置项
   *
   * 只有当目标配置项不存在时，才从源配置项迁移值。
   * 这是一种保守的迁移策略，不会覆盖已存在的配置。
   * 在所有作用域中检查和迁移配置。
   *
   * @param from 源配置项路径
   * @param to 目标配置项路径
   * @param options 迁移选项
   * @param options.migrationFn 值转换函数，用于在迁移过程中转换值
   */
  async migrateIfMissing<S extends ConfigPath>(
    from: string,
    to: S,
    options: { migrationFn?(value: any): ConfigPathValue<S> }
  ): Promise<void> {
    const fromInspection = this.inspect(from as any);
    if (fromInspection === undefined) return;

    const toInspection = this.inspect(to);
    if (fromInspection.globalValue !== undefined) {
      if (toInspection?.globalValue === undefined) {
        await this.update(
          to,
          options.migrationFn != null ? options.migrationFn(fromInspection.globalValue) : fromInspection.globalValue,
          ConfigurationTarget.Global
        );
      }
    }

    if (fromInspection.workspaceValue !== undefined) {
      if (toInspection?.workspaceValue === undefined) {
        await this.update(
          to,
          options.migrationFn != null
            ? options.migrationFn(fromInspection.workspaceValue)
            : fromInspection.workspaceValue,
          ConfigurationTarget.Workspace
        );
      }
    }

    if (fromInspection.workspaceFolderValue !== undefined) {
      if (toInspection?.workspaceFolderValue === undefined) {
        await this.update(
          to,
          options.migrationFn != null
            ? options.migrationFn(fromInspection.workspaceFolderValue)
            : fromInspection.workspaceFolderValue,
          ConfigurationTarget.WorkspaceFolder
        );
      }
    }
  }

  /**
   * 检查配置项路径是否匹配
   *
   * 类型守卫函数，用于检查给定的配置路径和值是否匹配预期的类型。
   * 主要用于TypeScript类型缩小和类型检查。
   *
   * @param match 预期匹配的配置路径
   * @param section 实际的配置路径
   * @param value 要检查的值
   * @returns 如果匹配则返回true，并缩小类型
   */
  matches<S extends ConfigPath>(match: S, section: ConfigPath, value: unknown): value is ConfigPathValue<S> {
    return match === section;
  }

  /**
   * 获取配置项的名称
   *
   * 返回配置项的字符串名称。目前只是简单返回输入的section。
   * 主要用于接口统一性和未来可能的扩展。
   *
   * @param section 配置项路径
   * @returns 配置项的名称
   */
  name<S extends ConfigPath>(section: S): string {
    return section;
  }

  /**
   * 更新配置项
   *
   * 在指定的作用域中更新配置项的值。
   * 支持全局、工作区和工作区文件夹级别的配置。
   *
   * @param section 配置项路径
   * @param value 新的配置值，传入undefined可以删除配置
   * @param target 配置目标作用域
   * @returns Promise，在配置更新完成后解决
   */
  update<S extends ConfigPath>(
    section: S,
    value: ConfigPathValue<S> | undefined,
    target: ConfigurationTarget
  ): Thenable<void> {
    return workspace.getConfiguration(extensionPrefix).update(section, value, target);
  }

  /**
   * 更新任意VS Code配置项
   *
   * 在指定的作用域中更新任意VS Code配置项的值。
   * 不限于配置，可以更新任何VS Code配置。
   *
   * @param section 配置项路径
   * @param value 新的配置值
   * @param target 配置目标作用域
   * @param scope 配置作用域（对于非全局配置）
   * @returns Promise，在配置更新完成后解决
   */
  updateAny<S extends string, T>(
    section: S,
    value: T,
    target: ConfigurationTarget,
    scope?: ConfigurationScope | null
  ): Thenable<void> {
    return workspace
      .getConfiguration(undefined, target === ConfigurationTarget.Global ? undefined : scope!)
      .update(section, value, target);
  }

  /**
   * 智能更新配置项
   *
   * 根据当前的配置层次结构，智能选择最适合的作用域进行更新。
   * 优先级：工作区文件夹 > 工作区 > 全局。
   * 如果新值与当前有效值相同，或与默认值相同，则不执行更新。
   *
   * @param section 配置项路径
   * @param value 新的配置值
   * @returns Promise，在配置更新完成后解决（如果需要更新）
   */
  updateEffective<S extends ConfigPath>(section: S, value: ConfigPathValue<S> | undefined): Thenable<void> {
    const inspect = this.inspect(section)!;
    if (inspect.workspaceFolderValue !== undefined) {
      if (value === inspect.workspaceFolderValue) return Promise.resolve(undefined);

      return this.update(section, value, ConfigurationTarget.WorkspaceFolder);
    }

    if (inspect.workspaceValue !== undefined) {
      if (value === inspect.workspaceValue) return Promise.resolve(undefined);

      return this.update(section, value, ConfigurationTarget.Workspace);
    }

    if (inspect.globalValue === value || (inspect.globalValue === undefined && value === inspect.defaultValue)) {
      return Promise.resolve(undefined);
    }

    return this.update(section, areEqual(value, inspect.defaultValue) ? undefined : value, ConfigurationTarget.Global);
  }
}

/**
 * 配置管理器的全局实例
 *
 * 这是扩展中使用的主要配置管理器实例。
 * 所有需要访问或修改配置的地方都应该使用这个实例。
 */
export const configuration = new Configuration();

/**
 * 配置项检查结果接口
 *
 * 定义了配置项在不同作用域和语言设置下的值。
 * 用于详细了解配置项的完整层次结构和来源。
 */
interface InspectWorkspaceConfiguration<T> {
  /** 配置项的键名 */
  key: string;

  /** 默认值（来自扩展定义） */
  defaultValue?: T;
  /** 全局作用域的值（用户设置） */
  globalValue?: T;
  /** 工作区作用域的值 */
  workspaceValue?: T;
  /** 工作区文件夹作用域的值 */
  workspaceFolderValue?: T;

  /** 默认语言特定值 */
  defaultLanguageValue?: T;
  /** 全局语言特定值 */
  globalLanguageValue?: T;
  /** 工作区语言特定值 */
  workspaceLanguageValue?: T;
  /** 工作区文件夹语言特定值 */
  workspaceFolderLanguageValue?: T;

  /** 适用的语言ID列表 */
  languageIds?: string[];
}
