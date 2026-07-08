/**
 * Phase 2 — Recommendation List Component i18n Tests (Strict TDD)
 *
 * Tests locale-aware behavior: role badge, heading, subtitle, tabs,
 * loading, empty states, priority/status labels, counter label.
 *
 * ⚠️ ORDER MATTERS: Spanish tests first, then English.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID, Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { loadTranslations } from '@angular/localize';
import { RecommendationListComponent } from './recommendation-list.component';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';

// --- Test Helpers ---

@Component({ template: '' })
class DummyComponent {}

function createMockStore(overrides: Record<string, unknown> = {}) {
  const defaults = {
    isAgronomist: () => true,
    recommendations: signal([]),
    recommendationsLoading: signal(false),
    recommendationsError: signal(''),
    ...overrides,
  };

  return {
    ...defaults,
    loadRecommendations: vi.fn(),
  } as unknown as AgronomicRecommendationStore;
}

function setupTestBed(locale: 'es' | 'en', store: ReturnType<typeof createMockStore>) {
  return TestBed.configureTestingModule({
    imports: [RecommendationListComponent],
    providers: [
      { provide: LOCALE_ID, useValue: locale },
      { provide: AgronomicRecommendationStore, useValue: store },
      provideRouter([
        { path: 'dashboard', component: DummyComponent },
        { path: 'recomendaciones', component: DummyComponent },
        { path: 'recomendaciones/:id', component: DummyComponent },
        { path: 'recomendaciones/new', component: DummyComponent },
      ]),
      provideHttpClient(),
    ],
  });
}

const EN: Record<string, string> = {
  'rec.list.badge.agronomist': 'Agronomist segment',
  'rec.list.badge.grower': 'Grower segment',
  'rec.list.heading': 'Recommendations',
  'rec.list.subtitle.agronomist': 'Manage agronomic recommendations: review, approve and publish for your growers.',
  'rec.list.subtitle.grower': 'View agronomic recommendations published by your agronomist.',
  'rec.list.counter': 'recommendations',
  'rec.list.tab.pending': 'Pending',
  'rec.list.tab.published': 'Published',
  'rec.list.newButton': '+ New',
  'rec.list.loading': 'Loading recommendations...',
  'rec.list.emptyPending': 'No pending',
  'rec.list.emptyPendingDesc': 'No recommendations require review.',
  'rec.list.emptyPublished': 'No published',
  'rec.list.emptyPublishedDesc': 'No recommendations have been published yet.',
  'rec.list.createFirst': 'Create first recommendation',
  'rec.list.priority.critical': 'Critical',
  'rec.list.priority.high': 'High',
  'rec.list.priority.medium': 'Medium',
  'rec.list.priority.low': 'Low',
  'rec.list.status.draft': 'Draft',
  'rec.list.status.pendingReview': 'Pending review',
  'rec.list.status.approved': 'Approved',
  'rec.list.status.published': 'Published',
};

// ═══════════════════════════════════════════════════════════════════════
//  SPANISH TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('RecommendationListComponent — i18n (Spanish)', () => {
  it('should show Spanish heading and badge for agronomist', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Recomendaciones');
    expect(el.textContent).toContain('Segmento agronomo');
  });

  it('should show Spanish subtitle for agronomist', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Gestiona las recomendaciones agronomicas');
  });

  it('should show Spanish tab labels and counter', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pendientes');
    expect(el.textContent).toContain('Publicadas');
    expect(el.textContent).toContain('recomendaciones');
    expect(el.textContent).toContain('+ Nueva');
  });

  it('should show Spanish loading text', async () => {
    const store = createMockStore({ recommendationsLoading: () => true });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cargando recomendaciones');
  });

  it('should show Spanish empty state for pending tab', async () => {
    const store = createMockStore({ isAgronomist: () => true, recommendations: signal([]) });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.componentInstance.selectTab('pending');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sin pendientes');
    expect(el.textContent).toContain('No hay recomendaciones que requieran revision');
  });

  it('should show Spanish empty state for published tab', async () => {
    const store = createMockStore({ isAgronomist: () => true, recommendations: signal([]) });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.componentInstance.selectTab('published');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sin publicadas');
    expect(el.textContent).toContain('Aun no se han publicado recomendaciones');
  });

  it('should show Spanish create first button in empty state', async () => {
    const store = createMockStore({ isAgronomist: () => true, recommendations: signal([]) });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.componentInstance.selectTab('pending');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Crear primera recomendacion');
  });

  it('should show Spanish priority labels on cards', async () => {
    const store = createMockStore({
      recommendations: signal([
        { id: 1, title: 'Test', description: 'Desc', priority: 'critical', status: 'published', plantationName: 'Finca 1', zoneName: 'Zona A', createdAt: '2025-06-01', recommendationType: 'manual' },
      ]),
    });
    await setupTestBed('es', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Critica');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  ENGLISH TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('RecommendationListComponent — i18n (English)', () => {
  beforeAll(() => {
    loadTranslations(EN);
  });

  it('should show English heading and badge for agronomist', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Recommendations');
    expect(el.textContent).toContain('Agronomist segment');
  });

  it('should show English tab labels', async () => {
    const store = createMockStore({ isAgronomist: () => true });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pending');
    expect(el.textContent).toContain('Published');
  });

  it('should show English loading text', async () => {
    const store = createMockStore({ recommendationsLoading: () => true });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Loading recommendations');
  });

  it('should show English empty state for pending', async () => {
    const store = createMockStore({ isAgronomist: () => true, recommendations: signal([]) });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.componentInstance.selectTab('pending');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No pending');
  });

  it('should show English priority label', async () => {
    const store = createMockStore({
      recommendations: signal([
        { id: 1, title: 'Test', description: 'Desc', priority: 'critical', status: 'published', plantationName: 'Farm 1', zoneName: 'Zone A', createdAt: '2025-06-01', recommendationType: 'manual' },
      ]),
    });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Critical');
  });

  it('should show English status labels', async () => {
    const store = createMockStore({
      recommendations: signal([
        { id: 1, title: 'Test', description: 'Desc', priority: 'medium', status: 'published', plantationName: 'Farm 1', zoneName: 'Zone A', createdAt: '2025-06-01', recommendationType: 'manual' },
      ]),
    });
    await setupTestBed('en', store).compileComponents();
    const fixture = TestBed.createComponent(RecommendationListComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Published');
  });
});
