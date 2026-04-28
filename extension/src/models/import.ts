import type { ExportMeta } from '@/models/export';

export type ImportEntryKey =
  | 'element'
  | 'CompuMethod'
  | 'ApplicationDataTypes'
  | 'ImplementationDataTypes'
  | 'systemSignals'
  | 'bswModule'
  | 'ecu';

export interface ImportNode extends Record<string, unknown> {
  _iSoft?: ExportMeta;
  shortName?: string;
  name?: string;
}

export interface ImportPackageNode extends ImportNode {
  _iSoft: ExportMeta;
  shortName: string;
  package?: ImportPackageNode[];
}

export interface ImportDocumentNode extends ImportNode {
  _iSoft: ExportMeta;
  modelVersion: ImportNode;
  package: ImportPackageNode[];
}

export interface ImportEntry {
  element: ImportNode;
  key: ImportEntryKey;
}

export interface WorkspaceStateEntry<TValue = unknown> {
  key: string;
  value: TValue;
}
