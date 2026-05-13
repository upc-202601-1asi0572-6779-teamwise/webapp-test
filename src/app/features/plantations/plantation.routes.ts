import { Routes } from '@angular/router';
import { subscriptionActiveGuard } from '../../core/guards/subscription-active.guard';

export const plantationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/plantation-list/plantation-list.component').then((m) => m.PlantationListComponent),
  },
  {
    path: 'new',
    canActivate: [subscriptionActiveGuard],
    loadComponent: () =>
      import('./pages/plantation-form/plantation-form.component').then((m) => m.PlantationFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [subscriptionActiveGuard],
    loadComponent: () =>
      import('./pages/plantation-form/plantation-form.component').then((m) => m.PlantationFormComponent),
  },
  {
    path: ':plantationId/zones/new',
    canActivate: [subscriptionActiveGuard],
    loadComponent: () => import('./pages/zone-form/zone-form.component').then((m) => m.ZoneFormComponent),
  },
  {
    path: ':plantationId/zones/:zoneId/edit',
    canActivate: [subscriptionActiveGuard],
    loadComponent: () => import('./pages/zone-form/zone-form.component').then((m) => m.ZoneFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/plantation-detail/plantation-detail.component').then((m) => m.PlantationDetailComponent),
  },
];
