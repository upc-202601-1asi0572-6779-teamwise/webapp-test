import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { PlantationService } from '../../../plantations/services/plantation.service';
import { AlertService } from '../../../alerts/services/alert.service';
import { RecommendationService } from '../../../recommendations/services/recommendation.service';
import { SensorReadingService } from '../../../../core/services/sensor-reading.service';
import { DeviceService } from '../../../devices/services/device.service';
import { InspectionService } from '../../../inspections/services/inspection.service';
import { Plantation } from '../../../plantations/models/plantation.model';
import { Zone } from '../../../plantations/models/zone.model';
import { Alert } from '../../../alerts/models/alert.model';
import { Recommendation } from '../../../recommendations/models/recommendation.model';
import { SensorReading } from '../../../../core/models/sensor-reading.model';
import { Device } from '../../../devices/models/device.model';
import { FieldInspection } from '../../../inspections/models/inspection.model';

interface SparklineItem {
  label: string;
  unit: string;
  color: string;
  currentValue: number;
  vMin: number;
  vMax: number;
  points: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly plantationService = inject(PlantationService);
  private readonly alertService = inject(AlertService);
  private readonly recommendationService = inject(RecommendationService);
  private readonly sensorReadingService = inject(SensorReadingService);
  private readonly deviceService = inject(DeviceService);
  private readonly authService = inject(AuthService);
  private readonly inspectionService = inject(InspectionService);
  private readonly router = inject(Router);

  readonly isAgronomist = computed(() => this.authService.currentUser?.role === 'agronomist');

  readonly loading = signal(true);
  readonly error = signal('');
  readonly plantations = signal<Plantation[]>([]);
  readonly selectedPlantationId = signal(0);

  readonly zones = signal<Zone[]>([]);
  readonly activeAlerts = signal<Alert[]>([]);
  readonly alertCount = signal({ critical: 0, warning: 0, total: 0 });
  readonly recommendations = signal<Recommendation[]>([]);
  readonly latestReadings = signal<SensorReading[]>([]);
  readonly devices = signal<Device[]>([]);
  readonly inspections = signal<FieldInspection[]>([]);
  readonly trendReadings = signal<SensorReading[]>([]);

  readonly selectedPlantation = computed(() => {
    const id = this.selectedPlantationId();
    return this.plantations().find((p) => p.id === id) ?? null;
  });

  readonly healthColors: Record<string, string> = {
    optimal: 'var(--color-success)',
    at_risk: 'var(--color-warning)',
    critical: 'var(--color-danger)',
  };

  readonly healthLabels: Record<string, string> = {
    optimal: 'Optimo',
    at_risk: 'En riesgo',
    critical: 'Critico',
  };

  readonly connectedCount = computed(() =>
    this.devices().filter((d) => d.connectivityStatus === 'connected').length,
  );
  readonly offlineCount = computed(() =>
    this.devices().filter((d) => d.connectivityStatus === 'offline_mode').length,
  );
  readonly disconnectedCount = computed(() =>
    this.devices().filter((d) => d.connectivityStatus === 'disconnected').length,
  );

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
      temperature: { label: 'Temperatura', unit: '°C', color: 'var(--color-warning)' },
      soil_humidity: { label: 'Humedad del suelo', unit: '%', color: 'var(--color-accent-cyan)' },
      soil_ph: { label: 'pH del suelo', unit: '', color: 'var(--color-success)' },
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

  ngOnInit(): void {
    this.loadAll();
  }

  selectPlantation(id: number): void {
    this.selectedPlantationId.set(id);
    if (id > 0) {
      this.loadZones(id);
    } else {
      this.zones.set([]);
    }
  }

  navigateToReports(): void {
    this.router.navigate(['/reportes']);
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      plantations: this.plantationService.list(),
      alerts: this.alertService.list({ status: 'active', size: 5 }),
      alertCount: this.alertService.count(),
      recommendations: this.recommendationService.list({ status: 'published', size: 3 }),
      readings: this.sensorReadingService.list({ size: 6 }),
      trendData: this.sensorReadingService.list({ size: 72 }),
      devices: this.deviceService.list(),
      inspections: this.inspectionService.list({ size: 4 }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ plantations, alerts, alertCount, recommendations, readings, trendData, devices, inspections }) => {
          this.plantations.set(plantations);
          this.activeAlerts.set(alerts.alerts);
          this.alertCount.set({
            critical: alertCount.critical,
            warning: alertCount.warning,
            total: alertCount.total,
          });
          this.recommendations.set(recommendations.recommendations);
          this.latestReadings.set(readings.readings);
          this.trendReadings.set(trendData.readings);
          this.devices.set(devices);
          this.inspections.set(inspections.inspections);

          this.loadZones(plantations[0]?.id ?? 0);
        },
        error: () => this.error.set('No se pudieron cargar los datos del dashboard.'),
      });
  }

  private loadZones(plantationId: number): void {
    if (!plantationId) return;

    this.plantationService.listZones(plantationId).subscribe({
      next: (zones) => this.zones.set(zones),
    });
  }
}
