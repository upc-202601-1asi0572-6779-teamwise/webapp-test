import { Routes } from '@angular/router';

export const subscriptionRoutes: Routes = [
  {
    path: 'plans',
    loadComponent: () =>
      import('./plans/plans.component').then((m) => m.PlansComponent),
  },
  {
    path: 'me',
    loadComponent: () =>
      import('./my-subscription/my-subscription.component').then((m) => m.MySubscriptionComponent),
  },
  { path: '', redirectTo: 'plans', pathMatch: 'full' },
];
