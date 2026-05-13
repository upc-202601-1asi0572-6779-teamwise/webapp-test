import { Routes } from '@angular/router';

export const plantationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/plantation-list/plantation-list.component').then((m) => m.PlantationListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/plantation-detail/plantation-detail.component').then((m) => m.PlantationDetailComponent),
  },
];
