import { Routes } from '@angular/router';

export const recommendationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/recommendation-list/recommendation-list.component').then(
        (m) => m.RecommendationListComponent,
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
