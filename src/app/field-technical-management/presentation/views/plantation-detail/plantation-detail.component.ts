import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../shared/infrastructure/auth.service';
import { AlertService } from '../../../../alert-and-notification/infrastructure/alert-and-notification-api';
import { Plantation } from '../../../domain/model/plantation.entity';
import { Zone } from '../../../domain/model/zone.entity';
import { Alert } from '../../../../alert-and-notification/domain/model/alert.entity';
import { PlantationService } from '../../../infrastructure/plantation-api.service';

@Component({
  selector: 'app-plantation-detail',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './plantation-detail.component.html',
})
export class PlantationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly plantationService = inject(PlantationService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);

  readonly isAgronomist = computed(() => this.authService.currentUser?.role === 'agronomist');

  readonly plantation = signal<Plantation | null>(null);
  readonly zones = signal<Zone[]>([]);
  readonly activeAlerts = signal<Alert[]>([]);
  readonly loading = signal(false);
  readonly zonesLoading = signal(false);
  readonly error = signal('');

  readonly healthColor: Record<string, string> = {
    optimal: 'var(--color-success)',
    at_risk: 'var(--color-warning)',
    critical: 'var(--color-danger)',
  };

  readonly healthBg: Record<string, string> = {
    optimal: 'rgba(76,205,130,0.12)',
    at_risk: 'var(--color-warning-10)',
    critical: 'var(--color-danger-10)',
  };

  readonly zoneAlerts = computed(() => {
    const alerts = this.activeAlerts();
    const map = new Map<number, Alert[]>();
    for (const a of alerts) {
      const key = a.monitoringZoneId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  });

  // ── i18n getters/methods ──

  get backLabel(): string {
    return this.isAgronomist()
      ? $localize`:@@plant.detail.back.agronomist:Volver a cartera`
      : $localize`:@@plant.detail.back.grower:Volver a plantaciones`;
  }

  get loadingText(): string {
    return $localize`:@@plant.detail.loading:Cargando detalle...`;
  }

  healthLabel(status: string): string {
    if (status === 'critical') return $localize`:@@plant.detail.health.critical:Critico`;
    if (status === 'at_risk') return $localize`:@@plant.detail.health.atRisk:En riesgo`;
    return $localize`:@@plant.detail.health.optimal:Optimo`;
  }

  phaseLabel(phase: string): string {
    return phase === 'produccion'
      ? $localize`:@@plant.detail.phase.produccion:En produccion`
      : $localize`:@@plant.detail.phase.establecimiento:En establecimiento`;
  }

  get zonesLabel(): string {
    return $localize`:@@plant.detail.zones:Zonas`;
  }

  get devicesLabel(): string {
    return $localize`:@@plant.detail.devices:Dispositivos`;
  }

  get alertsLabel(): string {
    return $localize`:@@plant.detail.alerts:Alertas`;
  }

  get soilLabel(): string {
    return $localize`:@@plant.detail.soil:Suelo:`;
  }

  get ageLabel(): string {
    return $localize`:@@plant.detail.age:Antiguedad:`;
  }

  get updatedLabel(): string {
    return $localize`:@@plant.detail.updated:Actualizado:`;
  }

  get editBtnLabel(): string {
    return $localize`:@@plant.detail.editBtn:Editar plantacion`;
  }

  get addZoneBtnLabel(): string {
    return $localize`:@@plant.detail.addZoneBtn:Agregar zona`;
  }

  get monitoringZonesLabel(): string {
    return $localize`:@@plant.detail.monitoringZones:Zonas de monitoreo`;
  }

  get zonesRegisteredLabel(): string {
    return $localize`:@@plant.detail.zonesRegistered:zonas registradas`;
  }

  get loadingZonesText(): string {
    return $localize`:@@plant.detail.loadingZones:Cargando zonas...`;
  }

  get noZonesTitle(): string {
    return $localize`:@@plant.detail.noZones:Sin zonas registradas`;
  }

  get noZonesDesc(): string {
    return this.isAgronomist()
      ? $localize`:@@plant.detail.noZonesDescAgronomist:Esta plantacion aun no tiene zonas de monitoreo definidas.`
      : $localize`:@@plant.detail.noZonesDescGrower:Crea la primera zona para preparar la asignacion de dispositivos.`;
  }

  get createFirstZoneLabel(): string {
    return $localize`:@@plant.detail.createFirstZone:Crear primera zona`;
  }

  soilTypeLabel(key: string): string {
    const labels: Record<string, string> = {};
    labels['arcilloso_humedo'] = $localize`:@@plant.detail.soil.arcillosoHumedo:Arcilloso humedo`;
    labels['franco_arenoso'] = $localize`:@@plant.detail.soil.francoArenoso:Franco arenoso`;
    labels['franco_arcilloso'] = $localize`:@@plant.detail.soil.francoArcilloso:Franco arcilloso`;
    labels['arenoso'] = $localize`:@@plant.detail.soil.arenoso:Arenoso`;
    return labels[key] ?? key;
  }

  zoneAlertLevelLabel(level: string): string {
    return level === 'critical'
      ? $localize`:@@plant.detail.health.zone.critical:Critico`
      : $localize`:@@plant.detail.health.zone.atRisk:Atencion`;
  }

  get noDescriptionLabel(): string {
    return $localize`:@@plant.detail.noDescription:Sin descripcion.`;
  }

  get invalidPlantationError(): string {
    return $localize`:@@plant.detail.error.invalid:Plantacion no valida.`;
  }

  get loadErrorLabel(): string {
    return $localize`:@@plant.detail.error.load:No se pudo cargar la plantacion.`;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.load(id);
    } else {
      this.error.set(this.invalidPlantationError);
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.plantationService
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (plantation) => {
          this.plantation.set(plantation);
          this.loadZones(id);
          this.loadAlerts(id);
        },
        error: () => this.error.set(this.loadErrorLabel),
      });
  }

  private loadZones(id: number): void {
    this.zonesLoading.set(true);
    this.plantationService
      .listZones(id)
      .pipe(finalize(() => this.zonesLoading.set(false)))
      .subscribe({
        next: (zones) => this.zones.set(zones),
      });
  }

  private loadAlerts(plantationId: number): void {
    this.alertService.list({ status: 'active', plantationId, size: 50 }).subscribe({
      next: (response) => this.activeAlerts.set(response.alerts),
    });
  }
}
