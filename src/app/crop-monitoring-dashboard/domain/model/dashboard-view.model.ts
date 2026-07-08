/**
 * Dashboard-specific view models.
 *
 * These are presentation-oriented summarised types consumed exclusively by
 * the crop-monitoring-dashboard bounded context. They are derived from
 * domain entities owned by other BCs.
 */

export interface SparklineItem {
  label: string;
  unit: string;
  color: string;
  currentValue: number;
  vMin: number;
  vMax: number;
  points: string;
}

export interface TrendCard {
  label: string;
  unit: string;
  currentValue: number;
  delta: number;
  direction: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
  alertLevel: string | null;
}

export interface ZoneHealthItem {
  id: number;
  name: string;
  hectares: number;
  status: 'optimal' | 'at_risk' | 'critical';
  statusColor: string;
  statusLabel: string;
  criticalParam: string | null;
  criticalParamColor: string;
}
