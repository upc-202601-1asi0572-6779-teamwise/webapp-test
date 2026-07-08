import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AgronomicRecommendationStore } from '../../../application/agronomic-recommendation.store';

@Component({
  selector: 'app-recommendation-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recommendation-form.component.html',
})
export class RecommendationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly store = inject(AgronomicRecommendationStore);

  private aiUsed = false;

  readonly form = this.fb.nonNullable.group({
    plantationId: [0, [Validators.required, Validators.min(1)]],
    monitoringZoneId: [0, [Validators.required, Validators.min(1)]],
    alertId: [0],
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    recommendedAction: ['', [Validators.required]],
    priority: ['medium' as 'low' | 'medium' | 'high' | 'critical', [Validators.required]],
  });

  // ── i18n getters/methods ──

  get backLabel(): string {
    return $localize`:@@rec.form.back:Volver a recomendaciones`;
  }

  get loadingText(): string {
    return $localize`:@@rec.form.loading:Cargando formulario...`;
  }

  get titleText(): string {
    return $localize`:@@rec.form.title:Nueva recomendacion`;
  }

  get subtitleText(): string {
    return $localize`:@@rec.form.subtitle:Genera una recomendacion agronomica vinculada a una alerta activa o redactala manualmente.`;
  }

  get plantationLabel(): string {
    return $localize`:@@rec.form.plantation:Plantacion`;
  }

  get plantationPlaceholder(): string {
    return $localize`:@@rec.form.plantationPlaceholder:Selecciona una plantacion`;
  }

  get zoneLabel(): string {
    return $localize`:@@rec.form.zone:Zona`;
  }

  get zonePlaceholder(): string {
    return $localize`:@@rec.form.zonePlaceholder:Selecciona una zona`;
  }

  get zoneLoadingText(): string {
    return $localize`:@@rec.form.zoneLoading:Cargando zonas...`;
  }

  get alertLabel(): string {
    return $localize`:@@rec.form.alert:Alerta relacionada (opcional)`;
  }

  get alertNoneLabel(): string {
    return $localize`:@@rec.form.alertNone:Sin alerta vinculada`;
  }

  get titleFieldLabel(): string {
    return $localize`:@@rec.form.titleInput:Titulo`;
  }

  get titlePlaceholder(): string {
    return $localize`:@@rec.form.titlePlaceholder:Ej. Aplicar enmienda calcica en Zona Sur`;
  }

  get descriptionLabel(): string {
    return $localize`:@@rec.form.description:Descripcion`;
  }

  get descriptionPlaceholder(): string {
    return $localize`:@@rec.form.descriptionPlaceholder:Describe el contexto y la justificacion de la recomendacion...`;
  }

  get actionLabel(): string {
    return $localize`:@@rec.form.recommendedAction:Accion recomendada`;
  }

  get actionPlaceholder(): string {
    return $localize`:@@rec.form.actionPlaceholder:Ej. Aplicar cal dolomitica (2 ton/ha)`;
  }

  get priorityLabel(): string {
    return $localize`:@@rec.form.priority:Prioridad`;
  }

  priorityOptionLabel(level: string): string {
    const labels: Record<string, string> = {
      low: $localize`:@@rec.form.priority.low:Baja`,
      medium: $localize`:@@rec.form.priority.medium:Media`,
      high: $localize`:@@rec.form.priority.high:Alta`,
      critical: $localize`:@@rec.form.priority.critical:Critica`,
    };
    return labels[level] ?? level;
  }

  get generateAiLabel(): string {
    return $localize`:@@rec.form.generateAI:Generar con IA`;
  }

  get saveDraftLabel(): string {
    return $localize`:@@rec.form.saveDraft:Guardar borrador`;
  }

  get savingLabel(): string {
    return $localize`:@@rec.form.saving:Guardando...`;
  }

  get cancelLabel(): string {
    return $localize`:@@rec.form.cancel:Cancelar`;
  }

  ngOnInit(): void {
    this.store.loadPlantationsForForm();
    this.form.controls.plantationId.valueChanges.subscribe((id) => {
      if (id > 0) {
        this.store.loadZonesAndAlertsForForm(id);
      } else {
        this.store.recommendationFormZones.set([]);
        this.store.recommendationFormAlerts.set([]);
        this.form.controls.monitoringZoneId.setValue(0);
        this.form.controls.alertId.setValue(0);
      }
    });
  }

  generateWithAI(): void {
    const alertId = this.form.controls.alertId.value;
    if (alertId > 0) {
      const alert = this.store.recommendationFormAlerts().find((a) => a.id === alertId);
      if (alert) {
        this.form.patchValue({
          title: `${alert.title} — Recomendacion`,
          description: `Tras analizar la alerta "${alert.title}" en ${alert.zoneName}, se recomienda tomar acciones correctivas para normalizar el parametro ${alert.label} que actualmente registra ${alert.triggeredValue} (rango esperado: ${alert.thresholdMin} - ${alert.thresholdMax}).`,
          recommendedAction: `Revisar ${alert.label} en ${alert.zoneName} y aplicar medidas correctivas segun protocolo agronomico.`,
          priority: alert.alertLevel === 'critical' ? 'critical' : alert.alertLevel === 'warning' ? 'high' : 'medium',
        });
        this.aiUsed = true;
        return;
      }
    }
    const zone = this.store.recommendationFormZones().find((z) => z.id === this.form.controls.monitoringZoneId.value);
    if (zone) {
      this.form.patchValue({
        title: `Monitoreo programado — ${zone.name}`,
        description: `Se recomienda realizar una inspeccion de rutina en ${zone.name} para evaluar el estado general del cultivo, verificando parametros de suelo, humedad y sanidad vegetal.`,
        recommendedAction: `Programar visita de inspeccion a ${zone.name} en los proximos 7 dias.`,
      });
      this.aiUsed = true;
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      plantationId: raw.plantationId,
      monitoringZoneId: raw.monitoringZoneId,
      alertId: raw.alertId > 0 ? raw.alertId : null,
      title: raw.title,
      description: raw.description,
      recommendedAction: raw.recommendedAction,
      priority: raw.priority,
      generatedBy: this.aiUsed ? ('ai' as const) : ('manual' as const),
    };

    this.store.createRecommendation(payload).subscribe({
      next: (rec) => this.router.navigate(['/recomendaciones', rec.id]),
    });
  }
}
