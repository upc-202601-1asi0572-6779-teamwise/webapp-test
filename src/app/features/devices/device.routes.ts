import { Routes } from '@angular/router';
import { subscriptionActiveGuard } from '../../core/guards/subscription-active.guard';

export const deviceRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/device-list/device-list.component').then((m) => m.DeviceListComponent),
  },
  {
    path: 'new',
    canActivate: [subscriptionActiveGuard],
    loadComponent: () => import('./pages/device-form/device-form.component').then((m) => m.DeviceFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/device-detail/device-detail.component').then((m) => m.DeviceDetailComponent),
  },
];
