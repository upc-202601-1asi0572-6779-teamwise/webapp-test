import { Component, inject, signal } from '@angular/core';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionPlan } from '../../../core/models/subscription-plan.model';
import { finalize } from 'rxjs';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-plans',
  imports: [DecimalPipe],
  templateUrl: './plans.component.html',
})
export class PlansComponent {
  private readonly subscriptionService = inject(SubscriptionService);

  plans = signal<SubscriptionPlan[]>([]);
  loading = false;
  error = '';

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.subscriptionService
      .getPlans()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (p) => this.plans.set(p),
        error: () => (this.error = 'Error al cargar los planes.'),
      });
  }
}
