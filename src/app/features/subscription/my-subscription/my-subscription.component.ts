import { Component, inject, signal } from '@angular/core';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Subscription } from '../../../core/models/subscription.model';
import { finalize } from 'rxjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-my-subscription',
  imports: [DatePipe],
  templateUrl: './my-subscription.component.html',
})
export class MySubscriptionComponent {
  private readonly subscriptionService = inject(SubscriptionService);

  subscription = signal<Subscription | null>(null);
  loading = false;
  error = '';
  actionLoading = '';
  actionError = '';
  actionSuccess = '';

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.subscriptionService
      .getMySubscription()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (s) => this.subscription.set(s),
        error: () => (this.error = 'No tienes una suscripci\u00f3n activa.'),
      });
  }

  renew(): void {
    this.actionLoading = 'renew';
    this.actionError = '';
    this.actionSuccess = '';
    this.subscriptionService
      .renew()
      .pipe(finalize(() => (this.actionLoading = '')))
      .subscribe({
        next: (res) => {
          this.actionSuccess = res.message;
          this.load();
        },
        error: () => (this.actionError = 'Error al renovar la suscripci\u00f3n.'),
      });
  }

  cancel(): void {
    this.actionLoading = 'cancel';
    this.actionError = '';
    this.actionSuccess = '';
    this.subscriptionService
      .cancel()
      .pipe(finalize(() => (this.actionLoading = '')))
      .subscribe({
        next: (res) => {
          this.actionSuccess = res.message;
          this.load();
        },
        error: () => (this.actionError = 'Error al cancelar la renovaci\u00f3n.'),
      });
  }
}
