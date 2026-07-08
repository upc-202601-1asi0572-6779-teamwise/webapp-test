import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../i18n/translation.service';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';

@Component({
  selector: 'app-recommendation-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './recommendation-list.component.html',
})
export class RecommendationListComponent implements OnInit {
  readonly store = inject(AgronomicRecommendationStore);
  private readonly t = inject(TranslationService);

  readonly activeTab = signal<'pending' | 'published'>('published');

  readonly filteredRecommendations = computed(() => {
    const recs = this.store.recommendations();
    if (this.activeTab() === 'pending') {
      return recs.filter((r) => r.status !== 'published');
    }
    return recs.filter((r) => r.status === 'published');
  });

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

  // ── i18n getters ──

  get badgeLabel(): string {
    return this.store.isAgronomist()
      ? this.t.translate('rec.list.badge.agronomist')
      : this.t.translate('rec.list.badge.grower');
  }

  get headingText(): string {
    return this.t.translate('rec.list.heading');
  }

  get subtitleText(): string {
    return this.store.isAgronomist()
      ? this.t.translate('rec.list.subtitle.agronomist')
      : this.t.translate('rec.list.subtitle.grower');
  }

  get counterLabel(): string {
    return this.t.translate('rec.list.counter');
  }

  get tabPendingLabel(): string {
    return this.t.translate('rec.list.tab.pending');
  }

  get tabPublishedLabel(): string {
    return this.t.translate('rec.list.tab.published');
  }

  get newButtonLabel(): string {
    return this.t.translate('rec.list.newButton');
  }

  get loadingText(): string {
    return this.t.translate('rec.list.loading');
  }

  get emptyPendingTitle(): string {
    return this.t.translate('rec.list.emptyPending');
  }

  get emptyPendingDesc(): string {
    return this.t.translate('rec.list.emptyPendingDesc');
  }

  get emptyPublishedTitle(): string {
    return this.t.translate('rec.list.emptyPublished');
  }

  get emptyPublishedDesc(): string {
    return this.t.translate('rec.list.emptyPublishedDesc');
  }

  get createFirstLabel(): string {
    return this.t.translate('rec.list.createFirst');
  }

  get backDashboardLabel(): string { return this.t.translate('rec.list.backDashboard'); }
  get recommendedActionLabel(): string { return this.t.translate('rec.list.recommendedAction'); }
  get createdAtLabel(): string { return this.t.translate('rec.list.createdAt'); }
  get generatedByAiLabel(): string { return this.t.translate('rec.list.generatedBy.ai'); }
  get generatedByManualLabel(): string { return this.t.translate('rec.list.generatedBy.manual'); }

  priorityLabel(key: string): string {
    const labels: Record<string, string> = {
      critical: this.t.translate('rec.list.priority.critical'),
      high: this.t.translate('rec.list.priority.high'),
      medium: this.t.translate('rec.list.priority.medium'),
      low: this.t.translate('rec.list.priority.low'),
    };
    return labels[key] ?? key;
  }

  statusLabel(key: string): string {
    const labels: Record<string, string> = {
      draft: this.t.translate('rec.list.status.draft'),
      pending_review: this.t.translate('rec.list.status.pendingReview'),
      approved: this.t.translate('rec.list.status.approved'),
      published: this.t.translate('rec.list.status.published'),
    };
    return labels[key] ?? key;
  }

  generatedByLabel(generatedBy: 'ai' | 'manual' | undefined | null): string {
    return generatedBy === 'ai' ? this.generatedByAiLabel : this.generatedByManualLabel;
  }

  ngOnInit(): void {
    this.load();
  }

  selectTab(tab: 'pending' | 'published'): void {
    this.activeTab.set(tab);
  }

  private load(): void {
    const params = this.store.isAgronomist()
      ? { size: 50 }
      : { status: 'published', size: 50 };
    this.store.loadRecommendations(params);
  }
}
