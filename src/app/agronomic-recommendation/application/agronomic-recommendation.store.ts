import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { AuthService } from '../../shared/infrastructure/auth.service';
import { getApiErrorMessage } from '../../shared/infrastructure/api-error-message';
import { Recommendation, CreateRecommendationRequest, RecommendationListResponse } from '../domain/model/recommendation.entity';
import { Report } from '../domain/model/report.entity';
import { RecommendationService } from '../infrastructure/recommendation-api.service';
import { ReportService } from '../infrastructure/report-api.service';
import { AlertService } from '../../alert-and-notification/infrastructure/alert-and-notification-api';
import { PlantationService } from '../../field-technical-management/infrastructure/field-technical-management-api';
import { Alert } from '../../alert-and-notification/domain/model/alert.entity';
import { Plantation } from '../../field-technical-management/domain/model/plantation.entity';
import { Zone } from '../../field-technical-management/domain/model/zone.entity';

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
  readonly isAgronomist = computed(() => this.authService.currentUser?.role === 'agronomist');

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
    this.recommendationService
      .list(params)
      .pipe(finalize(() => this.recommendationsLoading.set(false)))
      .subscribe({
        next: (res) => this.recommendations.set(res.recommendations),
        error: () => this.recommendationsError.set($localize`:@@rec.error.load:No se pudieron cargar las recomendaciones.`),
      });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Recommendation detail
  // ═══════════════════════════════════════════════════════════════════

  loadRecommendationDetail(id: number): void {
    this.recommendationDetailLoading.set(true);
    this.recommendationDetailError.set('');
    this.recommendationDetail.set(null);
    this.linkedAlert.set(null);

    this.recommendationService
      .getById(id)
      .pipe(finalize(() => this.recommendationDetailLoading.set(false)))
      .subscribe({
        next: (rec) => {
          this.recommendationDetail.set(rec);
          if (rec.alertId) {
            this.loadLinkedAlert(rec.alertId);
          }
        },
        error: () => this.recommendationDetailError.set($localize`:@@rec.error.loadDetail:No se pudo cargar la recomendacion.`),
      });
  }

  private loadLinkedAlert(alertId: number): void {
    this.alertService.getById(alertId).subscribe({
      next: (alert) => this.linkedAlert.set(alert),
    });
  }

  approveRecommendation(id: number): Observable<Recommendation> {
    this.recommendationActionLoading.set('approve');
    this.recommendationActionError.set('');
    this.recommendationActionSuccess.set('');
    return this.recommendationService.approve(id).pipe(
      tap({
        next: () => this.recommendationActionSuccess.set('Recomendacion aprobada correctamente.'),
        error: (err: unknown) =>
          this.recommendationActionError.set(getApiErrorMessage(err, 'No se pudo aprobar.')),
      }),
      finalize(() => this.recommendationActionLoading.set('')),
    );
  }

  publishRecommendation(id: number): Observable<Recommendation> {
    this.recommendationActionLoading.set('publish');
    this.recommendationActionError.set('');
    this.recommendationActionSuccess.set('');
    return this.recommendationService.publish(id).pipe(
      tap({
        next: () => this.recommendationActionSuccess.set('Recomendacion publicada correctamente.'),
        error: (err: unknown) =>
          this.recommendationActionError.set(getApiErrorMessage(err, 'No se pudo publicar.')),
      }),
      finalize(() => this.recommendationActionLoading.set('')),
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Recommendation form helpers
  // ═══════════════════════════════════════════════════════════════════

  loadPlantationsForForm(): void {
    this.recommendationFormLoading.set(true);
    this.plantationService
      .list()
      .pipe(finalize(() => this.recommendationFormLoading.set(false)))
      .subscribe({
        next: (plants) => this.recommendationFormPlants.set(plants),
        error: (err: unknown) =>
          this.recommendationFormError.set(getApiErrorMessage(err, 'No se pudieron cargar las plantaciones.')),
      });
  }

  loadZonesAndAlertsForForm(plantationId: number): void {
    this.recommendationFormZonesLoading.set(true);
    this.recommendationFormAlertsLoading.set(true);

    this.plantationService
      .listZones(plantationId)
      .pipe(finalize(() => this.recommendationFormZonesLoading.set(false)))
      .subscribe({
        next: (zones) => this.recommendationFormZones.set(zones),
        error: (err: unknown) =>
          this.recommendationFormError.set(getApiErrorMessage(err, 'No se pudieron cargar las zonas.')),
      });

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
    return this.recommendationService.create(request).pipe(
      tap({
        error: (err: unknown) =>
          this.recommendationFormError.set(getApiErrorMessage(err, 'No se pudo crear la recomendacion.')),
      }),
      finalize(() => this.recommendationFormSaving.set(false)),
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Report list
  // ═══════════════════════════════════════════════════════════════════

  loadReports(params?: { status?: string; plantationId?: number; size?: number }): void {
    this.reportsLoading.set(true);
    this.reportsError.set('');
    this.reportService
      .list(params)
      .pipe(finalize(() => this.reportsLoading.set(false)))
      .subscribe({
        next: (res) => this.reports.set(res.reports),
        error: () => this.reportsError.set($localize`:@@report.error.load:No se pudieron cargar los reportes.`),
      });
  }

  loadPlantationsForReports(): void {
    this.plantationService.list().subscribe({
      next: (plants) => this.reportPlantations.set(plants),
    });
  }

  generateDraftReport(plantationId: number): Observable<Report> {
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
