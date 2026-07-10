import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { getApiErrorMessage } from '../../../../shared/infrastructure/api-error-message';
import { AuthService } from '../../../../shared/infrastructure/auth.service';
import { LocaleService } from '../../../../i18n/locale.service';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly localeService = inject(LocaleService);
  private readonly t = inject(TranslationService);

  /** IAM sign-in uses username (not email). */
  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required]],
  });

  loading = false;
  error = '';

  get toggleLabel(): string {
    return this.localeService.locale() === 'es' ? 'English' : 'Español';
  }

  get submitLabel(): string {
    return this.loading
      ? this.t.translate('login.loading')
      : this.t.translate('login.submitButton');
  }

  // ── Hero / Marketing texts ──
  get heroBadge(): string { return this.t.translate('login.heroBadge'); }
  get heroEyebrow(): string { return this.t.translate('login.heroEyebrow'); }
  get heroTitle(): string { return this.t.translate('login.heroTitle'); }
  get heroDescription(): string { return this.t.translate('login.heroDescription'); }
  get featureAlerts(): string { return this.t.translate('login.featureAlerts'); }
  get featureRecommendations(): string { return this.t.translate('login.featureRecommendations'); }
  get featureReports(): string { return this.t.translate('login.featureReports'); }
  get cardAlertsTitle(): string { return this.t.translate('login.cardAlertsTitle'); }
  get cardAlertsDesc(): string { return this.t.translate('login.cardAlertsDesc'); }
  get cardInspectionsTitle(): string { return this.t.translate('login.cardInspectionsTitle'); }
  get cardInspectionsDesc(): string { return this.t.translate('login.cardInspectionsDesc'); }
  get cardReportsTitle(): string { return this.t.translate('login.cardReportsTitle'); }
  get cardReportsDesc(): string { return this.t.translate('login.cardReportsDesc'); }
  get formEyebrow(): string { return this.t.translate('login.formEyebrow'); }
  get heroHeadline(): string { return this.t.translate('login.heroHeadline'); }
  get formSubtitle(): string { return this.t.translate('login.formSubtitle'); }

  // ── Form labels & placeholders ──
  get usernameLabel(): string { return this.t.translate('login.usernameLabel'); }
  get usernamePlaceholder(): string { return this.t.translate('login.usernamePlaceholder'); }
  get passwordLabel(): string { return this.t.translate('login.passwordLabel'); }
  get passwordPlaceholder(): string { return this.t.translate('login.passwordPlaceholder'); }

  // ── Links ──
  get forgotPassword(): string { return this.t.translate('login.forgotPassword'); }
  get noPublicRegisterHint(): string { return this.t.translate('login.noPublicRegisterHint'); }

  hasError(controlName: 'username' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(controlName: 'username' | 'password'): string {
    const control = this.form.controls[controlName];

    if (control.errors?.['required']) {
      return controlName === 'username'
        ? this.t.translate('login.usernameRequired')
        : this.t.translate('login.passwordRequired');
    }

    if (control.errors?.['minlength']) {
      return this.t.translate('login.usernameMin');
    }

    return '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    const raw = this.form.getRawValue();
    this.authService
      .login({ username: raw.username.trim(), password: raw.password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (error) => {
          this.error = getApiErrorMessage(
            error,
            this.t.translate('login.invalidCredentials'),
          );
        },
      });
  }

  switchLanguage(): void {
    this.localeService.toggle();
  }
}
