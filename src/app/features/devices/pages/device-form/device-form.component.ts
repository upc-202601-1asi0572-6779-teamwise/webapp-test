import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, startWith } from 'rxjs';
import { DeviceService } from '../../services/device.service';
import { PlantationService } from '../../../plantations/services/plantation.service';
import { Plantation } from '../../../plantations/models/plantation.model';
import { Zone } from '../../../plantations/models/zone.model';

@Component({
  selector: 'app-device-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './device-form.component.html',
})
export class DeviceFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly deviceService = inject(DeviceService);
  private readonly plantationService = inject(PlantationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly zonesLoading = signal(false);
  readonly error = signal('');
  readonly plantations = signal<Plantation[]>([]);
  readonly availableZones = signal<Zone[]>([]);

  readonly form = this.fb.nonNullable.group({
    serialNumber: ['', [Validators.required, Validators.pattern(/^SP-IOT-[A-Z0-9]{4}-[A-Z0-9]{5}$/)]],
    plantationId: [0, [Validators.required, Validators.min(1)]],
    monitoringZoneId: [0, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadPlantations();
    this.form.controls.plantationId.valueChanges.pipe(startWith(this.form.controls.plantationId.value)).subscribe((plantationId) => {
      if (plantationId > 0) {
        this.loadZones(plantationId);
      } else {
        this.availableZones.set([]);
        this.form.controls.monitoringZoneId.setValue(0);
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');

    this.deviceService
      .create(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (device) => this.router.navigate(['/dispositivos', device.id]),
        error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'No se pudo registrar el dispositivo.')),
      });
  }

  private loadPlantations(): void {
    this.loading.set(true);
    this.error.set('');

    this.plantationService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (plantations) => this.plantations.set(plantations),
        error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'No se pudieron cargar las plantaciones.')),
      });
  }

  private loadZones(plantationId: number): void {
    this.zonesLoading.set(true);
    this.error.set('');

    this.plantationService
      .listZones(plantationId)
      .pipe(finalize(() => this.zonesLoading.set(false)))
      .subscribe({
        next: (zones) => {
          const availableZones = zones.filter((zone) => !zone.device);
          this.availableZones.set(availableZones);
          const currentZoneId = this.form.controls.monitoringZoneId.value;
          if (!availableZones.some((zone) => zone.id === currentZoneId)) {
            this.form.controls.monitoringZoneId.setValue(0);
          }
        },
        error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'No se pudieron cargar las zonas.')),
      });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message || fallback;
    }
    return fallback;
  }
}
