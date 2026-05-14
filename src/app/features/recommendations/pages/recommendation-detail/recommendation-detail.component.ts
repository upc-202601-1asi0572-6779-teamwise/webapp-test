import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { getApiErrorMessage } from '../../../../core/utils/api-error-message';
import { Recommendation } from '../../models/recommendation.model';
import { RecommendationService } from '../../services/recommendation.service';

@Component({
  selector: 'app-recommendation-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './recommendation-detail.component.html',
})
export class RecommendationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly recommendationService = inject(RecommendationService);

  readonly recommendation = signal<Recommendation | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly actionLoading = signal('');
  readonly actionError = signal('');
  readonly actionSuccess = signal('');

  readonly isAgronomist = computed(() => this.authService.currentUser?.role === 'agronomist');

  readonly priorityColors: Record<string, string> = {
    critical: 'var(--color-danger)',
    high: 'var(--color-warning)',
    medium: 'var(--color-accent-cyan)',
    low: 'var(--color-success)',
  };

  readonly priorityLabels: Record<string, string> = {
    critical: 'Critica',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  };

  readonly statusColors: Record<string, string> = {
    draft: 'var(--color-text-muted)',
    pending_review: 'var(--color-warning)',
    approved: 'var(--color-accent-cyan)',
    published: 'var(--color-success)',
  };

  readonly statusLabels: Record<string, string> = {
    draft: 'Borrador',
    pending_review: 'Pendiente de revision',
    approved: 'Aprobada',
    published: 'Publicada',
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.load(id);
    } else {
      this.error.set('Recomendacion no valida.');
    }
  }

  approve(): void {
    const rec = this.recommendation();
    if (!rec) return;

    this.actionLoading.set('approve');
    this.actionError.set('');
    this.actionSuccess.set('');

    this.recommendationService
      .approve(rec.id)
      .pipe(finalize(() => this.actionLoading.set('')))
      .subscribe({
        next: () => {
          this.actionSuccess.set('Recomendacion aprobada correctamente.');
          this.load(rec.id);
        },
        error: (err: unknown) => this.actionError.set(getApiErrorMessage(err, 'No se pudo aprobar.')),
      });
  }

  publish(): void {
    const rec = this.recommendation();
    if (!rec) return;

    this.actionLoading.set('publish');
    this.actionError.set('');
    this.actionSuccess.set('');

    this.recommendationService
      .publish(rec.id)
      .pipe(finalize(() => this.actionLoading.set('')))
      .subscribe({
        next: () => {
          this.actionSuccess.set('Recomendacion publicada correctamente.');
          this.load(rec.id);
        },
        error: (err: unknown) => this.actionError.set(getApiErrorMessage(err, 'No se pudo publicar.')),
      });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.recommendationService
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (recommendation) => this.recommendation.set(recommendation),
        error: () => this.error.set('No se pudo cargar la recomendacion.'),
      });
  }
}
