export interface artistDetailContext {
  albums?: Array<Record<string, unknown>>;
  id?: string | number;
  name?: string;
  openable?: boolean;
}
