import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/infrastructure/auth.service';
import { TranslationService } from '../../i18n/translation.service';
import { getApiErrorMessage } from '../../shared/infrastructure/api-error-message';
import { Recommendation, CreateRecommendationRequest } from '../domain/model/recommendation.entity';
import { Report } from '../domain/model/report.entity';
import { RecommendationService } from '../infrastructure/recommendation-api.service';
import { ReportService } from '../infrastructure/report-api.service';
import { AlertService } from '../../alert-and-notification/infrastructure/alert-and-notification-api';
import { PlantationService } from '../../field-technical-management/infrastructure/field-technical-management-api';
import { Alert } from '../../alert-and-notification/domain/model/alert.entity';
import { Plantation } from '../../field-technical-management/domain/model/plantation.entity';
import { Zone } from '../../field-technical-management/domain/model/zone.entity';
import { rememberRecommendationId } from '../infrastructure/recommendation-id-registry';

/**
 * Central state store for the Agronomic Recommendation bounded context.
 *
 * Exposes readonly signals and orchestration methods so presentation views
 * consume pre‑computed state without duplicating fetch/update logic.
 */
@Injectable({ providedIn: 'root' })
export class AgronomicRecommendationStore {
  private readonly recommendationService = inject(RecommendationService);
  private readonly reportService = inject(ReportService);
  private readonly alertService = inject(AlertService);
  private readonly plantationService = inject(PlantationService);
  private readonly authService = inject(AuthService);
  private readonly t = inject(TranslationService);

  // ── Recommendation list state ─────────────────────────────────────
  readonly recommendations = signal<Recommendation[]>([]);
  readonly recommendationsLoading = signal(false);
  readonly recommendationsError = signal('');

  // ── Recommendation detail state ───────────────────────────────────
  readonly recommendationDetail = signal<Recommendation | null>(null);
  readonly linkedAlert = signal<Alert | null>(null);
  readonly recommendationDetailLoading = signal(false);
  readonly recommendationDetailError = signal('');
  readonly recommendationActionLoading = signal('');
  readonly recommendationActionError = signal('');
  readonly recommendationActionSuccess = signal('');

  // ── Recommendation form state ─────────────────────────────────────
  readonly recommendationFormPlants = signal<Plantation[]>([]);
  readonly recommendationFormZones = signal<Zone[]>([]);
  readonly recommendationFormAlerts = signal<Alert[]>([]);
  readonly recommendationFormLoading = signal(false);
  readonly recommendationFormSaving = signal(false);
  readonly recommendationFormError = signal('');
  readonly recommendationFormZonesLoading = signal(false);
  readonly recommendationFormAlertsLoading = signal(false);

  // ── Report list state ──────────────────────────────────────────────
  readonly reports = signal<Report[]>([]);
  readonly reportsLoading = signal(false);
  readonly reportsError = signal('');
  readonly reportGeneratingPlantationId = signal(0);
  readonly reportPlantations = signal<Plantation[]>([]);

  // ── Report detail state ────────────────────────────────────────────
  readonly reportDetail = signal<Report | null>(null);
  readonly reportDetailLoading = signal(false);
  readonly reportDetailError = signal('');
  readonly reportActionLoading = signal('');
  readonly reportActionError = signal('');

  // ── Computed ──────────────────────────────────────────────────────
  readonly isAgronomist = computed(() => this.authService.user()?.role === 'agronomist');

  // ═══════════════════════════════════════════════════════════════════
  //  Recommendation list
  // ═══════════════════════════════════════════════════════════════════

  loadRecommendations(params?: {
    status?: string;
    plantationId?: number;
    size?: number;
  }): void {
    this.recommendationsLoading.set(true);
    this.recommendationsError.set('');
    const plantationId = params?.plantationId ?? environment.demo.plantationId;
    this.recommendationService
      .list({ ...params, plantationId })
      .pipe(finalize(() => this.recommendationsLoading.set(false)))
      .subscribe({
        next: (res) => this.recommendations.set(res.recommendations),
        error: () => this.recommendationsError.set(this.t.translate('rec.error.load')),
      });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Recommendation detail
  // ═══════════════════════════════════════════════════════════════════

  loadRecommendationDetail(id: number, plantationId: number = environment.demo.plantationId): void {
    this.recommendationDetailLoading.set(true);
    this.recommendationDetailError.set('');
    this.recommendationDetail.set(null);
    this.linkedAlert.set(null);

    if (!id) {
      this.recommendationDetailLoading.set(false);
      this.recommendationDetailError.set(this.t.translate('rec.error.noId'));
      return;
    }

    this.recommendationService
      .getById(id, plantationId)
      .pipe(finalize(() => this.recommendationDetailLoading.set(false)))
      .subscribe({
        next: (rec) => {
          this.recommendationDetail.set(rec);
          if (rec.content && rec.createdAt) {
            rememberRecommendationId(rec.content, rec.createdAt, id);
          }
          if (rec.alertId && environment.features.alerts) {
            this.loadLinkedAlert(rec.alertId);
          }
        },
        error: () => this.recommendationDetailError.set(this.t.translate('rec.error.loadDetail')),
      });
  }

  private loadLinkedAlert(alertId: number): void {
    this.alertService.getById(alertId).subscribe({
      next: (alert) => this.linkedAlert.set(alert),
    });
  }

  approveRecommendation(
    id: number,
    plantationId: number = environment.demo.plantationId,
  ): Observable<Recommendation> {
    this.recommendationActionLoading.set('approve');
    this.recommendationActionError.set('');
    this.recommendationActionSuccess.set('');
    return this.recommendationService.approve(id, plantationId).pipe(
      tap({
        next: (rec) => {
          this.recommendationDetail.set(rec);
          this.recommendationActionSuccess.set(this.t.translate('rec.action.approved'));
        },
        error: (err: unknown) =>
          this.recommendationActionError.set(
            getApiErrorMessage(err, this.t.translate('rec.error.approve')),
          ),
      }),
      finalize(() => this.recommendationActionLoading.set('')),
    );
  }

  publishRecommendation(
    id: number,
    plantationId: number = environment.demo.plantationId,
  ): Observable<Recommendation> {
    this.recommendationActionLoading.set('publish');
    this.recommendationActionError.set('');
    this.recommendationActionSuccess.set('');
    return this.recommendationService.publish(id, plantationId).pipe(
      tap({
        next: (rec) => {
          this.recommendationDetail.set(rec);
          this.recommendationActionSuccess.set(this.t.translate('rec.action.published'));
        },
        error: (err: unknown) =>
          this.recommendationActionError.set(
            getApiErrorMessage(err, this.t.translate('rec.error.publish')),
          ),
      }),
      finalize(() => this.recommendationActionLoading.set('')),
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Recommendation form helpers
  // ═══════════════════════════════════════════════════════════════════

  loadPlantationsForForm(): void {
    this.recommendationFormLoading.set(true);
    this.recommendationFormError.set('');

    if (!environment.features.plantationsApi) {
      this.recommendationFormPlants.set([this.demoPlantation()]);
      this.recommendationFormLoading.set(false);
      return;
    }

    this.plantationService
      .list()
      .pipe(finalize(() => this.recommendationFormLoading.set(false)))
      .subscribe({
        next: (plants) => this.recommendationFormPlants.set(plants),
        error: (err: unknown) =>
          this.recommendationFormError.set(
            getApiErrorMessage(err, this.t.translate('ftm.error.loadPlantations')),
          ),
      });
  }

  loadZonesAndAlertsForForm(plantationId: number): void {
    this.recommendationFormZonesLoading.set(true);
    this.recommendationFormAlertsLoading.set(true);
    this.recommendationFormZones.set([]);
    this.recommendationFormAlerts.set([]);

    if (!environment.features.plantationsApi) {
      this.recommendationFormZones.set([this.demoZone(plantationId)]);
      this.recommendationFormZonesLoading.set(false);
      this.recommendationFormAlertsLoading.set(false);
      return;
    }

    this.plantationService
      .listZones(plantationId)
      .pipe(finalize(() => this.recommendationFormZonesLoading.set(false)))
      .subscribe({
        next: (zones) => this.recommendationFormZones.set(zones),
        error: (err: unknown) =>
          this.recommendationFormError.set(
            getApiErrorMessage(err, this.t.translate('ftm.error.loadZones')),
          ),
      });

    if (!environment.features.alerts) {
      this.recommendationFormAlertsLoading.set(false);
      return;
    }

    this.alertService
      .list({ status: 'active', plantationId, size: 50 })
      .pipe(finalize(() => this.recommendationFormAlertsLoading.set(false)))
      .subscribe({
        next: (res) => this.recommendationFormAlerts.set(res.alerts),
      });
  }

  createRecommendation(request: CreateRecommendationRequest): Observable<Recommendation> {
    this.recommendationFormSaving.set(true);
    this.recommendationFormError.set('');
    const payload: CreateRecommendationRequest = {
      ...request,
      plantationId: request.plantationId || environment.demo.plantationId,
    };
    return this.recommendationService.create(payload).pipe(
      tap({
        error: (err: unknown) =>
          this.recommendationFormError.set(
            getApiErrorMessage(err, this.t.translate('rec.error.create')),
          ),
      }),
      finalize(() => this.recommendationFormSaving.set(false)),
    );
  }

  private demoPlantation(): Plantation {
    const now = new Date().toISOString();
    return {
      id: environment.demo.plantationId,
      userId: environment.demo.agronomistId,
      name: `Demo plantation #${environment.demo.plantationId}`,
      location: 'Demo / live backend',
      totalHectares: 10,
      soilType: '—',
      cropAge: '—',
      phenologicalPhase: 'produccion',
      latitude: 0,
      longitude: 0,
      zonesCount: 1,
      devicesCount: 1,
      overallHealth: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private demoZone(plantationId: number): Zone {
    return {
      id: 1,
      plantationId,
      name: 'Sector demo',
      hectares: 10,
      description: 'Zona sintética mientras CropMonitoring no está desplegado',
      cropHealthStatus: 'optimal',
      lastReadingAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Report list
  // ═══════════════════════════════════════════════════════════════════

  loadReports(params?: { status?: string; plantationId?: number; size?: number }): void {
    if (!environment.features.reports) {
      this.reports.set([]);
      this.reportsLoading.set(false);
      this.reportsError.set(
        this.t.translate('report.error.unavailable'),
      );
      return;
    }
    this.reportsLoading.set(true);
    this.reportsError.set('');
    this.reportService
      .list(params)
      .pipe(finalize(() => this.reportsLoading.set(false)))
      .subscribe({
        next: (res) => this.reports.set(res.reports),
        error: () => this.reportsError.set(this.t.translate('report.error.load')),
      });
  }

  loadPlantationsForReports(): void {
    if (!environment.features.reports || !environment.features.plantationsApi) {
      this.reportPlantations.set(
        environment.features.reports ? [this.demoPlantation()] : [],
      );
      return;
    }
    this.plantationService.list().subscribe({
      next: (plants) => this.reportPlantations.set(plants),
    });
  }

  generateDraftReport(plantationId: number): Observable<Report> {
    if (!environment.features.reports) {
      this.reportsError.set(
        this.t.translate('report.error.unavailable'),
      );
      return new Observable<Report>((sub) => {
        sub.error(new Error('Reports feature disabled'));
      });
    }
    this.reportGeneratingPlantationId.set(plantationId);
    this.reportsError.set('');
    return this.reportService.generateDraft(plantationId).pipe(
      tap({
        error: (err: unknown) =>
          this.reportsError.set(getApiErrorMessage(err, 'No se pudo generar el borrador.')),
      }),
      finalize(() => this.reportGeneratingPlantationId.set(0)),
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Report detail
  // ═══════════════════════════════════════════════════════════════════

  loadReportDetail(id: number): void {
    if (!environment.features.reports) {
      this.reportDetail.set(null);
      this.reportDetailLoading.set(false);
      this.reportDetailError.set(
        this.t.translate('report.error.unavailable'),
      );
      return;
    }
    this.reportDetailLoading.set(true);
    this.reportDetailError.set('');
    this.reportDetail.set(null);

    this.reportService
      .getById(id)
      .pipe(finalize(() => this.reportDetailLoading.set(false)))
      .subscribe({
        next: (report) => this.reportDetail.set(report),
        error: () => this.reportDetailError.set('No se pudo cargar el reporte.'),
      });
  }

  publishReport(id: number): Observable<Report> {
    if (!environment.features.reports) {
      this.reportActionError.set(
        this.t.translate('report.error.unavailable'),
      );
      return new Observable<Report>((sub) => {
        sub.error(new Error('Reports feature disabled'));
      });
    }
    this.reportActionLoading.set('publish');
    this.reportActionError.set('');
    return this.reportService.publish(id).pipe(
      tap({
        error: (err: unknown) =>
          this.reportActionError.set(getApiErrorMessage(err, 'No se pudo publicar.')),
      }),
      finalize(() => this.reportActionLoading.set('')),
    );
  }
}
