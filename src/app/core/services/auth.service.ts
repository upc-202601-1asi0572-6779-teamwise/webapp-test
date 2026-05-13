import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth-response.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly currentUser$ = new BehaviorSubject<User | null>(this.loadUser());
  readonly user$ = this.currentUser$.asObservable();

  get isAuthenticated(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.currentUser$.value;
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/login`, request).pipe(
      tap((res) => this.persist(res)),
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/register`, request).pipe(
      tap((res) => this.persist(res)),
    );
  }

  recoverPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/recover-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/reset-password`, {
      token,
      newPassword,
    });
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
    this.currentUser$.next(null);
  }

  private persist(res: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    this.currentUser$.next(res.user);
  }

  private loadUser(): User | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('accessToken');
  }
}
