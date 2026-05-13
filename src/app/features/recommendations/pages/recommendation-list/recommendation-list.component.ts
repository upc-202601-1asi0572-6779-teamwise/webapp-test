import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Recommendation } from '../../models/recommendation.model';
import { RecommendationService } from '../../services/recommendation.service';

@Component({
  selector: 'app-recommendation-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './recommendation-list.component.html',
})
export class RecommendationListComponent implements OnInit {
  private readonly recommendationService = inject(RecommendationService);

  readonly recommendations = signal<Recommendation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

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

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');

    this.recommendationService
      .list({ status: 'published', size: 50 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.recommendations.set(response.recommendations),
        error: () => this.error.set('No se pudieron cargar las recomendaciones.'),
      });
  }
}
