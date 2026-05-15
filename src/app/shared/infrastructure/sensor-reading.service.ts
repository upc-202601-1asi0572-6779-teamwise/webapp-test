import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SensorReadingsResponse } from '../domain/sensor-reading.model';

@Injectable({ providedIn: 'root' })
export class SensorReadingService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/readings`;

  list(params?: {
    deviceId?: number;
    plantationId?: number;
    monitoringZoneId?: number;
    variableType?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Observable<SensorReadingsResponse> {
    const query = new URLSearchParams();
    if (params?.deviceId !== undefined) query.set('deviceId', String(params.deviceId));
    if (params?.plantationId !== undefined) query.set('plantationId', String(params.plantationId));
    if (params?.monitoringZoneId !== undefined) query.set('monitoringZoneId', String(params.monitoringZoneId));
    if (params?.variableType) query.set('variableType', params.variableType);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.http.get<SensorReadingsResponse>(`${this.api}${suffix}`);
  }
}
