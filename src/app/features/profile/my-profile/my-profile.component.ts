import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-my-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './my-profile.component.html',
})
export class MyProfileComponent {
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  user = signal<User | null>(null);
  editing = false;
  loading = false;
  saving = false;
  error = '';

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+51\s?\d{3}\s?\d{3}\s?\d{3}$/)]],
    region: ['', [Validators.required]],
    city: ['', [Validators.required]],
  });

  regions = ['Ucayali', 'San Mart\u00edn', 'Loreto'];

  constructor() {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading = true;
    this.userService
      .getProfile()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (u) => this.user.set(u),
        error: () => (this.error = 'Error al cargar el perfil.'),
      });
  }

  startEdit(): void {
    const u = this.user();
    if (!u) return;
    this.form.patchValue({
      fullName: u.fullName,
      phone: u.phone,
      region: u.region,
      city: u.city,
    });
    this.editing = true;
    this.error = '';
  }

  cancelEdit(): void {
    this.editing = false;
    this.error = '';
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    this.userService
      .updateProfile(this.form.getRawValue())
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (u) => {
          this.user.set(u);
          this.editing = false;
        },
        error: () => (this.error = 'Error al guardar los cambios.'),
      });
  }
}
