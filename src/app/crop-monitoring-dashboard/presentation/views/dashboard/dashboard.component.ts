import { Component, OnInit, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CropMonitoringDashboardStore } from '../../../application/crop-monitoring-dashboard.store';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly store = inject(CropMonitoringDashboardStore);
  private readonly router = inject(Router);
  private readonly t = inject(TranslationService);

  // ── i18n getters (runtime translation) ──

  get headingText(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.heading.agronomist')
      : this.t.translate('dashboard.heading.grower');
  }

  get subtitleText(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.subtitle.agronomist')
      : this.t.translate('dashboard.subtitle.grower');
  }

  get newReportLabel(): string { return this.t.translate('dashboard.newReport'); }
  get allPlantationsLabel(): string { return this.t.translate('dashboard.allPlantations'); }
  get loadingText(): string { return this.t.translate('dashboard.loading'); }

  get alertSectionLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.alerts.agronomist')
      : this.t.translate('dashboard.alerts.grower');
  }

  get criticalLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.alerts.criticalAgronomist')
      : this.t.translate('dashboard.alerts.criticalGrower');
  }

  get warningLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.alerts.warningAgronomist')
      : this.t.translate('dashboard.alerts.warningGrower');
  }

  get deviceSectionLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.devices.agronomist')
      : this.t.translate('dashboard.devices.grower');
  }

  get connectedLabel(): string { return this.t.translate('dashboard.devices.connected'); }
  get offlineLabel(): string { return this.t.translate('dashboard.devices.offline'); }
  get disconnectedLabel(): string { return this.t.translate('dashboard.devices.disconnected'); }

  get trendsHeading(): string { return this.t.translate('dashboard.trends.heading'); }
  get trendsSubtitle(): string { return this.t.translate('dashboard.trends.subtitle'); }
  get growerTrendsHeading(): string { return this.t.translate('dashboard.growerTrends.heading'); }
  get growerTrendsSubtitle(): string { return this.t.translate('dashboard.growerTrends.subtitle'); }

  get healthSectionLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.health.agronomist')
      : this.t.translate('dashboard.health.grower');
  }

  get selectPlantationHint(): string { return this.t.translate('dashboard.zones.selectPlantation'); }

  get readingsHeading(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.readings.agronomist')
      : this.t.translate('dashboard.readings.grower');
  }

  get recentAlertsHeading(): string { return this.t.translate('dashboard.recentAlerts'); }
  get viewAllLabel(): string { return this.t.translate('dashboard.viewAll'); }
  get recommendationsHeading(): string { return this.t.translate('dashboard.recommendations'); }
  get inspectionsHeading(): string { return this.t.translate('dashboard.inspections'); }

  get plantationsLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('dashboard.plantations.agronomist')
      : this.t.translate('dashboard.plantations.grower');
  }

  // ── Table header getters ──
  get tableHeaderVariable(): string { return this.t.translate('dashboard.table.variable'); }
  get tableHeaderValue(): string { return this.t.translate('dashboard.table.value'); }
  get tableHeaderDevice(): string { return this.t.translate('dashboard.table.device'); }
  get tableHeaderTime(): string { return this.t.translate('dashboard.table.time'); }
  get topRecommendationEyebrow(): string { return this.t.translate('dashboard.topRecommendation.eyebrow'); }
  get viewDetailLabel(): string { return this.t.translate('dashboard.viewDetail'); }
  get trendUpLabel(): string { return this.t.translate('dashboard.trend.up'); }
  get trendDownLabel(): string { return this.t.translate('dashboard.trend.down'); }
  get trendStableLabel(): string { return this.t.translate('dashboard.trend.stable'); }
  get urgentLabel(): string { return this.t.translate('dashboard.alerts.urgent'); }
  get attentionLabel(): string { return this.t.translate('dashboard.alerts.attention'); }
  get hectaresShortLabel(): string { return this.t.translate('dashboard.units.hectaresShort'); }

  phaseLabel(phase: string): string {
    return phase === 'produccion'
      ? this.t.translate('dashboard.phase.production')
      : this.t.translate('dashboard.phase.establishment');
  }

  ngOnInit(): void {
    this.store.loadAll();
  }

  selectPlantation(id: number): void {
    this.store.selectPlantation(id);
  }

  navigateToReports(): void {
    this.router.navigate(['/reportes']);
  }
}
