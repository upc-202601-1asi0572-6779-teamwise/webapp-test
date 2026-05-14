import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AuthService } from '../../../core/services/auth.service';
import { SubscriptionPlan } from '../../../core/models/subscription-plan.model';
import { finalize } from 'rxjs';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-plans',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './plans.component.html',
})
export class PlansComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly subscribing = signal('');

  readonly isAgronomist = computed(() => this.authService.currentUser?.role === 'agronomist');

  ngOnInit(): void {
    this.load();
  }

  subscribe(planId: string): void {
    const method = prompt('Metodo de pago (visa, mastercard, etc.):', 'visa_ending_0000');
    if (!method) return;

    this.subscribing.set(planId);
    this.error.set('');

    this.subscriptionService
      .subscribe(planId, method)
      .pipe(finalize(() => this.subscribing.set('')))
      .subscribe({
        next: () => this.router.navigate(['/subscription/me']),
        error: () => this.error.set('No se pudo completar la suscripcion.'),
      });
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
