import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SensorReading, SensorReadingsResponse } from '../domain/sensor-reading.model';

/** Backend SensorReadingViewResource */
interface SensorReadingBackendDto {
  edgeDeviceMacAddress: string;
  iotDeviceMacAddress: string;
  sensorType: string;
  value: number;
  unit: string | null;
  measuredAt: string;
}

/** Only types the UI dashboard charts understand (temperature / soil_humidity / soil_ph). */
const SENSOR_MAP: Record<
  string,
  { variableType: SensorReading['variableType']; label: string; unit: string } | null
> = {
  Humidity: { variableType: 'soil_humidity', label: 'Humedad', unit: '%' },
  PH: { variableType: 'soil_ph', label: 'pH', unit: '' },
  // Luminosity has no chart slot in the current UI — omit from mapped series.
  Luminosity: null,
  Temperature: { variableType: 'temperature', label: 'Temperatura', unit: '°C' },
  SoilMoisture: { variableType: 'soil_humidity', label: 'Humedad suelo', unit: '%' },
};

@Injectable({ providedIn: 'root' })
export class SensorReadingService {
  private readonly http = inject(HttpClient);

  list(params?: {
    deviceId?: number;
    plantationId?: number;
    monitoringZoneId?: number;
    variableType?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
    deviceMac?: string;
  }): Observable<SensorReadingsResponse> {
    if (!environment.features.sensors) {
      return of({ readings: [], totalElements: 0, totalPages: 0, page: 1, size: params?.size ?? 0 });
    }

    const deviceMac = params?.deviceMac ?? environment.demo.deviceMac;
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    const suffix = query.size ? `?${query.toString()}` : '';

    return this.http
      .get<SensorReadingBackendDto[]>(
        `${environment.apiUrl}/devices/${encodeURIComponent(deviceMac)}/sensor-readings${suffix}`,
      )
      .pipe(
        map((items) => {
          let readings = (items ?? [])
            .map((dto, index) => this.toDomain(dto, index))
            .filter((r): r is SensorReading => r !== null);
          if (params?.variableType) {
            readings = readings.filter((r) => r.variableType === params.variableType);
          }
          if (params?.size) {
            readings = readings.slice(0, params.size);
          }
          return {
            readings,
            totalElements: readings.length,
            totalPages: 1,
            page: params?.page ?? 1,
            size: params?.size ?? readings.length,
          };
        }),
      );
  }

  private toDomain(dto: SensorReadingBackendDto, index: number): SensorReading | null {
    const mapped = SENSOR_MAP[dto.sensorType];
    if (mapped === null) return null;
    const meta = mapped ?? {
      variableType: 'temperature' as const,
      label: dto.sensorType,
      unit: dto.unit ?? '',
    };
    return {
      id: index + 1,
      deviceId: 0,
      plantationId: environment.demo.plantationId,
      monitoringZoneId: 0,
      userId: environment.demo.agronomistId,
      variableType: meta.variableType,
      label: meta.label,
      value: dto.value,
      unit: normalizeUnit(dto.unit, meta.unit),
      deviceSerial: dto.iotDeviceMacAddress,
      plantationName: `Plantation #${environment.demo.plantationId}`,
      recordedAt: dto.measuredAt,
    };
  }
}

function normalizeUnit(raw: string | null | undefined, fallback: string): string {
  if (!raw || raw === 'Unknown' || raw === 'unknown') return fallback;
  if (raw === 'Percent') return '%';
  return raw;
}

