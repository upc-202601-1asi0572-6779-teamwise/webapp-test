import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../i18n/translation.service';
import { SubscriptionAndUserManagementStore } from '../../../application/subscription-and-user-management.store';

@Component({
  selector: 'app-my-subscription',
  imports: [DatePipe, RouterLink],
  templateUrl: './my-subscription.component.html',
})
export class MySubscriptionComponent implements OnInit {
  private readonly store = inject(SubscriptionAndUserManagementStore);
  private readonly t = inject(TranslationService);

  readonly subscription = this.store.subscription;
  readonly loading = this.store.subscriptionLoading;
  readonly error = this.store.subscriptionError;
  readonly actionLoading = this.store.actionLoading;
  readonly actionError = this.store.actionError;
  readonly actionSuccess = this.store.actionSuccess;
  readonly isGrower = this.store.isGrower;

  backDashboardLabel(): string { return this.t.translate('subscription.mySubscription.backDashboard'); }
  eyebrowLabel(): string { return this.t.translate('subscription.mySubscription.eyebrow'); }
  loadingLabel(): string { return this.t.translate('subscription.mySubscription.loading'); }
  errorTitleLabel(): string { return this.t.translate('subscription.mySubscription.errorTitle'); }
  viewPlansLabel(): string { return this.t.translate('subscription.mySubscription.viewPlans'); }

  summaryEyebrowLabel(): string { return this.t.translate('subscription.mySubscription.summaryEyebrow'); }
  actionsEyebrowLabel(): string { return this.t.translate('subscription.mySubscription.actionsEyebrow'); }
  capacityEyebrowLabel(): string { return this.t.translate('subscription.mySubscription.capacityEyebrow'); }
  capacityHeadingLabel(): string { return this.t.translate('subscription.mySubscription.capacityHeading'); }
  statusEyebrowLabel(): string { return this.t.translate('subscription.mySubscription.statusEyebrow'); }
  cycleEyebrowLabel(): string { return this.t.translate('subscription.mySubscription.cycleEyebrow'); }
  validityLabel(): string { return this.t.translate('subscription.mySubscription.validity'); }
  daysRemainingLabel(): string { return this.t.translate('subscription.mySubscription.daysRemaining'); }
  daysRemainingHintLabel(): string { return this.t.translate('subscription.mySubscription.daysRemainingHint'); }
  renewalLabel(): string { return this.t.translate('subscription.mySubscription.renewal'); }
  renewalAutoLabel(): string { return this.t.translate('subscription.mySubscription.renewalAuto'); }
  renewalManualLabel(): string { return this.t.translate('subscription.mySubscription.renewalManual'); }
  renewalAutoDescLabel(): string { return this.t.translate('subscription.mySubscription.renewalAutoDesc'); }
  renewalManualDescLabel(): string { return this.t.translate('subscription.mySubscription.renewalManualDesc'); }
  autoRenewEnabledLabel(): string { return this.t.translate('subscription.mySubscription.autoRenewEnabled'); }
  autoRenewDisabledLabel(): string { return this.t.translate('subscription.mySubscription.autoRenewDisabled'); }
  autoRenewEnabledDescLabel(): string { return this.t.translate('subscription.mySubscription.autoRenewEnabledDesc'); }
  autoRenewDisabledDescLabel(): string { return this.t.translate('subscription.mySubscription.autoRenewDisabledDesc'); }
  validityUntilLabel(): string { return this.t.translate('subscription.mySubscription.validityFromTo'); }
  cycleStartLabel(): string { return this.t.translate('subscription.mySubscription.cycleStart'); }
  cycleEndLabel(): string { return this.t.translate('subscription.mySubscription.cycleEnd'); }

  statusLabel(status: string): string {
    return this.t.translate(`subscription.mySubscription.status.${status}`);
  }

  statusShortLabel(status: string): string {
    return this.t.translate(`subscription.mySubscription.statusShort.${status}`);
  }

  subtitle(): string {
    return this.isGrower()
      ? this.t.translate('subscription.mySubscription.subtitles.grower')
      : this.t.translate('subscription.mySubscription.subtitles.agronomist');
  }

  statusBadgeLabel(status: string): string {
    return this.statusLabel(status);
  }

  renewalModeLabel(autoRenew: boolean): string {
    return autoRenew ? this.renewalAutoLabel() : this.renewalManualLabel();
  }

  renewalModeDesc(autoRenew: boolean): string {
    return autoRenew ? this.renewalAutoDescLabel() : this.renewalManualDescLabel();
  }

  autoRenewHeadline(autoRenew: boolean): string {
    return autoRenew ? this.autoRenewEnabledLabel() : this.autoRenewDisabledLabel();
  }

  autoRenewDescription(autoRenew: boolean): string {
    return autoRenew ? this.autoRenewEnabledDescLabel() : this.autoRenewDisabledDescLabel();
  }

  actionLabel(action: string, loading: string): string {
    if (action === 'renew') {
      return loading === 'renew'
        ? this.t.translate('subscription.mySubscription.actions.renewing')
        : this.t.translate('subscription.mySubscription.actions.renew');
    }
    if (action === 'cancel') {
      return loading === 'cancel'
        ? this.t.translate('subscription.mySubscription.actions.cancelling')
        : this.t.translate('subscription.mySubscription.actions.cancel');
    }
    if (action === 'change') {
      return loading === 'change'
        ? this.t.translate('subscription.mySubscription.actions.changing')
        : this.t.translate('subscription.mySubscription.actions.change');
    }
    return '';
  }

  actionHelp(action: string): string {
    if (action === 'renew') return this.t.translate('subscription.mySubscription.actions.renewHelp');
    if (action === 'change') return this.t.translate('subscription.mySubscription.actions.changeHelp');
    if (action === 'cancel') return this.t.translate('subscription.mySubscription.actions.cancelHelp');
    return '';
  }

  summaryLabel(key: 'status' | 'hectaresMax' | 'devicesMax' | 'growersMax' | 'reportsMax'): string {
    return this.t.translate(`subscription.mySubscription.summaryLabels.${key}`);
  }

  usageLabel(key: 'hectaresMonitored' | 'devicesConnected' | 'growersManaged' | 'reportsGenerated'): string {
    return this.t.translate(`subscription.mySubscription.usageLabels.${key}`);
  }

  unlimitedHectares(value: number | undefined): boolean {
    return value === 999;
  }

  unlimitedReports(value: number | undefined): boolean {
    return value === 999;
  }

  unlimitedGrowers(value: number | undefined): boolean {
    return value === 999;
  }

  formatHectares(value: number | undefined): string {
    if (value === undefined) return '0';
    if (this.unlimitedHectares(value)) {
      return this.t.translate('subscription.plans.limits.unlimited');
    }
    return `${value} ${this.t.translate('subscription.plans.limits.hectaresShort')}`;
  }

  formatDevices(value: number | undefined): string {
    if (value === undefined) return '0';
    return `${value}`;
  }

  formatReports(value: number | undefined, includePeriod: boolean): string {
    if (value === undefined) return '0';
    if (this.unlimitedReports(value)) {
      return this.t.translate('subscription.plans.limits.unlimitedPlural');
    }
    return includePeriod
      ? `${value} ${this.t.translate('subscription.plans.limits.period')}`
      : `${value}`;
  }

  formatGrowers(value: number | undefined): string {
    if (value === undefined) return '0';
    if (this.unlimitedGrowers(value)) {
      return this.t.translate('subscription.plans.limits.unlimitedPlural');
    }
    return `${value}`;
  }

  usagePercent(used: number | undefined, max: number | undefined): number {
    if (!used || !max || max === 999) return 100;
    return Math.min(100, Math.round((used / max) * 100));
  }

  ngOnInit(): void {
    this.store.loadSubscription();
  }

  renew(): void {
    this.store.renew();
  }

  cancel(): void {
    this.store.cancel();
  }
}
