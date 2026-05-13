import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

type SidebarItem = {
  id: string;
  label: string;
  route: string;
};

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly primaryItems: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { id: 'plantations', label: 'Mis Plantaciones', route: '/plantaciones' },
    { id: 'devices', label: 'Mis dispositivos', route: '/dispositivos' },
    { id: 'alerts', label: 'Alertas', route: '/alertas' },
    { id: 'recommendations', label: 'Recomendaciones', route: '/recomendaciones' },
    { id: 'reports', label: 'Reportes', route: '/reportes' },
  ];

  readonly accountItems: SidebarItem[] = [
    { id: 'subscription', label: 'Mi suscripcion', route: '/subscription/me' },
    { id: 'profile', label: 'Mi perfil', route: '/profile' },
  ];

  get currentUser(): User | null {
    return this.authService.currentUser;
  }

  get userRoleImage(): string {
    return this.currentUser?.role === 'agronomist'
      ? '/images/segment/agronomist.png'
      : '/images/segment/palm_grower.png';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
