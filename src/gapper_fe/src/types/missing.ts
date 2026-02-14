export type MissingReason = "missing_ticker_data" | "missing_backend_field";

export interface MissingField {
  key: string;
  reason: MissingReason;
  detail?: string;
}

export interface MissingDataBlock {
  title: string;
  fields: MissingField[];
  hint?: string;
}
