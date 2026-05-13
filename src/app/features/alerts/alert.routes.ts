import { Routes } from '@angular/router';

export const alertRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/alert-list/alert-list.component').then((m) => m.AlertListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/alert-detail/alert-detail.component').then((m) => m.AlertDetailComponent),
  },
];
