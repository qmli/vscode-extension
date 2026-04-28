import type { Disposable, QuickPickItem } from 'vscode';
import { window } from 'vscode';
import type { Container } from '@/container';
import type { QuickPickItemOfT } from '../items/common';

export async function showNewOrSelectExamplePicker(
  title: string | undefined
): Promise<ProjectExample | string | undefined> {
  // TODO: needs updating
  const createNewProject = {
    label: '创建你的项目',
    description: '创建一个新的项目来应用 Cloud Patch。'
  };
  const selectExistingProject = {
    label: '选择一个已有的项目',
    description: '选择一个已有的项目来应用 Cloud Patch。'
  };

  const items: QuickPickItem[] = [createNewProject, selectExistingProject];

  const quickpick = window.createQuickPick<QuickPickItem>();
  quickpick.ignoreFocusOut = true;

  const disposables: Disposable[] = [];

  try {
    const pick = await new Promise<QuickPickItem | undefined>((resolve) => {
      disposables.push(
        quickpick.onDidHide(() => resolve(undefined)),
        quickpick.onDidAccept(() => {
          if (quickpick.activeItems.length !== 0) {
            resolve(quickpick.activeItems[0]);
          }
        })
      );

      quickpick.title = title;
      quickpick.placeholder = 'Choose a branch option';
      quickpick.matchOnDescription = true;
      quickpick.matchOnDetail = true;
      quickpick.items = items;

      quickpick.show();
    });

    if (pick === createNewProject) {
      return await showNewProjectPicker(title, '输入新项目的名称');
    } else if (pick === selectExistingProject) {
      return await showProjectPicker(title, '选择一个已有的项目');
    }

    return undefined;
  } finally {
    quickpick.dispose();
    disposables.forEach((d) => void d.dispose());
  }
}
async function showNewProjectPicker(title: string | undefined, placeholder?: string): Promise<string | undefined> {
  const input = window.createInputBox();
  input.ignoreFocusOut = true;

  const disposables: Disposable[] = [];

  let newBranchName: string | undefined;
  try {
    newBranchName = await new Promise<string | undefined>((resolve) => {
      disposables.push(
        input.onDidHide(() => resolve(undefined)),
        input.onDidAccept(() => {
          const value = input.value.trim();
          if (value == null) {
            input.validationMessage = 'Please enter a valid branch name';
            return;
          }

          resolve(value);
        })
      );

      input.title = title;
      input.placeholder = placeholder;
      input.prompt = 'Enter a name for the new branch';

      input.show();
    });
  } finally {
    input.dispose();
    disposables.forEach((d) => void d.dispose());
  }

  return newBranchName;
}

interface ProjectQuickPickItem extends QuickPickItemOfT<ProjectExample> {
  readonly current: boolean;
  readonly ref: string;
  readonly remote: boolean;
}

async function showProjectPicker(title: string | undefined, placeholder?: string): Promise<ProjectExample | undefined> {
  const items: ProjectQuickPickItem[] = [
    {
      label: '示例项目 1',
      description: '这是一个示例项目',
      current: false,
      ref: 'example-project-1',
      remote: false,
      item: new ProjectExample({} as Container, '/path/to/repo', 'example-project-1', false, new Date(), 'sha1')
    },
    {
      label: '示例项目 2',
      description: '这是另一个示例项目',
      current: true,
      ref: 'example-branch-2',
      remote: true,
      item: new ProjectExample({} as Container, '/path/to/repo', 'example-branch-2', true, new Date(), 'sha2')
    }
  ];
  if (items.length === 0) return undefined;

  const quickpick = window.createQuickPick<ProjectQuickPickItem>();
  quickpick.ignoreFocusOut = true;

  const disposables: Disposable[] = [];

  try {
    const pick = await new Promise<ProjectQuickPickItem | undefined>((resolve) => {
      disposables.push(
        quickpick.onDidHide(() => resolve(undefined)),
        quickpick.onDidAccept(() => {
          if (quickpick.activeItems.length !== 0) {
            resolve(quickpick.activeItems[0]);
          }
        })
      );

      quickpick.title = title;
      quickpick.placeholder = placeholder;
      quickpick.matchOnDescription = true;
      quickpick.matchOnDetail = true;
      quickpick.items = items;

      quickpick.show();
    });

    return pick?.item;
  } finally {
    quickpick.dispose();
    disposables.forEach((d) => void d.dispose());
  }
}

class ProjectExample {
  constructor(
    private readonly container: Container,
    public readonly repoPath: string,
    public readonly refName: string,
    public readonly current: boolean,
    public readonly date: Date | undefined,
    public readonly sha?: string,
    public readonly worktree?: { path: string; isDefault: boolean } | false,
    public readonly rebasing: boolean = false
  ) {}
}
