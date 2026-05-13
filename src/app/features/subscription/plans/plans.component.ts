import { Component, inject, signal, OnInit } from '@angular/core';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionPlan } from '../../../core/models/subscription-plan.model';
import { finalize } from 'rxjs';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-plans',
  imports: [DecimalPipe],
  templateUrl: './plans.component.html',
})
export class PlansComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  plans = signal<SubscriptionPlan[]>([]);
  loading = signal(false);
  error = signal('');

  constructor() {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.subscriptionService
      .getPlans()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.plans.set(p),
        error: () => this.error.set('Error al cargar los planes.'),
      });
  }
}
