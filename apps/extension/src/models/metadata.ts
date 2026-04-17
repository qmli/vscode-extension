export interface KeyValue<T> {
  [key: string]: T;
}

export interface Metadata {
  version: string;
  versions: string[];
  path: string;

  [key: string]: unknown;
}

export interface InterfaceInfo {
  root: string;
  library: { al: KeyValue<KeyValue<string>>; ap: KeyValue<KeyValue<string>>; cp: KeyValue<KeyValue<string>> };
  application: { al: KeyValue<KeyValue<string>>; ap: KeyValue<KeyValue<string>>; cp: KeyValue<KeyValue<string>> };
  integrated: { al: KeyValue<KeyValue<string>>; ap: KeyValue<KeyValue<string>>; cp: KeyValue<KeyValue<string>> };
  collections: Set<string>;
  templates: {
    library: string[];
    integrated: string[];
    applicationAP: string[];
    applicationCP: string[];
  };
}
