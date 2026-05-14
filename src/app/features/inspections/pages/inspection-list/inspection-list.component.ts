import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { FieldInspection } from '../../models/inspection.model';
import { InspectionService } from '../../services/inspection.service';

@Component({
  selector: 'app-inspection-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './inspection-list.component.html',
})
export class InspectionListComponent implements OnInit {
  private readonly inspectionService = inject(InspectionService);

  readonly inspections = signal<FieldInspection[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.inspectionService
      .list({ size: 50 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.inspections.set(response.inspections),
        error: () => this.error.set('No se pudieron cargar las inspecciones.'),
      });
  }
}
