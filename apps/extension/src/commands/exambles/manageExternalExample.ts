import { window } from 'vscode';
import { command } from '@/common/commands/command';
import { GlCommandBase } from '@/common/commands/commandBase';
import { CommandContext } from '@/common/commands/commandContext';
import { ProviderName } from '@/external/externalExecutableService';
import type { Container } from '../../container';

export interface ManageExternalCommandArgs {
  provider?: ProviderName;
  action?: 'start' | 'stop' | 'restart' | 'execute' | 'status';
}

@command()
export class ManageExternalCommand extends GlCommandBase {
  constructor(private readonly container: Container) {
    super([
      'autosar.manageExternal',
      'autosar.external.start',
      'autosar.external.stop',
      'autosar.external.restart',
      'autosar.external.execute'
    ]);
  }

  protected override async preExecute(context: CommandContext, args?: ManageExternalCommandArgs): Promise<void> {
    if (context.command === 'autosar.external.start') {
      args = { ...args, action: 'start' };
    } else if (context.command === 'autosar.external.stop') {
      args = { ...args, action: 'stop' };
    } else if (context.command === 'autosar.external.restart') {
      args = { ...args, action: 'restart' };
    } else if (context.command === 'autosar.external.execute') {
      args = { ...args, action: 'execute' };
    }
    return this.execute(args);
  }

  /**
   * 执行外部工具管理命令
   * @param args 命令参数
   */
  async execute(args?: ManageExternalCommandArgs): Promise<void> {
    const action = args?.action ?? (await this.pickAction());
    if (!action) {
      return;
    }

    if (action === 'status') {
      this.showStatus();
      return;
    }

    const providerName = args?.provider ?? ((await this.pickProvider()) as ProviderName);
    const provider = this.container.external.getProvider(providerName);
    if (!provider) {
      return;
    }

    try {
      if (action === 'start' && 'start' in provider) {
        await (provider as any).start();
      } else if (action === 'stop' && 'stop' in provider) {
        await (provider as any).stop();
      } else if (action === 'restart' && 'restart' in provider) {
        await (provider as any).restart();
      } else if (action === 'execute') {
        // quickpick 输入运行命令
        const args = await window.showInputBox({
          title: '输入要执行的参数',
          prompt: '例如：--input xx --output yyy',
          value:
            '--type=excel -i D:\\\\Projects\\\\python_importer\\\\input\\\\Dcm.xlsx -m dcm --env dsp_long=dsp001 --env dcp_short=dsp_shortName'
        });
        await provider.execute('', args?.split(' ') ?? []);
      }

      void window.showInformationMessage(`外部工具操作成功：${providerName} -> ${action}`);
    } catch (ex) {
      void window.showErrorMessage(
        `外部工具操作失败：${providerName} -> ${action}，${ex instanceof Error ? ex.message : String(ex)}`
      );
    }
  }

  /**
   * 选择外部工具操作类型
   * @returns 选择结果
   */
  private async pickAction(): Promise<ManageExternalCommandArgs['action'] | undefined> {
    const selected = await window.showQuickPick(
      [
        { label: 'start', detail: '启动外部工具提供者' },
        { label: 'stop', detail: '停止外部工具提供者' },
        { label: 'restart', detail: '重启外部工具提供者' },
        { label: 'status', detail: '查看所有外部工具状态' },
        { label: 'execute', detail: '执行外部工具提供者' }
      ],
      {
        title: '选择外部工具操作'
      }
    );

    return selected?.label as ManageExternalCommandArgs['action'] | undefined;
  }

  /**
   * 选择外部工具提供者
   * @returns 选择结果
   */
  private async pickProvider(): Promise<ProviderName | undefined> {
    const available = this.container.external.getAvailableProviders();
    const providers = available.length > 0 ? available : Object.values(ProviderName);
    const selected = await window.showQuickPick(providers, {
      title: '选择外部工具提供者'
    });
    return selected as ProviderName | undefined;
  }

  /**
   * 展示外部工具状态
   */
  private showStatus(): void {
    const statuses = this.container.external.getAllProviderStatuses();
    const entries = Object.entries(statuses);

    if (entries.length === 0) {
      void window.showInformationMessage('当前没有已注册的外部工具提供者');
      return;
    }

    const lines = entries.map(([name, status]) => `${name}: ${status.status}`);
    void window.showInformationMessage(`外部工具状态：${lines.join(' | ')}`);
  }
}
