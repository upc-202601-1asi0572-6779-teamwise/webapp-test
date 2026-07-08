import { Routes } from '@angular/router';
import { authGuard } from './shared/infrastructure/guards/auth.guard';
import { noAuthGuard } from './shared/infrastructure/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./subscription-and-user-management/presentation/subscription-and-user-management.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/presentation/auth-shell/auth-shell.component').then((m) => m.AuthShellComponent),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./crop-monitoring-dashboard/presentation/crop-monitoring-dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'plantaciones',
        loadChildren: () =>
          import('./field-technical-management/presentation/field-technical-management.routes').then((m) => m.plantationRoutes),
      },
      {
        path: 'dispositivos',
        loadChildren: () =>
          import('./iot-device-management/presentation/iot-device-management.routes').then((m) => m.deviceRoutes),
      },
      {
        path: 'alertas',
        loadChildren: () =>
          import('./alert-and-notification/presentation/alert-and-notification.routes').then((m) => m.alertRoutes),
      },
      {
        path: 'recomendaciones',
        loadChildren: () =>
          import('./agronomic-recommendation/presentation/agronomic-recommendation.routes').then((m) => m.recommendationRoutes),
      },
      {
        path: 'reportes',
        loadChildren: () =>
          import('./agronomic-recommendation/presentation/agronomic-recommendation.routes').then((m) => m.reportRoutes),
      },
      {
        path: 'inspecciones',
        loadChildren: () =>
          import('./field-technical-management/presentation/field-technical-management.routes').then((m) => m.inspectionRoutes),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./subscription-and-user-management/presentation/subscription-and-user-management.routes').then((m) => m.profileRoutes),
      },
      {
        path: 'subscription',
        loadChildren: () =>
          import('./subscription-and-user-management/presentation/subscription-and-user-management.routes').then((m) => m.subscriptionRoutes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];