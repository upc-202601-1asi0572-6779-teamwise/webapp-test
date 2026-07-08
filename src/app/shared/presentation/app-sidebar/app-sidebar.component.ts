import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../shared/infrastructure/auth.service';
import { User } from '../../../shared/domain/user.model';
import { TranslationService } from '../../../i18n/translation.service';

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
  private readonly translationService = inject(TranslationService);

  // Reactive labels that update when locale changes
  private readonly t = this.translationService;

  readonly _primaryItems = computed<SidebarItem[]>(() => {
    if (this.isAgronomist) {
      return [
        { id: 'dashboard', label: this.t.translate('sidebar.dashboard'), route: '/dashboard' },
        { id: 'plantations', label: this.t.translate('sidebar.plantationPortfolio'), route: '/plantaciones' },
        { id: 'alerts', label: this.t.translate('sidebar.alerts'), route: '/alertas' },
        { id: 'recommendations', label: this.t.translate('sidebar.recommendations'), route: '/recomendaciones' },
        { id: 'reports', label: this.t.translate('sidebar.reports'), route: '/reportes' },
        { id: 'inspections', label: this.t.translate('sidebar.inspections'), route: '/inspecciones' },
      ];
    }
    return [
      { id: 'dashboard', label: this.t.translate('sidebar.dashboard'), route: '/dashboard' },
      { id: 'plantations', label: this.t.translate('sidebar.plantationPortfolio'), route: '/plantaciones' },
      { id: 'devices', label: this.t.translate('sidebar.devices'), route: '/dispositivos' },
      { id: 'alerts', label: this.t.translate('sidebar.alerts'), route: '/alertas' },
      { id: 'recommendations', label: this.t.translate('sidebar.recommendations'), route: '/recomendaciones' },
      { id: 'reports', label: this.t.translate('sidebar.reports'), route: '/reportes' },
    ];
  });

  readonly _accountItems = computed<SidebarItem[]>(() => [
    { id: 'subscription', label: this.t.translate('sidebar.mySubscription'), route: '/subscription/me' },
    { id: 'profile', label: this.t.translate('sidebar.myProfile'), route: '/profile' },
  ]);

  readonly _logoutLabel = computed(() => this.t.translate('sidebar.logout'));

  readonly _roleLabel = computed(() => {
    if (!this.currentUser) return '';
    const key = this.currentUser.role === 'agronomist'
      ? 'sidebar.role.agronomist'
      : 'sidebar.role.grower';
    return this.t.translate(key);
  });

  // Public getters for template compatibility
  get primaryItems(): SidebarItem[] { return this._primaryItems(); }
  get accountItems(): SidebarItem[] { return this._accountItems(); }
  get logoutLabel(): string { return this._logoutLabel(); }
  get roleLabel(): string { return this._roleLabel(); }

  get currentUser(): User | null {
    return this.authService.currentUser;
  }

  get isAgronomist(): boolean {
    return this.currentUser?.role === 'agronomist';
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
