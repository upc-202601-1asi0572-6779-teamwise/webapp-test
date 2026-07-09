import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/domain/user.model';
import { AuthService } from '../../shared/infrastructure/auth.service';
import { TranslationService } from '../../i18n/translation.service';
import { Subscription } from '../domain/model/subscription.entity';
import { SubscriptionPlan } from '../domain/model/subscription-plan.entity';
import { UserService } from '../infrastructure/user-api.service';
import { SubscriptionService } from '../infrastructure/subscription-api.service';

/**
 * Central state store for the Subscription & User Management bounded context.
 *
 * Exposes readonly signals and orchestration methods so presentation views
 * consume pre-computed state without duplicating fetch/update logic.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionAndUserManagementStore {
  private readonly userService = inject(UserService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authService = inject(AuthService);
  private readonly t = inject(TranslationService);

  // ── Profile state ────────────────────────────────────────────────
  readonly user = signal<User | null>(null);
  readonly profileLoading = signal(false);
  readonly profileSaving = signal(false);
  readonly profileError = signal('');

  // ── Subscription state ───────────────────────────────────────────
  readonly subscription = signal<Subscription | null>(null);
  readonly subscriptionLoading = signal(false);
  readonly subscriptionError = signal('');
  readonly actionLoading = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');

  // ── Plans state ───────────────────────────────────────────────────
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly plansLoading = signal(false);
  readonly plansError = signal('');
  readonly subscribing = signal('');
  readonly upgrading = signal('');
  readonly currentSubscription = signal<Subscription | null>(null);

  // ── Computed ──────────────────────────────────────────────────────
  readonly currentPlanId = computed(() => this.subscription()?.planId ?? this.currentSubscription()?.planId ?? '');
  readonly isGrower = computed(() => {
    const sub = this.subscription() ?? this.currentSubscription();
    return sub?.segment !== 'agronomist';
  });
  readonly isAgronomist = computed(() => this.authService.user()?.role === 'agronomist');

  // ── Profile methods ───────────────────────────────────────────────
  loadProfile(): void {
    this.profileLoading.set(true);
    this.profileError.set('');
    this.userService
      .getProfile()
      .pipe(finalize(() => this.profileLoading.set(false)))
      .subscribe({
        next: (u) => this.user.set(u),
        error: () => this.profileError.set(this.t.translate('subscription.profile.error.load')),
      });
  }

  updateProfile(data: Partial<Pick<User, 'fullName' | 'phone' | 'region' | 'city' | 'avatarUrl'>>): Observable<User> {
    this.profileSaving.set(true);
    this.profileError.set('');
    return this.userService
      .updateProfile(data)
      .pipe(
        tap({
          next: (u) => this.user.set(u),
          error: () => this.profileError.set(this.t.translate('subscription.profile.error.save')),
        }),
        finalize(() => this.profileSaving.set(false)),
      );
  }

  // ── Subscription methods ──────────────────────────────────────────
  loadSubscription(): void {
    this.subscriptionLoading.set(true);
    this.subscriptionError.set('');
    if (!environment.features.subscriptionApi) {
      this.subscription.set(null);
      this.subscriptionLoading.set(false);
      // Store i18n key (resolved at render) so locale changes / late JSON load still work.
      this.subscriptionError.set('subscription.mySubscription.error.unavailable');
      return;
    }
    this.subscriptionService
      .getMySubscription()
      .pipe(finalize(() => this.subscriptionLoading.set(false)))
      .subscribe({
        next: (sub) => this.subscription.set(sub),
        error: () => this.subscriptionError.set('subscription.mySubscription.error.load'),
      });
  }

  renew(): void {
    this.actionLoading.set('renew');
    this.actionError.set('');
    this.actionSuccess.set('');
    this.subscriptionService
      .renew()
      .pipe(finalize(() => this.actionLoading.set('')))
      .subscribe({
        next: (res) => {
          this.actionSuccess.set(res.message);
          this.loadSubscription();
        },
        error: () => this.actionError.set(this.t.translate('subscription.mySubscription.error.renew')),
      });
  }

  cancel(): void {
    this.actionLoading.set('cancel');
    this.actionError.set('');
    this.actionSuccess.set('');
    this.subscriptionService
      .cancel()
      .pipe(finalize(() => this.actionLoading.set('')))
      .subscribe({
        next: (res) => {
          this.actionSuccess.set(res.message);
          this.loadSubscription();
        },
        error: () => this.actionError.set(this.t.translate('subscription.mySubscription.error.cancel')),
      });
  }

  // ── Plans methods ─────────────────────────────────────────────────
  loadPlans(): void {
    this.plansLoading.set(true);
    this.plansError.set('');
    this.subscriptionService
      .getPlans()
      .pipe(finalize(() => this.plansLoading.set(false)))
      .subscribe({
        next: (p) => this.plans.set(p),
        error: () => this.plansError.set(this.t.translate('subscription.plans.error.load')),
      });
  }

  loadCurrentSubscription(): void {
    this.subscriptionService.getMySubscription().subscribe({
      next: (sub) => this.currentSubscription.set(sub),
    });
  }

  subscribe(planId: string, paymentMethod: string): Observable<Subscription> {
    this.subscribing.set(planId);
    this.plansError.set('');
    return this.subscriptionService
      .subscribe(planId, paymentMethod)
      .pipe(
        tap({ error: () => this.plansError.set(this.t.translate('subscription.plans.error.subscribe')) }),
        finalize(() => this.subscribing.set('')),
      );
  }

  upgrade(planId: string): Observable<Subscription> {
    this.upgrading.set(planId);
    this.plansError.set('');
    return this.subscriptionService
      .upgrade(planId)
      .pipe(
        tap({ error: () => this.plansError.set(this.t.translate('subscription.plans.error.change')) }),
        finalize(() => this.upgrading.set('')),
      );
  }
}
