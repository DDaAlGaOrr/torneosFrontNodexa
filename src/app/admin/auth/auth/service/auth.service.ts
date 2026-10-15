import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/api.interface';
import { URL_API } from '../../../../environment/environment';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'admin_sport' | 'referee' | 'viewer';
    sport: 'soccer' | 'volleyball' | 'basketball' | null;
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

    constructor(
        private http: HttpClient,
        private router: Router,
    ) { }

    // ── Login ─────────────────────────────────────────────────────────────────

    login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
        return this.http.post<ApiResponse<LoginResponse>>(`${URL_API}/auth/login`, { email, password }).pipe(
            tap(response => {
                localStorage.setItem(TOKEN_KEY, response.data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
                this.userSubject.next(response.data.user);
            })
        );
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this.userSubject.next(null);
        this.router.navigate(['/login']);
    }

    // ── Getters ───────────────────────────────────────────────────────────────

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    getUser(): AuthUser | null {
        return this.userSubject.value;
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    // Verifica si el usuario tiene acceso a un deporte específico
    // Admin general (sport = null) tiene acceso a todo
    canAccessSport(sport: 'soccer' | 'volleyball' | 'basketball'): boolean {
        const user = this.getUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.sport === sport;
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private loadUser(): AuthUser | null {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }
}