import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Report } from '../../models/report.model';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-report-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './report-detail.component.html',
})
export class ReportDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reportService = inject(ReportService);

  readonly report = signal<Report | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.load(id);
    } else {
      this.error.set('Reporte no valido.');
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.reportService
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (report) => this.report.set(report),
        error: () => this.error.set('No se pudo cargar el reporte.'),
      });
  }
}
