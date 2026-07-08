/**
 * Phase 2 — Dashboard Component i18n Tests (Strict TDD)
 *
 * Tests locale-aware behavior: health labels, headers, buttons, empty states,
 * error messages, device statuses, sparkline labels, table headers.
 *
 * ⚠️ ORDER MATTERS: Spanish tests run first (no loadTranslations), then English
 *    tests call loadTranslations. loadTranslations is global and persists.
 */
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { loadTranslations } from '@angular/localize';
import { DashboardComponent } from './dashboard.component';
import { CropMonitoringDashboardStore } from '../../../application/crop-monitoring-dashboard.store';
import { AuthService } from '../../../../shared/infrastructure/auth.service';

// --- Test Helpers ---

@Component({ template: '' })
class DummyComponent {}

type AnySignal<T> = () => T;

interface MockStoreOverrides {
  isAgronomist?: AnySignal<boolean>;
  loading?: AnySignal<boolean>;
  error?: AnySignal<string>;
  plantations?: AnySignal<unknown[]>;
  zones?: AnySignal<unknown[]>;
  activeAlerts?: AnySignal<unknown[]>;
  alertCount?: AnySignal<{ critical: number; warning: number; total: number }>;
  recommendations?: AnySignal<unknown[]>;
  latestReadings?: AnySignal<unknown[]>;
  devices?: AnySignal<unknown[]>;
  connectedCount?: AnySignal<number>;
  offlineCount?: AnySignal<number>;
  disconnectedCount?: AnySignal<number>;
  sparklineItems?: AnySignal<unknown[]>;
  trendCards?: AnySignal<unknown[]>;
  inspections?: AnySignal<unknown[]>;
  topRecommendation?: AnySignal<unknown | null>;
  selectedPlantation?: AnySignal<unknown | null>;
  healthLabels?: Record<string, string>;
  healthColors?: Record<string, string>;
  zoneHealthItems?: AnySignal<unknown[]>;
}

function createMockStore(overrides: MockStoreOverrides = {}) {
  const defaults = {
    isAgronomist: () => true,
    loading: () => false,
    error: () => '',
    plantations: () => [],
    zones: () => [],
    activeAlerts: () => [],
    alertCount: () => ({ critical: 2, warning: 3, total: 5 }),
    recommendations: () => [],
    latestReadings: () => [],
    devices: () => [],
    connectedCount: () => 4,
    offlineCount: () => 1,
    disconnectedCount: () => 0,
    sparklineItems: () => [],
    trendCards: () => [],
    inspections: () => [],
    topRecommendation: () => null,
    selectedPlantation: () => null,
    healthLabels: {
      optimal: 'Optimo',
      at_risk: 'En riesgo',
      critical: 'Critico',
    },
    healthColors: {
      optimal: 'var(--color-success)',
      at_risk: 'var(--color-warning)',
      critical: 'var(--color-danger)',
    },
    zoneHealthItems: () => [],
    ...overrides,
  };

  return {
    ...defaults,
    loadAll: vi.fn(),
    selectPlantation: vi.fn(),
  } as unknown as CropMonitoringDashboardStore;
}

function setupTestBed(locale: 'es' | 'en', store: ReturnType<typeof createMockStore>) {
  const authMock = {
    currentUser: { id: 1, fullName: 'Dr. Test', role: 'agronomist' },
    isAuthenticated: true,
    logout: vi.fn(),
  };

  return TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      { provide: LOCALE_ID, useValue: locale },
      { provide: CropMonitoringDashboardStore, useValue: store },
      { provide: AuthService, useValue: authMock },
      provideRouter([
        { path: 'dashboard', component: DummyComponent },
        { path: 'reportes', component: DummyComponent },
        { path: 'alertas', component: DummyComponent },
        { path: 'alertas/:id', component: DummyComponent },
        { path: 'recomendaciones', component: DummyComponent },
        { path: 'recomendaciones/:id', component: DummyComponent },
        { path: 'inspecciones', component: DummyComponent },
        { path: 'inspecciones/:id', component: DummyComponent },
        { path: 'plantaciones', component: DummyComponent },
      ]),
      provideHttpClient(),
    ],
  });
}

// English translations keyed by Angular message ID
const EN: Record<string, string> = {
  'dashboard.health.optimal': 'Optimal',
  'dashboard.health.atRisk': 'At Risk',
  'dashboard.health.critical': 'Critical',
  'dashboard.heading.agronomist': 'Crop Monitoring',
  'dashboard.subtitle.agronomist': 'Monitoring all plantations under your charge.',
  'dashboard.heading.grower': 'My Crop',
  'dashboard.subtitle.grower': 'Summary of your plantation status',
  'dashboard.newReport': '+ New Report',
  'dashboard.allPlantations': 'All Plantations',
  'dashboard.loading': 'Loading dashboard...',
  'dashboard.alerts.agronomist': 'Active Alerts',
  'dashboard.alerts.grower': 'Alerts',
  'dashboard.alerts.criticalAgronomist': 'Critical',
  'dashboard.alerts.warningAgronomist': 'Warnings',
  'dashboard.alerts.criticalGrower': 'Urgent',
  'dashboard.alerts.warningGrower': 'Attention',
  'dashboard.devices.agronomist': 'Devices',
  'dashboard.devices.grower': 'Your Devices',
  'dashboard.devices.connected': 'Connected',
  'dashboard.devices.offline': 'Offline',
  'dashboard.devices.disconnected': 'Disconnected',
  'dashboard.trends.heading': 'Parameter Trends',
  'dashboard.trends.subtitle': 'Evolution of key variables over time',
  'dashboard.sparkline.temperature': 'Temperature',
  'dashboard.sparkline.soilHumidity': 'Soil Humidity',
  'dashboard.sparkline.soilPh': 'Soil pH',
  'dashboard.trend.humidity': 'Humidity',
  'dashboard.trend.ph': 'pH',
  'dashboard.growerTrends.heading': 'How Your Crop is Doing',
  'dashboard.growerTrends.subtitle': 'Latest sensor measurements',
  'dashboard.health.agronomist': 'Crop Health',
  'dashboard.health.grower': 'Your Zone Status',
  'dashboard.zones.selectPlantation': 'Select a plantation to view its zones.',
  'dashboard.readings.agronomist': 'Latest Readings',
  'dashboard.readings.grower': 'Recent Readings',
  'dashboard.recentAlerts': 'Recent Alerts',
  'dashboard.viewAll': 'View All',
  'dashboard.recommendations': 'Recommendations',
  'dashboard.inspections': 'Intervention History',
  'dashboard.plantations.agronomist': 'Plantations',
  'dashboard.plantations.grower': 'Your Plantations',
  'dashboard.table.variable': 'Variable',
  'dashboard.table.value': 'Value',
  'dashboard.table.device': 'Device',
  'dashboard.table.time': 'Time',
  'dashboard.error.load': 'Could not load dashboard data.',
};

// ═══════════════════════════════════════════════════════════════════════
//  SPANISH TESTS (run first — no loadTranslations)
// ═══════════════════════════════════════════════════════════════════════

describe('DashboardComponent — i18n (Spanish)', () => {
  it('should show Spanish health labels (Optimo, En riesgo, Critico)', async () => {
    const store = createMockStore({
      zones: () => [
        { id: 1, name: 'Zona Norte', hectares: 12.5, cropHealthStatus: 'optimal' },
        { id: 2, name: 'Zona Sur', hectares: 8.3, cropHealthStatus: 'critical' },
      ],
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Optimo');
    expect(el.textContent).toContain('Critico');
  });

  it('should show Spanish agronomist heading', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Supervision de cultivos');
    expect(el.textContent).toContain('Monitoreo de todas las plantaciones a tu cargo');
  });

  it('should show Spanish loading text', async () => {
    const store = createMockStore({ loading: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cargando dashboard');
  });

  it('should show Spanish alert section labels', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alertas activas');
    expect(el.textContent).toContain('Criticas');
    expect(el.textContent).toContain('Advertencias');
  });

  it('should show Spanish device status labels', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      connectedCount: () => 4,
      offlineCount: () => 1,
      disconnectedCount: () => 0,
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Conectados');
    expect(el.textContent).toContain('Modo offline');
  });

  it('should show Spanish sparkline labels', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      sparklineItems: () => [
        { label: 'Temperatura', unit: '°C', color: 'var(--color-warning)', currentValue: 28.5, vMin: 25, vMax: 32, points: '3,40 100,30 197,50' },
      ],
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Tendencias de parametros');
    expect(el.textContent).toContain('Temperatura');
  });

  it('should show Spanish table headers', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      latestReadings: () => [
        { id: 1, label: 'Temperatura', value: 28.5, unit: '°C', deviceSerial: 'SN-001', deviceId: 1, recordedAt: '2025-06-15T10:00:00Z' },
      ],
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Variable');
    expect(el.textContent).toContain('Valor');
    expect(el.textContent).toContain('Dispositivo');
    expect(el.textContent).toContain('Hora');
  });

  it('should show Spanish section headings when agronomist', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      inspections: () => [{ id: 1, plantationName: 'Finca Test', inspectionDate: '2025-06-10', findings: 'Todo en orden', observations: 'Revisión completa' }],
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Salud del cultivo');
    expect(el.textContent).toContain('Historial de intervenciones');
    expect(el.textContent).toContain('Plantaciones');
  });

  it('should display store error message in Spanish', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      loading: () => false,
      error: () => 'No se pudieron cargar los datos del dashboard.',
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No se pudieron cargar los datos del dashboard');
  });

  it('should show Spanish grower heading', async () => {
    const store = createMockStore({ isAgronomist: () => false });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Mi cultivo');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ENGLISH TESTS (run after — loadTranslations persists)
// ═══════════════════════════════════════════════════════════════════════

describe('DashboardComponent — i18n (English)', () => {
  beforeAll(() => {
    loadTranslations(EN);
  });

  it('should show English agronomist heading', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Crop Monitoring');
  });

  it('should show English loading text', async () => {
    const store = createMockStore({ loading: () => true });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading dashboard');
  });

  it('should show English alert section labels', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Active Alerts');
    expect(el.textContent).toContain('Critical');
    expect(el.textContent).toContain('Warnings');
  });

  it('should show English device status labels', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      connectedCount: () => 4,
      offlineCount: () => 1,
      disconnectedCount: () => 2,
    });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Connected');
    expect(el.textContent).toContain('Offline');
    expect(el.textContent).toContain('Disconnected');
  });

  it('should show English table headers', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      latestReadings: () => [
        { id: 1, label: 'Temperature', value: 28.5, unit: '°C', deviceSerial: 'SN-001', deviceId: 1, recordedAt: '2025-06-15T10:00:00Z' },
      ],
    });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Variable');
    expect(el.textContent).toContain('Value');
    expect(el.textContent).toContain('Device');
    expect(el.textContent).toContain('Time');
  });

  it('should show English section headings when agronomist', async () => {
    const store = createMockStore({
      isAgronomist: () => true,
      inspections: () => [{ id: 1, plantationName: 'Test Farm', inspectionDate: '2025-06-10', findings: 'All good', observations: 'Full review' }],
    });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Crop Health');
    expect(el.textContent).toContain('Intervention History');
    expect(el.textContent).toContain('Plantations');
  });

  it('should show English grower heading', async () => {
    const store = createMockStore({ isAgronomist: () => false });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('My Crop');
  });
});
