/** Backend DTO — RecommendationResource (no id field). */
export interface RecommendationBackendDto {
  content: string;
  type: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
}

/** Backend DTO — AgronomicInterventionResource (no id field). */
export interface InterventionBackendDto {
  description: string;
  performedBy: string;
  executionDate: string;
  createdAt: string;
}

export interface CreateRecommendationBackendBody {
  agronomistId: number;
  content: string;
}

export interface UpdateRecommendationContentBody {
  content: string;
}
