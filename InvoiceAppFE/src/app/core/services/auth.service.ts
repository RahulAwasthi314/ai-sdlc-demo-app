import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserSession, UserRole, LoginResponse } from '../models/user-session.model';

/**
 * Service managing user authentication, role signals, and session state.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessionState = signal<UserSession | null>(this.loadSession());

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly userRole = computed(() => this.sessionState()?.role ?? null);
  readonly username = computed(() => this.sessionState()?.username ?? null);

  private loadSession(): UserSession | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem('session');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
      tap((res) => {
        const session: UserSession = {
          token: res.token,
          username: res.username,
          role: res.role as UserRole,
        };
        this.sessionState.set(session);
        sessionStorage.setItem('session', JSON.stringify(session));

        if (session.role === 'Manager' || session.role === 'Approver') {
          this.router.navigate(['/approvals']);
        } else {
          this.router.navigate(['/invoices']);
        }
      })
    );
  }

  logout(): void {
    const token = this.sessionState()?.token;
    if (token) {
      this.http.post('/api/auth/logout', {}).subscribe({ error: () => {} });
    }
    this.sessionState.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('session');
    }
    this.router.navigate(['/']);
  }
}
