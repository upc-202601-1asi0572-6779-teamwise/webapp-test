import { Recommendation, AgronomicIntervention } from '../domain/model/recommendation.entity';
import { InterventionBackendDto, RecommendationBackendDto } from './recommendation.response';

const STATUS_TO_UI: Record<string, Recommendation['status']> = {
  Pending: 'pending_review',
  Approved: 'approved',
  Published: 'published',
  pending_review: 'pending_review',
  approved: 'approved',
  published: 'published',
  draft: 'draft',
};

/**
 * Query-string filter values expected by the live API (lowercase).
 * Response body still returns PascalCase: Pending | Approved | Published.
 */
const STATUS_TO_BACKEND: Record<string, string> = {
  draft: 'pending',
  pending_review: 'pending',
  approved: 'approved',
  published: 'published',
  Pending: 'pending',
  Approved: 'approved',
  Published: 'published',
  pending: 'pending',
  // tolerate accidental mixed case
  PENDING: 'pending',
  APPROVED: 'approved',
  PUBLISHED: 'published',
};

const PRIORITY_ALIASES: Record<string, Recommendation['priority']> = {
  low: 'low',
  baja: 'low',
  medium: 'medium',
  media: 'medium',
  high: 'high',
  alta: 'high',
  critical: 'critical',
  critica: 'critical',
  crítica: 'critical',
};

export function recommendationClientKey(content: string, createdAt: string): string {
  return `${createdAt}::${content}`;
}

export function toUiStatus(backendStatus: string): Recommendation['status'] {
  return STATUS_TO_UI[backendStatus] ?? 'pending_review';
}

export function toBackendStatusFilter(uiOrBackend: string | undefined): string | undefined {
  if (!uiOrBackend) return undefined;
  return STATUS_TO_BACKEND[uiOrBackend] ?? uiOrBackend;
}

/**
 * Maps backend DTO → domain Recommendation for UI.
 * Does not invent zone/alert/priority unless present in free-text content.
 */
export function recommendationFromBackend(
  dto: RecommendationBackendDto,
  opts: { id?: number; plantationId: number; agronomistId?: number },
): Recommendation {
  const content = (dto.content ?? '').trim();
  const createdAt = dto.createdAt ?? new Date().toISOString();
  const parsed = parseContent(content);

  return {
    id: opts.id ?? 0,
    plantationId: opts.plantationId,
    content,
    type: dto.type || 'Manual',
    status: toUiStatus(dto.status),
    createdAt,
    approvedAt: dto.approvedAt,
    publishedAt: dto.publishedAt,
    clientKey: recommendationClientKey(content, createdAt),
    title: parsed.title,
    description: parsed.description,
    recommendedAction: parsed.action,
    priority: parsed.priority ?? 'medium',
    hasExplicitPriority: parsed.priority !== null,
    hasExplicitAction: parsed.hasAction,
    // Language-neutral labels (UI can prefix via i18n if needed)
    plantationName: `Plantation #${opts.plantationId}`,
    zoneName: parsed.zone ?? '',
    hasZone: !!parsed.zone,
    generatedBy: 'manual',
    reviewedByAgronomistName: dto.approvedAt ? 'Agronomist' : null,
    userId: opts.agronomistId ?? 0,
    monitoringZoneId: 0,
    alertId: null,
    alertTitle: null,
    reviewedByAgronomistId: dto.approvedAt ? (opts.agronomistId ?? null) : null,
    updatedAt: dto.publishedAt ?? dto.approvedAt ?? createdAt,
  };
}

export function interventionFromBackend(
  dto: InterventionBackendDto,
  id: number | null = null,
): AgronomicIntervention {
  return {
    id,
    description: dto.description,
    performedBy: dto.performedBy,
    executionDate: dto.executionDate,
    createdAt: dto.createdAt,
  };
}

/** Compose backend content from form fields (backend only stores free text). */
export function composeRecommendationContent(parts: {
  title: string;
  description: string;
  recommendedAction: string;
  priority?: string;
}): string {
  const lines = [parts.title.trim(), '', parts.description.trim()];
  if (parts.recommendedAction?.trim()) {
    lines.push('', `Acción recomendada: ${parts.recommendedAction.trim()}`);
  }
  if (parts.priority) {
    lines.push(`Prioridad: ${parts.priority}`);
  }
  return lines.join('\n').trim();
}

function parseContent(content: string): {
  title: string;
  description: string;
  action: string;
  hasAction: boolean;
  priority: Recommendation['priority'] | null;
  zone: string | null;
} {
  if (!content) {
    return {
      title: 'Recomendación',
      description: '',
      action: '',
      hasAction: false,
      priority: null,
      zone: null,
    };
  }

  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const title = nonEmpty[0] ?? 'Recomendación';
  const titleShort = title.length > 100 ? `${title.slice(0, 97)}…` : title;

  let action = '';
  let hasAction = false;
  let priority: Recommendation['priority'] | null = null;

  for (const line of nonEmpty) {
    const actionMatch = line.match(/^(?:Acci[oó]n recomendada|Recommended action)\s*:\s*(.+)$/i);
    if (actionMatch) {
      action = actionMatch[1].trim();
      hasAction = true;
      continue;
    }
    const prioMatch = line.match(/^(?:Prioridad|Priority)\s*:\s*(\S+)/i);
    if (prioMatch) {
      const key = prioMatch[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      priority = PRIORITY_ALIASES[key] ?? null;
    }
  }

  // Description = full content (UI can show it as body)
  const description = content;

  // Zone heuristic: "zona X" / "zone X" in first sentence
  const zoneMatch = content.match(/\bzona\s+([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?)/i);
  const zone = zoneMatch ? zoneMatch[0] : null;

  return {
    title: titleShort,
    description,
    action: hasAction ? action : '',
    hasAction,
    priority,
    zone,
  };
}
