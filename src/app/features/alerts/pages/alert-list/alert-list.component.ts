import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, interval, startWith, Subscription, switchMap } from 'rxjs';
import { getApiErrorMessage } from '../../../../core/utils/api-error-message';
import { Alert, AlertCount } from '../../models/alert.model';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-alert-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './alert-list.component.html',
})
export class AlertListComponent implements OnInit, OnDestroy {
  private readonly alertService = inject(AlertService);

  alerts = signal<Alert[]>([]);
  loading = signal(false);
  saving = signal(0);
  error = signal('');
  actionError = signal('');
  activeTab = signal<'active' | 'resolved'>('active');
  badgeCount = signal<AlertCount | null>(null);

  private pollSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.load();
    this.loadCount();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  private startPolling(): void {
    this.pollSubscription = interval(60000)
      .pipe(
        startWith(0),
        switchMap(() => this.alertService.count()),
      )
      .subscribe({
        next: (count) => this.badgeCount.set(count),
      });
  }

  setTab(tab: 'active' | 'resolved'): void {
    this.activeTab.set(tab);
    this.load();
  }

  acknowledge(alert: Alert, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.saving.set(alert.id);
    this.actionError.set('');

    this.alertService
      .acknowledge(alert.id)
      .pipe(finalize(() => this.saving.set(0)))
      .subscribe({
        next: () => this.load(),
        error: (error: unknown) =>
          this.actionError.set(getApiErrorMessage(error, 'No se pudo confirmar la alerta.')),
      });
  }

  severityColor(alert: Alert): string {
    if (alert.alertLevel === 'critical') return 'var(--color-danger)';
    if (alert.alertLevel === 'warning') return '#f59e0b';
    return 'var(--color-border-subtle)';
  }

  severityBg(alert: Alert): string {
    if (alert.alertLevel === 'critical') return 'var(--color-danger-10)';
    if (alert.alertLevel === 'warning') return '#fef3c7';
    return 'var(--color-bg-soft-cyan)';
  }

  severityFg(alert: Alert): string {
    if (alert.alertLevel === 'critical') return 'var(--color-danger)';
    if (alert.alertLevel === 'warning') return '#92400e';
    return 'var(--color-accent-cyan)';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.alertService
      .list({ status: this.activeTab() })
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
