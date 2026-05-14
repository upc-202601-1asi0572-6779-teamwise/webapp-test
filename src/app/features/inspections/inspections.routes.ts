import { Routes } from '@angular/router';
import { agronomistGuard } from '../../core/guards/agronomist.guard';

export const inspectionRoutes: Routes = [
  {
    path: '',
    canActivate: [agronomistGuard],
    loadComponent: () =>
      import('./pages/inspection-list/inspection-list.component').then((m) => m.InspectionListComponent),
  },
  {
    path: ':id',
    canActivate: [agronomistGuard],
    loadComponent: () =>
      import('./pages/inspection-detail/inspection-detail.component').then((m) => m.InspectionDetailComponent),
  },
];
