import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';

function passwordStrength(control: AbstractControl<string>) {
  const value = control.value;
  if (!value) return null;
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  if (!hasUpper || !hasNumber) {
    return { passwordStrength: 'La contraseña debe contener al menos una mayúscula y un número.' };
  }
  return null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), passwordStrength]],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    role: ['palm_grower' as const, [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^\+51\s?\d{3}\s?\d{3}\s?\d{3}$/)]],
    region: ['', [Validators.required]],
    city: ['', [Validators.required]],
  });

  loading = false;
  error = '';

  regions = ['Ucayali', 'San Mart\u00edn', 'Loreto'];

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.authService
      .register(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigate(['/subscription/plans']),
        error: (err) => {
          this.error = err?.error?.message ?? 'Error al registrar. Intenta de nuevo.';
        },
      });
  }
}
