import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { PlantationService } from '../../../plantations/services/plantation.service';
import { AlertService } from '../../../alerts/services/alert.service';
import { RecommendationService } from '../../../recommendations/services/recommendation.service';
import { SensorReadingService } from '../../../../core/services/sensor-reading.service';
import { DeviceService } from '../../../devices/services/device.service';
import { Plantation } from '../../../plantations/models/plantation.model';
import { Zone } from '../../../plantations/models/zone.model';
import { Alert } from '../../../alerts/models/alert.model';
import { Recommendation } from '../../../recommendations/models/recommendation.model';
import { SensorReading } from '../../../../core/models/sensor-reading.model';
import { Device } from '../../../devices/models/device.model';

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

  readonly connectedCount = computed(() => this.devices().filter((d) => d.connectivityStatus === 'connected').length);
  readonly offlineCount = computed(() => this.devices().filter((d) => d.connectivityStatus === 'offline_mode').length);
  readonly disconnectedCount = computed(() => this.devices().filter((d) => d.connectivityStatus === 'disconnected').length);

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

  private loadAll(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      plantations: this.plantationService.list(),
      alerts: this.alertService.list({ status: 'active', size: 5 }),
      alertCount: this.alertService.count(),
      recommendations: this.recommendationService.list({ status: 'published', size: 3 }),
      readings: this.sensorReadingService.list({ size: 6 }),
      devices: this.deviceService.list(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ plantations, alerts, alertCount, recommendations, readings, devices }) => {
          this.plantations.set(plantations);
          this.activeAlerts.set(alerts.alerts);
          this.alertCount.set({
            critical: alertCount.critical,
            warning: alertCount.warning,
            total: alertCount.total,
          });
          this.recommendations.set(recommendations.recommendations);
          this.latestReadings.set(readings.readings);
          this.devices.set(devices);

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
