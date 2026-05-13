import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Plantation } from '../../models/plantation.model';
import { PlantationService } from '../../services/plantation.service';

@Component({
  selector: 'app-plantation-list',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './plantation-list.component.html',
})
export class PlantationListComponent implements OnInit {
  private readonly plantationService = inject(PlantationService);

  plantations = signal<Plantation[]>([]);
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.plantationService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (plantations) => this.plantations.set(plantations),
        error: () => this.error.set('No se pudieron cargar las plantaciones.'),
      });
  }
}
