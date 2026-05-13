import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Alert } from '../../models/alert.model';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-alert-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './alert-detail.component.html',
})
export class AlertDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly alertService = inject(AlertService);

  alert = signal<Alert | null>(null);
  loading = signal(false);
  saving = signal(false);
  actionError = signal('');
  actionSuccess = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.load(id);
    } else {
      this.actionError.set('Alerta no valida.');
    }
  }

  acknowledge(): void {
    const current = this.alert();
    if (!current) return;

    this.saving.set(true);
    this.actionError.set('');
    this.actionSuccess.set('');

    this.alertService
      .acknowledge(current.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.actionSuccess.set('Recepcion confirmada correctamente.');
          this.load(current.id);
        },
        error: (error: unknown) => {
          const message = error instanceof HttpErrorResponse ? error.error?.message : null;
          this.actionError.set(message || 'No se pudo confirmar la alerta.');
        },
      });
  }

  private load(id: number): void {
    this.loading.set(true);

    this.alertService
      .getById(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (alert) => this.alert.set(alert),
        error: () => this.actionError.set('No se pudo cargar la alerta.'),
      });
  }
}
