import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-recommendation-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recommendation-form.component.html',
})
export class RecommendationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly store = inject(AgronomicRecommendationStore);
  private readonly t = inject(TranslationService);

  readonly form = this.fb.nonNullable.group({
    plantationId: [0, [Validators.required, Validators.min(1)]],
    monitoringZoneId: [0],
    alertId: [0],
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    recommendedAction: [''],
    priority: ['medium' as 'low' | 'medium' | 'high' | 'critical', [Validators.required]],
  });

  get backLabel(): string { return this.t.translate('rec.form.back'); }
  get loadingText(): string { return this.t.translate('rec.form.loading'); }
  get titleText(): string { return this.t.translate('rec.form.title'); }
  get subtitleText(): string { return this.t.translate('rec.form.subtitle'); }
  get plantationLabel(): string { return this.t.translate('rec.form.plantation'); }
  get plantationPlaceholder(): string { return this.t.translate('rec.form.plantationPlaceholder'); }
  get titleFieldLabel(): string { return this.t.translate('rec.form.titleInput'); }
  get titlePlaceholder(): string { return this.t.translate('rec.form.titlePlaceholder'); }
  get descriptionLabel(): string { return this.t.translate('rec.form.description'); }
  get descriptionPlaceholder(): string { return this.t.translate('rec.form.descriptionPlaceholder'); }
  get actionLabel(): string { return this.t.translate('rec.form.recommendedAction'); }
  get actionOptionalLabel(): string { return this.t.translate('rec.form.actionOptional'); }
  get actionPlaceholder(): string { return this.t.translate('rec.form.actionPlaceholder'); }
  get priorityLabel(): string { return this.t.translate('rec.form.priority'); }
  get priorityInTextLabel(): string { return this.t.translate('rec.form.priorityInText'); }
  get saveDraftLabel(): string { return this.t.translate('rec.form.save'); }
  get savingLabel(): string { return this.t.translate('rec.form.saving'); }
  get cancelLabel(): string { return this.t.translate('rec.form.cancel'); }

  priorityOptionLabel(level: string): string {
    const map: Record<string, string> = {
      low: this.t.translate('rec.form.priorityLow'),
      medium: this.t.translate('rec.form.priorityMedium'),
      high: this.t.translate('rec.form.priorityHigh'),
      critical: this.t.translate('rec.form.priorityCritical'),
    };
    return map[level] ?? level;
  }

  ngOnInit(): void {
    this.store.loadPlantationsForForm();
    this.form.controls.monitoringZoneId.clearValidators();
    this.form.controls.monitoringZoneId.updateValueAndValidity();

    this.form.controls.plantationId.valueChanges.subscribe((id) => {
      if (id > 0) {
        this.store.loadZonesAndAlertsForForm(Number(id));
      } else {
        this.store.recommendationFormZones.set([]);
        this.store.recommendationFormAlerts.set([]);
      }
    });

    const demoId = this.store.recommendationFormPlants()[0]?.id;
    if (demoId) {
      this.form.patchValue({ plantationId: demoId, monitoringZoneId: 1 });
      this.store.loadZonesAndAlertsForForm(demoId);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      plantationId: Number(raw.plantationId) || 0,
      monitoringZoneId: Number(raw.monitoringZoneId) || 0,
      alertId: null as number | null,
      title: raw.title,
      description: raw.description,
      recommendedAction: raw.recommendedAction || '',
      priority: raw.priority,
      generatedBy: 'manual' as const,
    };
    if (!payload.plantationId) {
      this.form.controls.plantationId.setErrors({ min: true });
      this.form.markAllAsTouched();
      return;
    }

    this.store.createRecommendation(payload).subscribe({
      next: (rec) => {
        if (rec.id > 0) this.router.navigate(['/recomendaciones', rec.id]);
        else this.router.navigate(['/recomendaciones']);
      },
    });
  }
}
