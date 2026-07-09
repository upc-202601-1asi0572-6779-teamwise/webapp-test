import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../domain/auth-response.model';
import { User } from '../domain/user.model';
import { userIdFromToken } from './jwt.util';

const TOKEN_KEY = 'smartpalm_access_token_v1';
const USER_KEY = 'smartpalm_user_v1';
/** Local multi-user registry for demoAuth (email → profile). */
const USERS_REGISTRY_KEY = 'smartpalm_demo_users_v1';
const LEGACY_KEYS = ['accessToken', 'user'];

type DemoUserRecord = User & { password?: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Start null; hydrate from storage only (no forced auto-login).
   * User must login or register — required for a coherent agronomist flow.
   * Signal is the source of truth for reactive consumers (computed isAgronomist, etc.).
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

  /** Keep signal + BehaviorSubject in lockstep. */
  private setUser(user: User | null): void {
    this._user.set(user);
    this.currentUser$.next(user);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    if (environment.demoAuth) {
      const registered = this.findDemoUser(request.email);
      if (registered) {
        // Optional password check in demo (lenient if no password stored)
        if (registered.password && registered.password !== request.password) {
          return new Observable((sub) => {
            sub.error({ status: 401, message: 'Credenciales invalidas (modo demo).' });
          });
        }
        const { password: _pw, ...user } = registered;
        const res: AuthResponse = {
          accessToken: 'demo-token-no-backend-users',
          user,
        };
        this.persist(res);
        return of(res);
      }
      // First-time demo login: create agronomist session from email
      const res = this.buildDemoAuthResponse(request, 'agronomist', request.email.split('@')[0] || 'Agrónomo');
      this.persist(res);
      this.upsertDemoUser({ ...res.user, password: request.password });
      return of(res);
    }

    return this.http
      .post<{ username: string; token: string }>(`${environment.apiUrl}/authentication/sign-in`, {
        Username: request.email,
        Password: request.password,
      })
      .pipe(
        map((body) => this.mapSignInToAuthResponse(body, request)),
        tap((res) => this.persist(res)),
      );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    if (environment.demoAuth) {
      const existing = this.findDemoUser(request.email);
      if (existing) {
        return new Observable((sub) => {
          sub.error({ status: 409, message: 'Ya existe una cuenta con ese correo (modo demo).' });
        });
      }

      const user: User = {
        id: this.nextDemoUserId(),
        email: request.email,
        fullName: request.fullName,
        role: request.role,
        phone: request.phone,
        region: request.region,
        city: request.city,
        avatarUrl: null,
        subscriptionId: null,
        createdAt: new Date().toISOString(),
      };
      const res: AuthResponse = {
        accessToken: 'demo-token-no-backend-users',
        user,
      };
      this.upsertDemoUser({ ...user, password: request.password });
      this.persist(res);
      return of(res);
    }

    const role =
      request.role === 'agronomist' ? 'Agronomist' : request.role === 'palm_grower' ? 'PalmGrower' : request.role;

    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/authentication/sign-up`, {
        username: request.email,
        password: request.password,
        email: request.email,
        fullName: request.fullName,
        role,
      })
      .pipe(
        map(() => {
          const user: User = {
            id: environment.demo.agronomistId,
            email: request.email,
            fullName: request.fullName,
            role: request.role,
            phone: request.phone,
            region: request.region,
            city: request.city,
            avatarUrl: null,
            subscriptionId: null,
            createdAt: new Date().toISOString(),
          };
          return { accessToken: 'pending-real-token', user } satisfies AuthResponse;
        }),
        tap((res) => this.persist(res)),
      );
  }

  recoverPassword(email: string): Observable<{ message: string }> {
    if (environment.demoAuth) {
      return of({ message: 'Modo demo: revisa tu bandeja (simulado). Usa login con tu contraseña registrada.' });
    }
    return this.http.post<{ message: string }>(`${environment.apiUrl}/authentication/recover-password`, {
      email,
    });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    if (environment.demoAuth) {
      return of({ message: 'Modo demo: reset no disponible en el backend real.' });
    }
    return this.http.post<{ message: string }>(`${environment.apiUrl}/authentication/reset-password`, {
      token,
      newPassword,
    });
  }

  patchCurrentUser(partial: Partial<User>): User | null {
    const current = this.currentUser$.value;
    if (!current) return null;
    const updated = { ...current, ...partial };
    if (this.isBrowser) {
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      this.upsertDemoUser({ ...updated, password: this.findDemoUser(updated.email)?.password });
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

  private readDemoRegistry(): Record<string, DemoUserRecord> {
    if (!this.isBrowser) return {};
    try {
      const raw = localStorage.getItem(USERS_REGISTRY_KEY);
      return raw ? (JSON.parse(raw) as Record<string, DemoUserRecord>) : {};
    } catch {
      return {};
    }
  }

  private writeDemoRegistry(map: Record<string, DemoUserRecord>): void {
    if (!this.isBrowser) return;
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(map));
  }

  private findDemoUser(email: string): DemoUserRecord | null {
    const key = email.trim().toLowerCase();
    return this.readDemoRegistry()[key] ?? null;
  }

  private upsertDemoUser(user: DemoUserRecord): void {
    const map = this.readDemoRegistry();
    map[user.email.trim().toLowerCase()] = user;
    this.writeDemoRegistry(map);
  }

  private nextDemoUserId(): number {
    const map = this.readDemoRegistry();
    const ids = Object.values(map).map((u) => u.id);
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }

  private mapSignInToAuthResponse(
    body: { username: string; token: string },
    request: LoginRequest,
  ): AuthResponse {
    const id = userIdFromToken(body.token) ?? environment.demo.agronomistId;
    const user: User = {
      id,
      email: request.email || body.username,
      fullName: body.username,
      role: 'agronomist',
      phone: '',
      region: '',
      city: '',
      avatarUrl: null,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
    };
    return { accessToken: body.token, user };
  }

  private buildDemoAuthResponse(
    request: LoginRequest,
    role: User['role'] = 'agronomist',
    fullName?: string,
  ): AuthResponse {
    const user: User = {
      id: environment.demo.agronomistId,
      email: request.email || 'agronomo.demo@smartpalm.io',
      fullName: fullName || 'Agrónomo Demo',
      role,
      phone: '',
      region: '',
      city: '',
      avatarUrl: null,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
    };
    return {
      accessToken: 'demo-token-no-backend-users',
      user,
    };
  }
}
