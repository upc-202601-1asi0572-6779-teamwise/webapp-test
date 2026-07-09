import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, catchError, concatMap, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgronomicIntervention,
  CreateRecommendationRequest,
  Recommendation,
  RecommendationListResponse,
  RegisterInterventionRequest,
} from '../domain/model/recommendation.entity';
import {
  CreateRecommendationBackendBody,
  InterventionBackendDto,
  RecommendationBackendDto,
} from './recommendation.response';
import {
  composeRecommendationContent,
  interventionFromBackend,
  recommendationFromBackend,
  toBackendStatusFilter,
} from './recommendation.assembler';
import { parseLocationIdFromHeaders } from '../../shared/infrastructure/location-id.util';
import { lookupRecommendationId, rememberRecommendationId } from './recommendation-id-registry';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly http = inject(HttpClient);

  private plantationBase(plantationId: number): string {
    return `${environment.apiUrl}/plantations/${plantationId}/recommendations`;
  }

  list(params?: {
    status?: string;
    plantationId?: number;
    agronomistId?: number;
    page?: number;
    size?: number;
  }): Observable<RecommendationListResponse> {
    const plantationId = params?.plantationId ?? environment.demo.plantationId;
    const query = new URLSearchParams();
    const status = toBackendStatusFilter(params?.status);
    if (status) query.set('status', status);
    if (params?.agronomistId !== undefined) query.set('agronomistId', String(params.agronomistId));
    const suffix = query.size ? `?${query.toString()}` : '';

    return this.http.get<RecommendationBackendDto[]>(`${this.plantationBase(plantationId)}${suffix}`).pipe(
      concatMap((items) => {
        const dtos = items ?? [];
        const unresolved = dtos.filter((dto) => !lookupRecommendationId(dto.content, dto.createdAt));
        // Backend list omits ids. Resolve missing ones with one shared probe batch (not N probes).
        const enrich$ = unresolved.length
          ? this.buildContentIdIndex(plantationId)
          : of(new Map<string, number>());

        return enrich$.pipe(
          map((index) => {
            const recommendations = dtos.map((dto) => {
              let id = lookupRecommendationId(dto.content, dto.createdAt);
              if (!id) {
                const key = `${dto.createdAt}::${(dto.content ?? '').trim()}`;
                id = index.get(key) ?? index.get((dto.content ?? '').trim()) ?? 0;
                if (id) rememberRecommendationId(dto.content, dto.createdAt, id);
              }
              return recommendationFromBackend(dto, {
                id,
                plantationId,
                agronomistId: environment.demo.agronomistId,
              });
            });
            return {
              totalElements: recommendations.length,
              totalPages: 1,
              page: 1,
              recommendations,
            };
          }),
        );
      }),
    );
  }

  /**
   * Parallel GET by candidate id → map content(+createdAt) to numeric id.
   * Soft-fails individual 404s. Caps at 30 to limit noise.
   */
  private buildContentIdIndex(plantationId: number): Observable<Map<string, number>> {
    const candidates = Array.from({ length: 30 }, (_, i) => i + 1);
    const requests = candidates.map((candidateId) =>
      this.http.get<RecommendationBackendDto>(`${this.plantationBase(plantationId)}/${candidateId}`).pipe(
        map((dto) => ({ id: candidateId, dto })),
        catchError(() => of(null)),
      ),
    );
    return forkJoin(requests).pipe(
      map((hits) => {
        const index = new Map<string, number>();
        for (const hit of hits) {
          if (!hit?.dto) continue;
          const content = (hit.dto.content ?? '').trim();
          if (!content) continue;
          index.set(content, hit.id);
          if (hit.dto.createdAt) {
            index.set(`${hit.dto.createdAt}::${content}`, hit.id);
            rememberRecommendationId(hit.dto.content, hit.dto.createdAt, hit.id);
          }
        }
        return index;
      }),
    );
  }

  getById(id: number, plantationId: number = environment.demo.plantationId): Observable<Recommendation> {
    return this.http.get<RecommendationBackendDto>(`${this.plantationBase(plantationId)}/${id}`).pipe(
      map((dto) => {
        rememberRecommendationId(dto.content, dto.createdAt, id);
        return recommendationFromBackend(dto, {
          id,
          plantationId,
          agronomistId: environment.demo.agronomistId,
        });
      }),
    );
  }

  create(request: CreateRecommendationRequest): Observable<Recommendation> {
    const plantationId = request.plantationId || environment.demo.plantationId;
    const content = composeRecommendationContent({
      title: request.title,
      description: request.description,
      recommendedAction: request.recommendedAction,
      priority: request.priority,
    });
    const body: CreateRecommendationBackendBody = {
      agronomistId: environment.demo.agronomistId,
      content,
    };

    return this.http
      .post<RecommendationBackendDto>(this.plantationBase(plantationId), body, { observe: 'response' })
      .pipe(
        concatMap((res: HttpResponse<RecommendationBackendDto>) => {
          // Location is often not exposed to the browser (CORS) even when present server-side.
          let id = parseLocationIdFromHeaders(res.headers) ?? 0;
          const dto: RecommendationBackendDto = res.body ?? {
            content,
            type: 'Manual',
            status: 'Pending',
            createdAt: new Date().toISOString(),
            approvedAt: null,
            publishedAt: null,
          };

          const finish = (resolvedId: number) => {
            if (resolvedId) rememberRecommendationId(dto.content, dto.createdAt, resolvedId);
            return recommendationFromBackend(dto, {
              id: resolvedId,
              plantationId,
              agronomistId: environment.demo.agronomistId,
            });
          };

          if (id > 0) {
            return of(finish(id));
          }

          // Fallback: probe recent ids until content matches (backend list omits ids).
          return this.probeRecommendationId(plantationId, dto.content, dto.createdAt).pipe(
            map((probed) => finish(probed)),
          );
        }),
      );
  }

  /**
   * When Location is not readable (CORS), resolve id with parallel GETs.
   * Prefer the highest matching id (newest). Soft-fails to 0.
   */
  private probeRecommendationId(
    plantationId: number,
    content: string,
    _createdAt: string,
  ): Observable<number> {
    const needle = content.trim();
    const candidates = Array.from({ length: 20 }, (_, i) => i + 1); // 1..20
    const requests = candidates.map((candidateId) =>
      this.http.get<RecommendationBackendDto>(`${this.plantationBase(plantationId)}/${candidateId}`).pipe(
        map((dto) => (dto?.content?.trim() === needle ? candidateId : 0)),
        catchError(() => of(0)),
      ),
    );
    return forkJoin(requests).pipe(
      map((ids) => {
        const hits = ids.filter((id) => id > 0);
        return hits.length ? Math.max(...hits) : 0;
      }),
    );
  }

  updateContent(
    id: number,
    content: string,
    plantationId: number = environment.demo.plantationId,
  ): Observable<Recommendation> {
    return this.http
      .patch<RecommendationBackendDto>(`${this.plantationBase(plantationId)}/${id}`, { content })
      .pipe(
        map((dto) => {
          rememberRecommendationId(dto.content, dto.createdAt, id);
          return recommendationFromBackend(dto, {
            id,
            plantationId,
            agronomistId: environment.demo.agronomistId,
          });
        }),
      );
  }

  approve(id: number, plantationId: number = environment.demo.plantationId): Observable<Recommendation> {
    return this.http
      .patch<RecommendationBackendDto>(`${this.plantationBase(plantationId)}/${id}/approval`, {})
      .pipe(
        map((dto) => {
          rememberRecommendationId(dto.content, dto.createdAt, id);
          return recommendationFromBackend(dto, {
            id,
            plantationId,
            agronomistId: environment.demo.agronomistId,
          });
        }),
      );
  }

  publish(id: number, plantationId: number = environment.demo.plantationId): Observable<Recommendation> {
    return this.http
      .patch<RecommendationBackendDto>(`${this.plantationBase(plantationId)}/${id}/publication`, {})
      .pipe(
        map((dto) => {
          rememberRecommendationId(dto.content, dto.createdAt, id);
          return recommendationFromBackend(dto, {
            id,
            plantationId,
            agronomistId: environment.demo.agronomistId,
          });
        }),
      );
  }

  listInterventions(
    recommendationId: number,
    plantationId: number = environment.demo.plantationId,
  ): Observable<AgronomicIntervention[]> {
    return this.http
      .get<InterventionBackendDto[]>(
        `${this.plantationBase(plantationId)}/${recommendationId}/interventions`,
      )
      .pipe(map((items) => (items ?? []).map((dto) => interventionFromBackend(dto))));
  }

  registerIntervention(
    recommendationId: number,
    request: RegisterInterventionRequest,
    plantationId: number = environment.demo.plantationId,
  ): Observable<AgronomicIntervention> {
    return this.http
      .post<InterventionBackendDto>(
        `${this.plantationBase(plantationId)}/${recommendationId}/interventions`,
        request,
        { observe: 'response' },
      )
      .pipe(
        map((res) => {
          const id = parseLocationIdFromHeaders(res.headers);
          const dto = res.body ?? {
            description: request.description,
            performedBy: request.performedBy,
            executionDate: request.executionDate,
            createdAt: new Date().toISOString(),
          };
          return interventionFromBackend(dto, id);
        }),
      );
  }
}
