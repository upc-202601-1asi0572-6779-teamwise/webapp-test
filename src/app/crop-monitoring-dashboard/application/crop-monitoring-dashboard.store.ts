import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/infrastructure/auth.service';
import { PlantationService } from '../../field-technical-management/infrastructure/field-technical-management-api';
import { AlertService } from '../../alert-and-notification/infrastructure/alert-and-notification-api';
import { RecommendationService } from '../../agronomic-recommendation/infrastructure/agronomic-recommendation-api';
import { SensorReadingService } from '../../shared/infrastructure/sensor-reading.service';
import { EdgeGatewayService } from '../../iot-device-management/infrastructure/iot-device-management-api';
import { InspectionService } from '../../field-technical-management/infrastructure/field-technical-management-api';
import { Plantation } from '../../field-technical-management/domain/model/plantation.entity';
import { Zone } from '../../field-technical-management/domain/model/zone.entity';
import { Alert } from '../../alert-and-notification/domain/model/alert.entity';
import { Recommendation } from '../../agronomic-recommendation/domain/model/recommendation.entity';
import { SensorReading } from '../../shared/domain/sensor-reading.model';
import { Device } from '../../iot-device-management/domain/model/device.entity';
import { FieldInspection } from '../../field-technical-management/domain/model/inspection.entity';
import { TranslationService } from '../../i18n/translation.service';
import type { SparklineItem, TrendCard, ZoneHealthItem } from '../domain/model/dashboard-view.model';

/**
 * Central state store for the Crop Monitoring Dashboard bounded context.
 *
 * Orchestrates data from multiple BCs (plantations, alerts, recommendations,
 * sensor readings, devices, inspections) into dashboard-ready signals and
 * computed values. Presentation views consume these signals without
 * duplicating fetch or derivation logic.
 */
@Injectable({ providedIn: 'root' })
export class CropMonitoringDashboardStore {
  private readonly plantationService = inject(PlantationService);
  private readonly alertService = inject(AlertService);
  private readonly recommendationService = inject(RecommendationService);
  private readonly sensorReadingService = inject(SensorReadingService);
  private readonly edgeGatewayService = inject(EdgeGatewayService);
  private readonly authService = inject(AuthService);
  private readonly inspectionService = inject(InspectionService);
  private readonly t = inject(TranslationService);

  // ── Core state ────────────────────────────────────────────────
  readonly loading = signal(true);
  readonly error = signal('');
  readonly plantations = signal<Plantation[]>([]);
  readonly selectedPlantationId = signal(0);

  // ── Per-BC data ───────────────────────────────────────────────
  readonly zones = signal<Zone[]>([]);
  readonly activeAlerts = signal<Alert[]>([]);
  readonly alertCount = signal({ critical: 0, warning: 0, total: 0 });
  readonly recommendations = signal<Recommendation[]>([]);
  readonly latestReadings = signal<SensorReading[]>([]);
  readonly devices = signal<Device[]>([]);
  readonly inspections = signal<FieldInspection[]>([]);
  readonly trendReadings = signal<SensorReading[]>([]);

  // ── Role ──────────────────────────────────────────────────────
  readonly isAgronomist = computed(() => this.authService.user()?.role === 'agronomist');

  // ── Lookups ───────────────────────────────────────────────────
  readonly healthColors: Record<string, string> = {
    optimal: 'var(--color-success)',
    at_risk: 'var(--color-warning)',
    critical: 'var(--color-danger)',
  };

  get healthLabels(): Record<string, string> {
    return {
      optimal: this.t.translate('dashboard.health.optimal'),
      at_risk: this.t.translate('dashboard.health.atRisk'),
      critical: this.t.translate('dashboard.health.critical'),
    };
  }

  get growerAlertLabels(): Record<string, string> {
    return {
      critical: this.t.translate('dashboard.alerts.urgent'),
      warning: this.t.translate('dashboard.alerts.attention'),
    };
  }

  // ── Computed: selected plantation ─────────────────────────────
  readonly selectedPlantation = computed(() => {
    const id = this.selectedPlantationId();
    return this.plantations().find((p) => p.id === id) ?? null;
  });

  // ── Computed: device counts ───────────────────────────────────
  readonly connectedCount = computed(() =>
    this.devices().filter((d) => d.connectivityStatus === 'connected').length,
  );
  readonly offlineCount = computed(() =>
    this.devices().filter((d) => d.connectivityStatus === 'offline_mode').length,
  );
  readonly disconnectedCount = computed(() =>
    this.devices().filter((d) => d.connectivityStatus === 'disconnected').length,
  );

  // ── Computed: sparkline items (agronomist) ────────────────────
  readonly sparklineItems = computed((): SparklineItem[] => {
    const readings = this.trendReadings();
    if (!readings.length) return [];

    const grouped = new Map<string, SensorReading[]>();
    for (const r of readings) {
      const key = r.variableType;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const configs: Record<string, { label: string; unit: string; color: string }> = {
      temperature: { label: this.t.translate('dashboard.sparkline.temperature'), unit: '°C', color: 'var(--color-warning)' },
      soil_humidity: { label: this.t.translate('dashboard.sparkline.soilHumidity'), unit: '%', color: 'var(--color-accent-cyan)' },
      soil_ph: { label: this.t.translate('dashboard.sparkline.soilPh'), unit: '', color: 'var(--color-success)' },
    };

    const items: SparklineItem[] = [];
    for (const [key, groupReadings] of grouped) {
      const cfg = configs[key];
      if (!cfg || groupReadings.length < 2) continue;

      const sorted = [...groupReadings].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );
      const values = sorted.map((r) => r.value);
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const buffer = (vMax - vMin) * 0.15 || 0.5;
      const yMin = vMin - buffer;
      const yMax = vMax + buffer;
      const yRange = yMax - yMin;

      const width = 200;
      const height = 48;
      const pad = 3;
      const plotH = height - pad * 2;
      const points = sorted
        .map((r, i) => {
          const x = pad + (i / Math.max(sorted.length - 1, 1)) * (width - pad * 2);
          const y = pad + plotH - ((r.value - yMin) / yRange) * plotH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

      items.push({
        label: cfg.label,
        unit: cfg.unit,
        color: cfg.color,
        currentValue: sorted[sorted.length - 1].value,
        vMin,
        vMax,
        points,
      });
    }
    return items;
  });

  // ── Computed: trend cards (grower) ────────────────────────────
  readonly trendCards = computed((): TrendCard[] => {
    const readings = this.trendReadings();
    if (!readings.length) return [];

    const grouped = new Map<string, SensorReading[]>();
    for (const r of readings) {
      const key = r.variableType;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const alerts = this.activeAlerts();
    const configs: Record<string, { label: string; unit: string; color: string; icon: string }> = {
      temperature: {
        label: this.t.translate('dashboard.sparkline.temperature'),
        unit: '°C',
        color: 'var(--color-warning)',
        icon: 'M12 2a7 7 0 00-7 7c0 2.4 1.2 4.6 3 5.9V22h2v-4h4v4h2v-7.1c1.8-1.3 3-3.5 3-5.9a7 7 0 00-7-7z',
      },
      soil_humidity: {
        label: this.t.translate('dashboard.sparkline.soilHumidity'),
        unit: '%',
        color: 'var(--color-accent-cyan)',
        icon: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
      },
      soil_ph: {
        label: this.t.translate('dashboard.sparkline.soilPh'),
        unit: '',
        color: 'var(--color-success)',
        icon: 'M9 2a1 1 0 011 1v1h4V3a1 1 0 112 0v1h1a2 2 0 012 2v2h-2v6h2v2a2 2 0 01-2 2h-1v1a1 1 0 11-2 0v-1h-4v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2h2V8H3V6a2 2 0 012-2h1V3a1 1 0 011-1z',
      },
    };

    const items: TrendCard[] = [];
    for (const [key, groupReadings] of grouped) {
      const cfg = configs[key];
      if (!cfg || groupReadings.length < 2) continue;

      const sorted = [...groupReadings].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );

      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const delta = last.value - first.value;
      const absDelta = Math.abs(delta);
      let direction: 'up' | 'down' | 'stable' = 'stable';
      if (absDelta > 0.05 && delta > 0) direction = 'up';
      else if (absDelta > 0.05 && delta < 0) direction = 'down';

      const matchedAlert = alerts.find((a) => a.variableType === key);
      const alertLevel = matchedAlert?.alertLevel ?? null;
      const cardColor = matchedAlert?.alertLevel === 'critical'
        ? 'var(--color-danger)'
        : matchedAlert?.alertLevel === 'warning'
          ? 'var(--color-warning)'
          : cfg.color;

      items.push({
        label: cfg.label,
        unit: cfg.unit,
        currentValue: last.value,
        delta: Math.abs(delta),
        direction,
        color: cardColor,
        icon: cfg.icon,
        alertLevel,
      });
    }
    return items;
  });

  // ── Computed: top recommendation ──────────────────────────────
  readonly topRecommendation = computed(() => {
    const recs = this.recommendations();
    if (!recs.length) return null;
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...recs].sort(
      (a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99),
    )[0];
  });

  // ── Computed: zone health items (grower enriched view) ────────
  readonly zoneHealthItems = computed((): ZoneHealthItem[] => {
    const zoneList = this.zones();
    const alerts = this.activeAlerts();

    return zoneList.map((zone) => {
      const zoneAlerts = alerts
        .filter((a) => a.monitoringZoneId === zone.id)
        .sort((a, b) => {
          const order: Record<string, number> = { critical: 0, warning: 1, informative: 2 };
          return (order[a.alertLevel] ?? 99) - (order[b.alertLevel] ?? 99);
        });

      const worstAlert = zoneAlerts[0] ?? null;
      const criticalParam = worstAlert
        ? `${worstAlert.label}: ${worstAlert.triggeredValue} · ${this.growerAlertLabels[worstAlert.alertLevel] ?? ''}`
        : null;
      const criticalParamColor = worstAlert?.alertLevel === 'critical'
        ? 'var(--color-danger)'
        : worstAlert?.alertLevel === 'warning'
          ? 'var(--color-warning)'
          : 'var(--color-text-muted)';

      return {
        id: zone.id,
        name: zone.name,
        hectares: zone.hectares,
        status: zone.cropHealthStatus,
        statusColor: this.healthColors[zone.cropHealthStatus],
        statusLabel: this.healthLabels[zone.cropHealthStatus],
        criticalParam,
        criticalParamColor,
      };
    });
  });

  // ── Orchestration: load everything ────────────────────────────
  loadAll(): void {
    this.loading.set(true);
    this.error.set('');

    const f = environment.features;
    const demoPlantation = this.buildDemoPlantation();

    forkJoin({
      plantations: f.plantationsApi
        ? this.plantationService.list()
        : of([demoPlantation]),
      alerts: f.alerts
        ? this.alertService.list({ status: 'active', size: 50 })
        : of({ alerts: [] as Alert[], totalElements: 0, totalPages: 0, page: 1 }),
      alertCount: f.alerts
        ? this.alertService.count()
        : of({ critical: 0, warning: 0, total: 0, informative: 0, unacknowledged: 0 }),
      recommendations: f.recommendations
        ? this.recommendationService.list({
            plantationId: environment.demo.plantationId,
            // Live API filter requires lowercase: pending | approved | published
            status: 'published',
            size: 3,
          })
        : of({ recommendations: [] as Recommendation[], totalElements: 0, totalPages: 0, page: 1 }),
      readings: f.sensors
        ? this.sensorReadingService.list({ size: 6, deviceMac: environment.demo.deviceMac })
        : of({ readings: [] as SensorReading[], totalElements: 0, totalPages: 0, page: 1, size: 0 }),
      trendData: f.sensors
        ? this.sensorReadingService.list({ size: 72, deviceMac: environment.demo.deviceMac })
        : of({ readings: [] as SensorReading[], totalElements: 0, totalPages: 0, page: 1, size: 0 }),
      gateways: f.iotStatus ? this.edgeGatewayService.listGateways() : of([]),
      inspections: f.inspections
        ? this.inspectionService.list({ size: 4 })
        : of({ inspections: [] as FieldInspection[], totalElements: 0, totalPages: 0, page: 1 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ plantations, alerts, alertCount, recommendations, readings, trendData, gateways, inspections }) => {
          this.plantations.set(plantations);
          this.activeAlerts.set(alerts.alerts ?? []);
          this.alertCount.set({
            critical: alertCount.critical ?? 0,
            warning: alertCount.warning ?? 0,
            total: alertCount.total ?? 0,
          });
          this.recommendations.set(recommendations.recommendations);
          this.latestReadings.set(readings.readings);
          this.trendReadings.set(trendData.readings);
          this.devices.set(gateways.map((g, i) => this.gatewayAsDevice(g, i)));
          this.inspections.set(inspections.inspections ?? []);

          const firstId = plantations[0]?.id ?? environment.demo.plantationId;
          this.selectedPlantationId.set(firstId);
          if (f.plantationsApi) {
            this.loadZones(firstId);
          } else {
            this.zones.set([]);
          }
        },
        error: () => this.error.set(this.t.translate('dashboard.error.load')),
      });
  }

  private buildDemoPlantation(): Plantation {
    const now = new Date().toISOString();
    return {
      id: environment.demo.plantationId,
      userId: environment.demo.agronomistId,
      name: `Demo plantation #${environment.demo.plantationId}`,
      location: 'Live backend / demo',
      totalHectares: 10,
      soilType: '—',
      cropAge: '—',
      phenologicalPhase: 'produccion',
      latitude: 0,
      longitude: 0,
      zonesCount: 0,
      devicesCount: 1,
      overallHealth: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private gatewayAsDevice(
    g: { mac: string; isConnected: boolean; status: string },
    index: number,
  ): Device {
    const connectivityStatus: Device['connectivityStatus'] = g.isConnected
      ? 'connected'
      : g.status?.toLowerCase().includes('offline')
        ? 'offline_mode'
        : 'disconnected';
    return {
      id: index + 1,
      userId: environment.demo.agronomistId,
      serialNumber: g.mac,
      plantationId: environment.demo.plantationId,
      plantationName: `Plantation #${environment.demo.plantationId}`,
      monitoringZoneId: 0,
      zoneName: '—',
      activationStatus: 'active',
      connectivityStatus,
      healthStatus: g.isConnected ? 'healthy' : 'warning',
      samplingIntervalMinutes: 15,
      transmissionMode: 'batch',
      retryPolicy: 'default',
      maxOfflineStorageHours: 24,
      lastSyncAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  // ── Plantation selection ──────────────────────────────────────
  selectPlantation(id: number): void {
    this.selectedPlantationId.set(id);
    if (id > 0) {
      this.loadZones(id);
    } else {
      this.zones.set([]);
    }
  }

  // ── Internal: zone loading ────────────────────────────────────
  private loadZones(plantationId: number): void {
    if (!plantationId) return;

    this.plantationService.listZones(plantationId).subscribe({
      next: (zones) => this.zones.set(zones),
    });
  }
}
