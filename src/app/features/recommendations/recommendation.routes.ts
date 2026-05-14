import { Routes } from '@angular/router';
import { agronomistGuard } from '../../core/guards/agronomist.guard';

export const recommendationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/recommendation-list/recommendation-list.component').then(
        (m) => m.RecommendationListComponent,
      ),
  },
  {
    path: 'new',
    canActivate: [agronomistGuard],
    loadComponent: () =>
      import('./pages/recommendation-form/recommendation-form.component').then(
        (m) => m.RecommendationFormComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/recommendation-detail/recommendation-detail.component').then(
        (m) => m.RecommendationDetailComponent,
      ),
  },
];
