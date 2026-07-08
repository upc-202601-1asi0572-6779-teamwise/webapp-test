/**
 * Phase 2 — Recommendation Form Component i18n Tests (Strict TDD)
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID, Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { loadTranslations } from '@angular/localize';
import { RecommendationFormComponent } from './recommendation-form.component';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';

@Component({ template: '' })
class DummyComponent {}

function createMockStore(overrides: Record<string, unknown> = {}) {
  const defaults = {
    recommendationFormLoading: signal(false),
    recommendationFormSaving: signal(false),
    recommendationFormError: signal(''),
    recommendationFormPlants: signal([]),
    recommendationFormZones: signal([]),
    recommendationFormAlerts: signal([]),
    recommendationFormZonesLoading: signal(false),
    ...overrides,
  };
  return {
    ...defaults,
    loadPlantationsForForm: vi.fn(),
    loadZonesAndAlertsForForm: vi.fn(),
    createRecommendation: vi.fn(() => ({ subscribe: vi.fn() })),
  } as unknown as AgronomicRecommendationStore;
}

function setupTestBed(locale: 'es' | 'en', store: ReturnType<typeof createMockStore>) {
  return TestBed.configureTestingModule({
    imports: [RecommendationFormComponent],
    providers: [
      { provide: LOCALE_ID, useValue: locale },
      { provide: AgronomicRecommendationStore, useValue: store },
      provideRouter([
        { path: 'recomendaciones', component: DummyComponent },
        { path: 'recomendaciones/:id', component: DummyComponent },
      ]),
      provideHttpClient(),
    ],
  });
}

const EN: Record<string, string> = {
  'rec.form.back': '← Back to recommendations',
  'rec.form.loading': 'Loading form...',
  'rec.form.title': 'New Recommendation',
  'rec.form.subtitle': 'Generate an agronomic recommendation linked to an active alert or draft it manually.',
  'rec.form.plantation': 'Plantation',
  'rec.form.plantationPlaceholder': 'Select a plantation',
  'rec.form.zone': 'Zone',
  'rec.form.zonePlaceholder': 'Select a zone',
  'rec.form.zoneLoading': 'Loading zones...',
  'rec.form.alert': 'Related Alert (optional)',
  'rec.form.alertNone': 'No associated alert',
  'rec.form.titleInput': 'Title',
  'rec.form.titlePlaceholder': 'Ex: Apply lime amendment in South Zone',
  'rec.form.description': 'Description',
  'rec.form.descriptionPlaceholder': 'Describe the context and justification for the recommendation...',
  'rec.form.recommendedAction': 'Recommended Action',
  'rec.form.actionPlaceholder': 'Ex: Apply dolomitic lime (2 tons/ha)',
  'rec.form.priority': 'Priority',
  'rec.form.priority.low': 'Low',
  'rec.form.priority.medium': 'Medium',
  'rec.form.priority.high': 'High',
  'rec.form.priority.critical': 'Critical',
  'rec.form.generateAI': 'Generate with AI',
  'rec.form.saveDraft': 'Save draft',
  'rec.form.saving': 'Saving...',
  'rec.form.cancel': 'Cancel',
};

// ═══════════════════════════════════════════════════════════════════════
//  SPANISH TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('RecommendationFormComponent — i18n (Spanish)', () => {
  it('should show Spanish form title and subtitle', async () => {
    const store = createMockStore();
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nueva recomendacion');
    expect(el.textContent).toContain('Genera una recomendacion agronomica');
  });

  it('should show Spanish form field labels', async () => {
    const store = createMockStore();
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Plantacion');
    expect(el.textContent).toContain('Zona');
    expect(el.textContent).toContain('Alerta relacionada (opcional)');
    expect(el.textContent).toContain('Titulo');
    expect(el.textContent).toContain('Descripcion');
    expect(el.textContent).toContain('Accion recomendada');
    expect(el.textContent).toContain('Prioridad');
  });

  it('should show Spanish buttons', async () => {
    const store = createMockStore();
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Generar con IA');
    expect(el.textContent).toContain('Guardar borrador');
    expect(el.textContent).toContain('Cancelar');
  });

  it('should show Spanish priority options', async () => {
    const store = createMockStore();
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Baja');
    expect(el.textContent).toContain('Media');
    expect(el.textContent).toContain('Alta');
    expect(el.textContent).toContain('Critica');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ENGLISH TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('RecommendationFormComponent — i18n (English)', () => {
  beforeAll(() => {
    loadTranslations(EN);
  });

  it('should show English form title', async () => {
    const store = createMockStore();
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('New Recommendation');
  });

  it('should show English form field labels', async () => {
    const store = createMockStore();
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Plantation');
    expect(el.textContent).toContain('Zone');
    expect(el.textContent).toContain('Title');
    expect(el.textContent).toContain('Description');
    expect(el.textContent).toContain('Priority');
  });

  it('should show English buttons', async () => {
    const store = createMockStore();
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Generate with AI');
    expect(el.textContent).toContain('Save draft');
    expect(el.textContent).toContain('Cancel');
  });

  it('should show English priority options', async () => {
    const store = createMockStore();
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationFormComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Low');
    expect(el.textContent).toContain('Medium');
    expect(el.textContent).toContain('High');
    expect(el.textContent).toContain('Critical');
  });
});
