import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { API_BASE_URL } from './api.constants';
import { LoginRequest, RegisterRequest, UserProfile } from './models';

interface LoginResponse {
  token: string;
}

const TOKEN_STORAGE_KEY = 'task-manager-token';
const USER_STORAGE_KEY = 'task-manager-username';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  private readonly usernameState = signal<string | null>(localStorage.getItem(USER_STORAGE_KEY));

  readonly token = computed(() => this.tokenState());
  readonly username = computed(() => this.usernameState());
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<void> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/login/`, payload).pipe(
      tap(({ token }) => this.persistAuth(token, payload.username)),
      map(() => void 0)
    );
  }

  register(payload: RegisterRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${API_BASE_URL}/register/`, payload);
  }

  logout(): Observable<void> {
    if (!this.tokenState()) {
      this.clearAuth();
      return of(void 0);
    }

    return this.http.post(`${API_BASE_URL}/logout/`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.clearAuth()),
      map(() => void 0)
    );
  }

  private persistAuth(token: string, username: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, username);
    this.tokenState.set(token);
    this.usernameState.set(username);
  }

  private clearAuth(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.tokenState.set(null);
    this.usernameState.set(null);
  }
}