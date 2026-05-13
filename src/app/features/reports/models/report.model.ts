export interface Report {
  id: number;
  userId: number;
  agronomistName: string;
  plantationId: number;
  plantationName: string;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
}

export interface ReportListResponse {
  totalElements: number;
  totalPages: number;
  page: number;
  reports: Report[];
}
