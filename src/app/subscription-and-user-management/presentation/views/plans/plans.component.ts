import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslationService } from '../../../../i18n/translation.service';
import { SubscriptionAndUserManagementStore } from '../../../application/subscription-and-user-management.store';

@Component({
  selector: 'app-plans',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './plans.component.html',
})
export class PlansComponent implements OnInit {
  private readonly store = inject(SubscriptionAndUserManagementStore);
  private readonly router = inject(Router);
  private readonly t = inject(TranslationService);

  readonly plans = this.store.plans;
  readonly currentSubscription = this.store.currentSubscription;
  readonly loading = this.store.plansLoading;
  readonly error = this.store.plansError;
  readonly subscribing = this.store.subscribing;
  readonly upgrading = this.store.upgrading;
  readonly isAgronomist = this.store.isAgronomist;
  readonly currentPlanId = this.store.currentPlanId;

  backDashboardLabel(): string { return this.t.translate('subscription.plans.backDashboard'); }
  headingLabel(): string { return this.t.translate('subscription.plans.heading'); }
  eyebrowLabel(): string { return this.t.translate('subscription.plans.eyebrow'); }
  loadingLabel(): string { return this.t.translate('subscription.plans.loading'); }

  subtitle(): string {
    return this.isAgronomist()
      ? this.t.translate('subscription.plans.subtitleAgronomist')
      : this.t.translate('subscription.plans.subtitleGrower');
  }

  billingLabel(cycle: string | undefined): string {
    return cycle === 'yearly'
      ? this.t.translate('subscription.plans.billing.yearly')
      : this.t.translate('subscription.plans.billing.monthly');
  }

  perMonthLabel(): string { return this.t.translate('subscription.plans.perMonth'); }

  unlimitedLabel(value: number | undefined, plural: boolean): string {
    if (value !== 999) return value?.toString() ?? '0';
    return plural
      ? this.t.translate('subscription.plans.limits.unlimitedPlural')
      : this.t.translate('subscription.plans.limits.unlimited');
  }

  growersLimit(value: number | undefined): string {
    return `${this.unlimitedLabel(value, true)} ${this.t.translate('subscription.plans.limits.growers')}`;
  }

  reportsLimit(value: number | undefined): string {
    return `${this.unlimitedLabel(value, true)} ${this.t.translate('subscription.plans.limits.reportsPerMonth')}`;
  }

  hectaresLimit(value: number | undefined): string {
    if (!value && value !== 0) return '0';
    return `${value} ${this.t.translate('subscription.plans.limits.hectaresShort')}`;
  }

  devicesLimit(value: number | undefined): string {
    return `${value ?? 0} ${this.t.translate('subscription.plans.limits.devices')}`;
  }

  mostPopularLabel(): string { return this.t.translate('subscription.plans.badge.mostPopular'); }
  currentPlanBadgeLabel(): string { return this.t.translate('subscription.plans.badge.current'); }
  currentActionLabel(): string { return this.t.translate('subscription.plans.actions.current'); }
  subscribeActionLabel(): string { return this.t.translate('subscription.plans.actions.subscribe'); }
  processingActionLabel(): string { return this.t.translate('subscription.plans.actions.processing'); }
  changeActionLabel(): string { return this.t.translate('subscription.plans.actions.change'); }
  changingActionLabel(): string { return this.t.translate('subscription.plans.actions.changing'); }
  selectPaymentPrompt(): string { return this.t.translate('subscription.plans.actions.selectPayment'); }
  defaultPaymentMethod(): string { return this.t.translate('subscription.plans.actions.defaultPayment'); }
  ngOnInit(): void {
    this.store.loadPlans();
    this.store.loadCurrentSubscription();
  }

  subscribe(planId: string): void {
    const method = typeof window !== 'undefined'
      ? window.prompt(this.selectPaymentPrompt(), this.defaultPaymentMethod())
      : this.defaultPaymentMethod();
    if (!method) {
      this.store.plansError.set(this.t.translate('subscription.plans.error.missingPayment'));
      return;
    }

    this.store.subscribe(planId, method).subscribe({
      next: () => this.router.navigate(['/subscription/me']),
    });
  }

  upgrade(planId: string): void {
    if (planId === this.currentPlanId()) return;

    this.store.upgrade(planId).subscribe({
      next: () => this.router.navigate(['/subscription/me']),
    });
  }
}
