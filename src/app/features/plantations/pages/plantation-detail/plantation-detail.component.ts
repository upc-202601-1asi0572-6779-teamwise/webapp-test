import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { Plantation } from '../../models/plantation.model';
import { Zone } from '../../models/zone.model';
import { PlantationService } from '../../services/plantation.service';

@Component({
  selector: 'app-plantation-detail',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './plantation-detail.component.html',
})
export class PlantationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly plantationService = inject(PlantationService);
  private readonly authService = inject(AuthService);

  readonly isAgronomist = computed(() => this.authService.currentUser?.role === 'agronomist');

  plantation = signal<Plantation | null>(null);
  zones = signal<Zone[]>([]);
  loading = signal(false);
  zonesLoading = signal(false);
  error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.load(id);
    } else {
      this.error.set('Plantacion no valida.');
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
        },
        error: () => this.error.set('No se pudo cargar la plantacion.'),
      });
  }

  private loadZones(id: number): void {
    this.zonesLoading.set(true);
    this.plantationService
      .listZones(id)
      .pipe(finalize(() => this.zonesLoading.set(false)))
      .subscribe({
        next: (zones) => this.zones.set(zones),
        error: () => this.error.set('No se pudieron cargar las zonas de la plantacion.'),
      });
  }
}
