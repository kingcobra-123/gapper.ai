export interface AlertRule {
  id: string;
  ticker: string;
  condition: string;
  notes: string;
  enabled: boolean;
  createdAt: string;
}
