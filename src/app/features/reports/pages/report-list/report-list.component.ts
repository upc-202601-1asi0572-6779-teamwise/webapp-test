import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Report } from '../../models/report.model';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-report-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './report-list.component.html',
})
export class ReportListComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly reports = signal<Report[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.reportService
      .list({ status: 'published', size: 50 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.reports.set(response.reports),
        error: () => this.error.set('No se pudieron cargar los reportes.'),
      });
  }
}
