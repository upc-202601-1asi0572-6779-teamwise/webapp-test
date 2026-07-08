import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./views/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./views/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'recover-password',
    loadComponent: () =>
      import('./views/recover-password/recover-password.component').then((m) => m.RecoverPasswordComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./views/my-profile/my-profile.component').then((m) => m.MyProfileComponent),
  },
];

export const subscriptionRoutes: Routes = [
  {
    path: 'plans',
    loadComponent: () =>
      import('./views/plans/plans.component').then((m) => m.PlansComponent),
  },
  {
    path: 'me',
    loadComponent: () =>
      import('./views/my-subscription/my-subscription.component').then((m) => m.MySubscriptionComponent),
  },
  { path: '', redirectTo: 'plans', pathMatch: 'full' },
];