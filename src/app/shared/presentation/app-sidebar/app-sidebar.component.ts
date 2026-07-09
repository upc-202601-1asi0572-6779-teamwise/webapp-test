import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../../environments/environment';
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
    const f = environment.features;
    const items: SidebarItem[] = [
      { id: 'dashboard', label: this.t.translate('sidebar.dashboard'), route: '/dashboard' },
      { id: 'plantations', label: this.t.translate('sidebar.plantationPortfolio'), route: '/plantaciones' },
    ];

    if (this.isAgronomist) {
      if (f.alerts) items.push({ id: 'alerts', label: this.t.translate('sidebar.alerts'), route: '/alertas' });
      if (f.recommendations) {
        items.push({
          id: 'recommendations',
          label: this.t.translate('sidebar.recommendations'),
          route: '/recomendaciones',
        });
      }
      if (f.reports) items.push({ id: 'reports', label: this.t.translate('sidebar.reports'), route: '/reportes' });
      if (f.inspections) {
        items.push({ id: 'inspections', label: this.t.translate('sidebar.inspections'), route: '/inspecciones' });
      }
      return items;
    }

    items.push({ id: 'devices', label: this.t.translate('sidebar.devices'), route: '/dispositivos' });
    if (f.alerts) items.push({ id: 'alerts', label: this.t.translate('sidebar.alerts'), route: '/alertas' });
    if (f.recommendations) {
      items.push({
        id: 'recommendations',
        label: this.t.translate('sidebar.recommendations'),
        route: '/recomendaciones',
      });
    }
    if (f.reports) items.push({ id: 'reports', label: this.t.translate('sidebar.reports'), route: '/reportes' });
    return items;
  });

  readonly _accountItems = computed<SidebarItem[]>(() => {
    const items: SidebarItem[] = [];
    if (environment.features.subscriptionApi) {
      items.push({ id: 'subscription', label: this.t.translate('sidebar.mySubscription'), route: '/subscription/me' });
    }
    items.push({ id: 'profile', label: this.t.translate('sidebar.myProfile'), route: '/profile' });
    return items;
  });

  readonly _logoutLabel = computed(() => this.t.translate('sidebar.logout'));
  readonly _operationsCenterLabel = computed(() => this.t.translate('sidebar.operationsCenter'));

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
  get operationsCenterLabel(): string { return this._operationsCenterLabel(); }

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
