import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'recover-password',
    loadComponent: () =>
      import('./recover-password/recover-password.component').then((m) => m.RecoverPasswordComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
