import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-section-placeholder',
  template: `
    <section class="min-h-dvh px-6 py-8 sm:px-8 lg:px-10 lg:py-10" style="background: var(--color-bg-page)">
      <div class="rounded-[1.75rem] border px-6 py-7 sm:px-8 sm:py-8" style="min-height: calc(100dvh - 5rem); background: var(--color-bg-surface); border-color: var(--color-border-subtle); box-shadow: var(--shadow-card)">
        <p style="font-family: var(--font-heading); font-size: 0.86rem; letter-spacing: 0.18em; color: var(--color-text-muted)">
          MODULO
        </p>
        <h1 class="mt-3" style="font-family: var(--font-heading); font-size: clamp(2rem, 3vw, 3rem); font-weight: var(--font-weight-bold); line-height: 1.02; color: var(--color-text-primary)">
          {{ title }}
        </h1>
      </div>
    </section>
  `,
})
export class SectionPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'Seccion';
  }
}
