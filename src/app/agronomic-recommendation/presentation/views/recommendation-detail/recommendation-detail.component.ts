import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';
import { Alert } from '../../../../alert-and-notification/domain/model/alert.entity';

@Component({
  selector: 'app-recommendation-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './recommendation-detail.component.html',
})
export class RecommendationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(AgronomicRecommendationStore);

  readonly priorityColors: Record<string, string> = {
    critical: 'var(--color-danger)',
    high: 'var(--color-warning)',
    medium: 'var(--color-accent-cyan)',
    low: 'var(--color-success)',
  };

  readonly statusColors: Record<string, string> = {
    draft: 'var(--color-text-muted)',
    pending_review: 'var(--color-warning)',
    approved: 'var(--color-accent-cyan)',
    published: 'var(--color-success)',
  };

  // ── i18n getters and methods ──

  get backLabel(): string {
    return $localize`:@@rec.detail.back:Volver a recomendaciones`;
  }

  get loadingText(): string {
    return $localize`:@@rec.detail.loading:Cargando detalle...`;
  }

  get descriptionLabel(): string {
    return $localize`:@@rec.detail.description:Descripcion`;
  }

  get recommendedActionLabel(): string {
    return $localize`:@@rec.detail.recommendedAction:Accion recomendada`;
  }

  get relatedAlertLabel(): string {
    return $localize`:@@rec.detail.relatedAlert:Alerta relacionada`;
  }

  get sensorDataLabel(): string {
    return $localize`:@@rec.detail.sensorData:Datos del sensor`;
  }

  get expectedRangeLabel(): string {
    return $localize`:@@rec.detail.expectedRange:Rango esperado`;
  }

  get summaryLabel(): string {
    return $localize`:@@rec.detail.summary:Resumen`;
  }

  get publicationInfoLabel(): string {
    return $localize`:@@rec.detail.publicationInfo:Informacion de publicacion`;
  }

  get plantationLabel(): string {
    return $localize`:@@rec.detail.plantation:Plantacion`;
  }

  get zoneLabel(): string {
    return $localize`:@@rec.detail.zone:Zona`;
  }

  get reviewedByLabel(): string {
    return $localize`:@@rec.detail.reviewedBy:Revisada por`;
  }

  get publishedOnLabel(): string {
    return $localize`:@@rec.detail.publishedOn:Publicada el`;
  }

  get pendingReviewLabel(): string {
    return $localize`:@@rec.detail.pendingReview:Pendiente de revision`;
  }

  get notPublishedLabel(): string {
    return $localize`:@@rec.detail.notPublished:No publicada`;
  }

  get approveBtnLabel(): string {
    return $localize`:@@rec.detail.approveBtn:Aprobar recomendacion`;
  }

  get approvingLabel(): string {
    return $localize`:@@rec.detail.approving:Aprobando...`;
  }

  get publishBtnLabel(): string {
    return $localize`:@@rec.detail.publishBtn:Publicar recomendacion`;
  }

  get publishingLabel(): string {
    return $localize`:@@rec.detail.publishing:Publicando...`;
  }

  generatedByLabel(generatedBy: string): string {
    return generatedBy === 'ai'
      ? $localize`:@@rec.detail.generatedByAI:Generada por IA`
      : $localize`:@@rec.detail.generatedByAgronomist:Redactada por agronomo`;
  }

  priorityLabel(key: string): string {
    const labels: Record<string, string> = {
      critical: $localize`:@@rec.detail.priority.critical:Critica`,
      high: $localize`:@@rec.detail.priority.high:Alta`,
      medium: $localize`:@@rec.detail.priority.medium:Media`,
      low: $localize`:@@rec.detail.priority.low:Baja`,
    };
    return labels[key] ?? key;
  }

  statusLabel(key: string): string {
    const labels: Record<string, string> = {
      draft: $localize`:@@rec.detail.status.draft:Borrador`,
      pending_review: $localize`:@@rec.detail.status.pendingReview:Pendiente de revision`,
      approved: $localize`:@@rec.detail.status.approved:Aprobada`,
      published: $localize`:@@rec.detail.status.published:Publicada`,
    };
    return labels[key] ?? key;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.store.loadRecommendationDetail(id);
    } else {
      this.store.recommendationDetailError.set($localize`:@@rec.detail.error.invalid:Recomendacion no valida.`);
    }
  }

  approve(): void {
    const rec = this.store.recommendationDetail();
    if (!rec) return;
    this.store.approveRecommendation(rec.id).subscribe({
      next: () => this.store.loadRecommendationDetail(rec.id),
    });
  }

  publish(): void {
    const rec = this.store.recommendationDetail();
    if (!rec) return;
    this.store.publishRecommendation(rec.id).subscribe({
      next: () => this.store.loadRecommendationDetail(rec.id),
    });
  }

  computeBarPosition(alert: Alert): { left: string; width: string; rangeStart: string; rangeWidth: string; color: string } | null {
    const margin = (alert.thresholdMax - alert.thresholdMin) * 0.25 || 1;
    const totalMin = alert.thresholdMin - margin;
    const totalMax = alert.thresholdMax + margin;
    const totalRange = totalMax - totalMin;
    if (totalRange <= 0) return null;

    const left = `${(((alert.triggeredValue - totalMin) / totalRange) * 98).toFixed(1)}%`;
    const width = '2%';
    const rangeStart = `${(((alert.thresholdMin - totalMin) / totalRange) * 100).toFixed(1)}%`;
    const rangeWidth = `${(((alert.thresholdMax - alert.thresholdMin) / totalRange) * 100).toFixed(1)}%`;
    const color =
      alert.alertLevel === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)';

    return { left, width, rangeStart, rangeWidth, color };
  }
}
