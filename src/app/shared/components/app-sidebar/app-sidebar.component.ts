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

  get currentUser(): User | null {
    return this.authService.currentUser;
  }

  get isAgronomist(): boolean {
    return this.currentUser?.role === 'agronomist';
  }

  get primaryItems(): SidebarItem[] {
    if (this.isAgronomist) {
      return [
        { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
        { id: 'plantations', label: 'Cartera de plantaciones', route: '/plantaciones' },
        { id: 'alerts', label: 'Alertas', route: '/alertas' },
        { id: 'recommendations', label: 'Recomendaciones', route: '/recomendaciones' },
        { id: 'reports', label: 'Reportes', route: '/reportes' },
        { id: 'inspections', label: 'Inspecciones', route: '/inspecciones' },
      ];
    }
    return [
      { id: 'dashboard', label: 'Dashboard', route: '/dashboard' },
      { id: 'plantations', label: 'Mis Plantaciones', route: '/plantaciones' },
      { id: 'devices', label: 'Mis dispositivos', route: '/dispositivos' },
      { id: 'alerts', label: 'Alertas', route: '/alertas' },
      { id: 'recommendations', label: 'Recomendaciones', route: '/recomendaciones' },
      { id: 'reports', label: 'Reportes', route: '/reportes' },
    ];
  }

  get accountItems(): SidebarItem[] {
    return [
      { id: 'subscription', label: 'Mi suscripcion', route: '/subscription/me' },
      { id: 'profile', label: 'Mi perfil', route: '/profile' },
    ];
  }

  get userRoleImage(): string {
    return this.isAgronomist
      ? '/images/segment/agronomist.png'
      : '/images/segment/palm_grower.png';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
