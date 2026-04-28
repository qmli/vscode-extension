export type WorkspaceFolder = {
  uuid: string;
  path: string;
};

export type Workspace = {
  folders: WorkspaceFolder[];
  settings: [];
};
