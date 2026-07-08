import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, interval, startWith, Subscription, switchMap } from 'rxjs';
import { getApiErrorMessage } from '../../infrastructure/api-error-message';
import { Notification } from '../../../alert-and-notification/domain/model/notification.entity';
import { NotificationService } from '../../infrastructure/notification.service';

const DEEP_LINK_MAP: Record<string, string> = {
  alert: '/alertas',
  device: '/dispositivos',
  recommendation: '/recomendaciones',
  report: '/reportes',
};

@Component({
  selector: 'app-notification-dropdown',
  imports: [DatePipe],
  templateUrl: './notification-dropdown.component.html',
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly actionError = signal('');

  private pollSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadNotifications();
    this.loadCount();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  private startPolling(): void {
    this.pollSubscription = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.notificationService.count()),
      )
      .subscribe({
        next: (count) => this.unreadCount.set(count.unreadCount),
      });
  }

  toggle(): void {
    this.open.set(!this.open());
    if (this.open()) {
      this.loadNotifications();
    }
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (notification.read) return;

    this.actionError.set('');

    this.notificationService
      .markAsRead(notification.id)
      .pipe(finalize(() => this.loadCount()))
      .subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
          );
        },
        error: (error: unknown) =>
          this.actionError.set(getApiErrorMessage(error, $localize`:@@notifications.markError:No se pudo marcar como leída.`)),
      });
  }

  markAllAsRead(): void {
    this.actionError.set('');

    this.notificationService
      .markAllAsRead()
      .pipe(finalize(() => this.loadCount()))
      .subscribe({
        next: () => {
          this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
        },
        error: (error: unknown) =>
          this.actionError.set(getApiErrorMessage(error, $localize`:@@notifications.markAllError:No se pudo marcar todas como leídas.`)),
      });
  }

  navigateToResource(notification: Notification): void {
    const baseRoute = DEEP_LINK_MAP[notification.relatedResourceType];
    if (!baseRoute) return;

    const route = ['report'].includes(notification.relatedResourceType)
      ? baseRoute
      : `${baseRoute}/${notification.relatedResourceId}`;

    this.router.navigate([route]);
    this.open.set(false);
  }

  private loadNotifications(): void {
    this.loading.set(true);
    this.actionError.set('');

    this.notificationService
      .list({ size: 10 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.notifications.set(response.notifications),
        error: (error: unknown) =>
          this.actionError.set(getApiErrorMessage(error, $localize`:@@notifications.loadError:No se pudieron cargar las notificaciones.`)),
      });
  }

  private loadCount(): void {
    this.notificationService.count().subscribe({
      next: (count) => this.unreadCount.set(count.unreadCount),
    });
  }
}
