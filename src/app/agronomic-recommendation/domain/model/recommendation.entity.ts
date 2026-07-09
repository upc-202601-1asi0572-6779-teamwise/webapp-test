/**
 * Recommendation domain model for presentation.
 * Built from backend RecommendationResource (content, type, status, dates only).
 * Extra UI fields are derived — never assumed from the mock shape.
 */
export interface Recommendation {
  id: number;
  plantationId: number;
  /** Raw backend content (source of truth). */
  content: string;
  /** Backend type string, e.g. Manual. */
  type: string;
  /**
   * UI status mapped from backend:
   * Pending → pending_review | Approved → approved | Published → published
   */
  status: 'draft' | 'pending_review' | 'approved' | 'published';
  createdAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
  /** Stable key when backend omits id. */
  clientKey: string;

  // ── Derived for display (may be empty when not in content) ──
  title: string;
  description: string;
  recommendedAction: string;
  /** Only meaningful if hasExplicitPriority. */
  priority: 'low' | 'medium' | 'high' | 'critical';
  hasExplicitPriority: boolean;
  hasExplicitAction: boolean;
  /** Plantation label for UI (demo or path id). */
  plantationName: string;
  /** Zone is NOT in backend resource — only show if derived from content. */
  zoneName: string;
  hasZone: boolean;
  /** Always manual from backend today. */
  generatedBy: 'ai' | 'manual';
  reviewedByAgronomistName: string | null;

  // Kept for gradual UI compatibility (always null/0 from real API)
  userId: number;
  monitoringZoneId: number;
  alertId: number | null;
  alertTitle: string | null;
  reviewedByAgronomistId: number | null;
  updatedAt: string;
}

export interface RecommendationListResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  recommendations: Recommendation[];
}

/** Form fields composed into backend `{ agronomistId, content }`. */
export interface CreateRecommendationRequest {
  plantationId: number;
  monitoringZoneId: number;
  alertId?: number | null;
  title: string;
  description: string;
  recommendedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  generatedBy: 'ai' | 'manual';
}

export interface AgronomicIntervention {
  id: number | null;
  description: string;
  performedBy: string;
  executionDate: string;
  createdAt: string;
}

export interface RegisterInterventionRequest {
  description: string;
  performedBy: string;
  executionDate: string;
}
