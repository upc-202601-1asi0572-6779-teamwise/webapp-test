import { Routes } from '@angular/router';

export const deviceRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/device-list/device-list.component').then((m) => m.DeviceListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/device-detail/device-detail.component').then((m) => m.DeviceDetailComponent),
  },
];
