import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/auth-shell/auth-shell.component').then((m) => m.AuthShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/workspace/section-placeholder/section-placeholder.component').then(
            (m) => m.SectionPlaceholderComponent,
          ),
        data: { title: 'Dashboard' },
      },
      {
        path: 'plantaciones',
        loadChildren: () =>
          import('./features/plantations/plantation.routes').then((m) => m.plantationRoutes),
      },
      {
        path: 'dispositivos',
        loadChildren: () => import('./features/devices/device.routes').then((m) => m.deviceRoutes),
      },
      {
        path: 'alertas',
        loadComponent: () =>
          import('./features/workspace/section-placeholder/section-placeholder.component').then(
            (m) => m.SectionPlaceholderComponent,
          ),
        data: { title: 'Alertas' },
      },
      {
        path: 'recomendaciones',
        loadComponent: () =>
          import('./features/workspace/section-placeholder/section-placeholder.component').then(
            (m) => m.SectionPlaceholderComponent,
          ),
        data: { title: 'Recomendaciones' },
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/workspace/section-placeholder/section-placeholder.component').then(
            (m) => m.SectionPlaceholderComponent,
          ),
        data: { title: 'Reportes' },
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then((m) => m.profileRoutes),
      },
      {
        path: 'subscription',
        loadChildren: () =>
          import('./features/subscription/subscription.routes').then((m) => m.subscriptionRoutes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
