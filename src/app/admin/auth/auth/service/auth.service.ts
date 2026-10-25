import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { URL_API } from '../../../../environment/environment';
import { ApiResponse } from '../../../../core/api/api-response';

export type UserRole = 'admin' | 'referee' | 'coach';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization_id: number;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<AuthUser | null>(this.loadUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login / logout ──────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${URL_API}/auth`, { email, password }).pipe(
      tap((response) => {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        this.userSubject.next(response.data.user);
      }),
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ── Estado de la sesión ─────────────────────────────────────────────────────

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    return this.userSubject.value;
  }

  /** Hay sesión solo si existe un token que no haya expirado. */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isExpired(token)) {
      this.clearSession();
      return false;
    }
    return true;
  }

  hasRole(...roles: UserRole[]): boolean {
    const user = this.getUser();
    return !!user && roles.includes(user.role);
  }

  // ── Privados ────────────────────────────────────────────────────────────────

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
  }

  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp ? payload.exp * 1000 < Date.now() : false;
    } catch {
      return true;
    }
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
