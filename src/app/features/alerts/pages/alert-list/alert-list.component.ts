import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Alert, AlertCount } from '../../models/alert.model';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-alert-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './alert-list.component.html',
})
export class AlertListComponent implements OnInit {
  private readonly alertService = inject(AlertService);

  alerts = signal<Alert[]>([]);
  loading = signal(false);
  error = signal('');
  badgeCount = signal<AlertCount | null>(null);

  ngOnInit(): void {
    this.load();
    this.loadCount();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.alertService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.alerts.set(response.alerts),
        error: () => this.error.set('No se pudieron cargar las alertas.'),
      });
  }

  private loadCount(): void {
    this.alertService.count().subscribe({
      next: (count) => this.badgeCount.set(count),
    });
  }
}
