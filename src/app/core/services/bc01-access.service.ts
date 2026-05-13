import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { SubscriptionService } from './subscription.service';
import { Subscription } from '../models/subscription.model';

export type Bc01WriteAccess = {
  subscription: Subscription | null;
  canWrite: boolean;
  message: string;
};

@Injectable({ providedIn: 'root' })
export class Bc01AccessService {
  private readonly subscriptionService = inject(SubscriptionService);

  loadWriteAccess(): Observable<Bc01WriteAccess> {
    return this.subscriptionService.getMySubscription().pipe(
      map((subscription) => ({
        subscription,
        canWrite: subscription.status === 'active',
        message:
          subscription.status === 'active'
            ? ''
            : 'Necesitas una suscripcion activa para realizar cambios en plantaciones y dispositivos.',
      })),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of({
            subscription: null,
            canWrite: false,
            message: 'Necesitas una suscripcion activa para realizar cambios en plantaciones y dispositivos.',
          });
        }

        return of({
          subscription: null,
          canWrite: false,
          message: 'No se pudo validar el estado de tu suscripcion en este momento.',
        });
      }),
    );
  }
}
