import { Routes } from '@angular/router';

export const reportRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/report-list/report-list.component').then((m) => m.ReportListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/report-detail/report-detail.component').then((m) => m.ReportDetailComponent),
  },
];
