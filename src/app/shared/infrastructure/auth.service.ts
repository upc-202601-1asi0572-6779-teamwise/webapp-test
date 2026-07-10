import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../domain/auth-response.model';
import { User } from '../domain/user.model';
import { decodeJwtPayload, userIdFromToken } from './jwt.util';

const TOKEN_KEY = 'smartpalm_access_token_v1';
const USER_KEY = 'smartpalm_user_v1';
const LEGACY_KEYS = ['accessToken', 'user', 'smartpalm_demo_users_v1'];

/** Backend POST /authentication/sign-in response (IAM docs 2026-07-10). */
interface SignInApiResponse {
  userId: number;
  username: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Hydrate from storage only — no auto-login.
   * Real JWT required when demoAuth is off.
   */
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  private readonly currentUser$ = new BehaviorSubject<User | null>(null);
  readonly user$ = this.currentUser$.asObservable();

  constructor() {
    const stored = this.readStoredSession();
    if (stored) {
      this.setUser(stored.user);
    }
  }

  get isAuthenticated(): boolean {
    if (environment.demoAuth) {
      return !!this._user();
    }
    return !!this._user() && !!this.getToken();
  }

  get currentUser(): User | null {
    return this._user();
  }

  private setUser(user: User | null): void {
    this._user.set(user);
    this.currentUser$.next(user);
  }

  /**
   * POST /api/v1/authentication/sign-in
   * Body: { username, password } (camelCase)
   * 200: { userId, username, token }
   */
  login(request: LoginRequest): Observable<AuthResponse> {
    const username = (request.username ?? request.email ?? '').trim();
    const password = request.password ?? '';

    return this.http
      .post<SignInApiResponse>(`${environment.apiUrl}/authentication/sign-in`, {
        username,
        password,
      })
      .pipe(
        map((body) => this.mapSignInToAuthResponse(body)),
        tap((res) => this.persist(res)),
      );
  }

  /** Public sign-up removed from product — users are created by admin only. */
  register(_request?: unknown): Observable<AuthResponse> {
    return new Observable((sub) => {
      sub.error({
        status: 404,
        message: 'El registro público no está disponible. Contacta a un administrador.',
      });
    });
  }

  recoverPassword(_email: string): Observable<{ message: string }> {
    return new Observable((sub) => {
      sub.error({
        status: 501,
        message: 'Recuperación de contraseña no disponible en el backend actual.',
      });
    });
  }

  resetPassword(_token: string, _newPassword: string): Observable<{ message: string }> {
    return new Observable((sub) => {
      sub.error({
        status: 501,
        message: 'Restablecimiento de contraseña no disponible en el backend actual.',
      });
    });
  }

  patchCurrentUser(partial: Partial<User>): User | null {
    const current = this._user();
    if (!current) return null;
    const updated = { ...current, ...partial };
    if (this.isBrowser) {
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
    this.setUser(updated);
    return updated;
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    }
    this.setUser(null);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem('accessToken');
    if (!token || token.startsWith('demo-token') || token === 'pending-real-token') return null;
    // Prefer real JWTs (3 segments)
    if (token.split('.').length !== 3) return null;
    return token;
  }

  private persist(res: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    }
    this.setUser(res.user);
  }

  private readStoredSession(): { user: User } | null {
    if (!this.isBrowser) return null;
    this.clearLegacyIfNeeded();
    // Require a real token when not in demo mode
    if (!environment.demoAuth && !this.getToken()) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return { user: JSON.parse(raw) as User };
    } catch {
      return null;
    }
  }

  private clearLegacyIfNeeded(): void {
    if (!this.isBrowser) return;
    if (localStorage.getItem(USER_KEY) || localStorage.getItem(TOKEN_KEY)) {
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    }
  }

  private mapSignInToAuthResponse(body: SignInApiResponse): AuthResponse {
    const token = body.token;
    const id = body.userId || userIdFromToken(token) || 0;
    const username = body.username || '';
    const role = this.resolveRole(token, username);
    const profile = this.knownSeedProfile(username, id);

    const user: User = {
      id,
      email: profile.email,
      fullName: profile.fullName,
      role,
      phone: '',
      region: '',
      city: '',
      avatarUrl: null,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
    };

    return { accessToken: token, user };
  }

  /**
   * Sign-in only returns { userId, username, token }. Enrich UI from known seed
   * profiles when present (local/dev); otherwise derive from username.
   */
  private knownSeedProfile(
    username: string,
    userId: number,
  ): { email: string; fullName: string } {
    const key = username.trim().toLowerCase();
    const seeds: Record<string, { email: string; fullName: string }> = {
      agronomist01: {
        email: 'agro1@smartpalm.com',
        fullName: 'Agronomist One',
      },
      admin: {
        email: 'admin@smartpalm.com',
        fullName: 'Administrator',
      },
      palmgrower01: {
        email: 'grower1@smartpalm.com',
        fullName: 'Palm Grower One',
      },
    };
    if (seeds[key]) return seeds[key];
    if (userId === environment.demo.agronomistId) {
      return {
        email: 'agro1@smartpalm.com',
        fullName: 'Agronomist One',
      };
    }
    return {
      email: username.includes('@') ? username : `${username}@smartpalm.local`,
      fullName: username,
    };
  }

  /**
   * JWT from TokenService only includes Sid + Name (no role claim).
   * This product is the agronomist console: default role is agronomist.
   * If a role claim appears later, map it.
   */
  private resolveRole(token: string, username: string): User['role'] {
    const payload = decodeJwtPayload(token);
    const raw =
      (payload?.role as string | undefined) ||
      (payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined) ||
      '';
    const normalized = raw.toLowerCase().replace(/\s+/g, '');
    if (normalized.includes('grower') || normalized === 'palmgrower') return 'palm_grower';
    if (normalized.includes('agronom')) return 'agronomist';
    // Username heuristic for seed users without role claim
    const u = username.trim().toLowerCase();
    if (u.includes('grower') || u === 'palmgrower01') return 'palm_grower';
    if (u.includes('agronom') || u === 'agronomist01') return 'agronomist';
    // Agronomist web app default (admin/grower should use other clients)
    return 'agronomist';
  }
}
