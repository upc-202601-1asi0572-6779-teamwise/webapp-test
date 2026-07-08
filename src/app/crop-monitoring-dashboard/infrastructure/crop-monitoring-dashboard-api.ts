/**
 * Public API facade for the Crop Monitoring Dashboard bounded context.
 *
 * External BCs should import from this file instead of reaching into
 * individual infrastructure or application files. This keeps the BC
 * contract explicit and makes future refactors safer.
 *
 * The Dashboard BC is an aggregator BC — it orchestrates across multiple
 * BCs (plantations, alerts, recommendations, readings, devices, inspections)
 * and exposes a unified store that presentation views consume.
 */

// Store (primary orchestration seam)
export { CropMonitoringDashboardStore } from '../application/crop-monitoring-dashboard.store';

// Dashboard-specific view models
export type { SparklineItem, TrendCard, ZoneHealthItem } from '../domain/model/dashboard-view.model';
