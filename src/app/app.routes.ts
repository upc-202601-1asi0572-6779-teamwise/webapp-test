import { Routes } from '@angular/router';
import { authGuard } from './shared/infrastructure/guards/auth.guard';
import { noAuthGuard } from './shared/infrastructure/guards/no-auth.guard';

/**
 * Agronomist console shell — sections aligned to IAM + SensorData + FTM path.
 * Old grower/admin sections (plantations CRUD, devices CRUD, alerts, reports, inspections)
 * are not registered here.
 */
export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./subscription-and-user-management/presentation/subscription-and-user-management.routes').then(
        (m) => m.authRoutes,
      ),
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
          import('./crop-monitoring-dashboard/presentation/crop-monitoring-dashboard.routes').then(
            (m) => m.dashboardRoutes,
          ),
      },
      {
        path: 'monitoreo',
        loadChildren: () =>
          import('./iot-device-management/presentation/monitoring.routes').then((m) => m.monitoringRoutes),
      },
      {
        path: 'recomendaciones',
        loadChildren: () =>
          import('./agronomic-recommendation/presentation/agronomic-recommendation.routes').then(
            (m) => m.recommendationRoutes,
          ),
      },
      {
        path: 'intervenciones',
        loadChildren: () =>
          import('./field-technical-management/presentation/intervention.routes').then(
            (m) => m.interventionRoutes,
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./subscription-and-user-management/presentation/subscription-and-user-management.routes').then(
            (m) => m.profileRoutes,
          ),
      },
      {
        path: 'subscription',
        loadChildren: () =>
          import('./subscription-and-user-management/presentation/subscription-and-user-management.routes').then(
            (m) => m.subscriptionRoutes,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
