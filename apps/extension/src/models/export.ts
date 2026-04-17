export interface ExportMeta {
  type: string;
}

export type ExportValue = string | number | boolean | null | ExportMeta | ExportNode | ExportValue[];

export interface ExportNode {
  _iSoft: ExportMeta;
  [key: string]: ExportValue | undefined;
}

export interface NamedExportNode extends ExportNode {
  shortName: string;
}

export interface ExportDocumentNode extends ExportNode {
  modelVersion: ExportNode;
  package: ExportNode[];
}
