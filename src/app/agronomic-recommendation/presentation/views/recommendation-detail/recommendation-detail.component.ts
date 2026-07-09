import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-recommendation-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './recommendation-detail.component.html',
})
export class RecommendationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(AgronomicRecommendationStore);
  private readonly t = inject(TranslationService);

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

  get backLabel(): string { return this.t.translate('rec.detail.back'); }
  get loadingText(): string { return this.t.translate('rec.detail.loading'); }
  get descriptionLabel(): string { return this.t.translate('rec.detail.description'); }
  get recommendedActionLabel(): string { return this.t.translate('rec.detail.recommendedAction'); }
  get summaryLabel(): string { return this.t.translate('rec.detail.summary'); }
  get publicationInfoLabel(): string { return this.t.translate('rec.detail.publicationInfo'); }
  get plantationLabel(): string { return this.t.translate('rec.detail.plantation'); }
  get zoneLabel(): string { return this.t.translate('rec.detail.zone'); }
  get reviewedByLabel(): string { return this.t.translate('rec.detail.reviewedBy'); }
  get publishedOnLabel(): string { return this.t.translate('rec.detail.publishedOn'); }
  get pendingReviewLabel(): string { return this.t.translate('rec.detail.pendingReview'); }
  get notPublishedLabel(): string { return this.t.translate('rec.detail.notPublished'); }
  get approveBtnLabel(): string { return this.t.translate('rec.detail.approveBtn'); }
  get approvingLabel(): string { return this.t.translate('rec.detail.approving'); }
  get publishBtnLabel(): string { return this.t.translate('rec.detail.publishBtn'); }
  get publishingLabel(): string { return this.t.translate('rec.detail.publishing'); }
  get createdLabel(): string { return this.t.translate('rec.detail.created'); }
  get agronomistFallback(): string { return this.t.translate('rec.detail.agronomistFallback'); }

  priorityLabel(key: string): string {
    const map: Record<string, string> = {
      critical: this.t.translate('rec.detail.priority.critical'),
      high: this.t.translate('rec.detail.priority.high'),
      medium: this.t.translate('rec.detail.priority.medium'),
      low: this.t.translate('rec.detail.priority.low'),
    };
    return map[key] ?? key;
  }

  statusLabel(key: string): string {
    const map: Record<string, string> = {
      draft: this.t.translate('rec.detail.status.draft'),
      pending_review: this.t.translate('rec.detail.status.pendingReview'),
      approved: this.t.translate('rec.detail.status.approved'),
      published: this.t.translate('rec.detail.status.published'),
    };
    return map[key] ?? key;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.store.loadRecommendationDetail(id);
    } else {
      this.store.recommendationDetailError.set(this.t.translate('rec.detail.error.invalid'));
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
}
