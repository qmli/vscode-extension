export interface ProjectViewInfo {
  id: string;
  name: string;
  type: string;
  handle: string;
  column: Record<string, string | number | boolean | unknown>;
  active: boolean;
  ext?: Record<string, string | number | boolean | unknown>;
}
