import { Injectable, inject, signal } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/auth-response.model';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _http = inject(HttpService);
  private _router = inject(Router);

  private readonly ACCESS_TOKEN_KEY = 'iFC03fkUWhcdYGciaclPyeqySdQE6qCd';
  private readonly REFRESH_TOKEN_KEY = 'LXP6usaZ340gDciGr69MQpPwpEdvPj9M';
  private readonly ROLE_KEY = '9JeQyQTsI03hbuMtl9tR1TjbOFGWf54p';
  private readonly EXPIRATION_KEY = 'z6ipay7ciaSpZQbb6cDLueVAAs0WtRjs';

  private readonly _isAuthenticated = signal<boolean>(this.hasValidToken());
  private readonly _userRole = signal<string>(this.getRole());

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly userRole = this._userRole.asReadonly();

  login(
    email: string,
    password: string,
    twoFactorCode: string | null = null,
    rememberMe: boolean = false
  ): Observable<AuthResponse> {
    const credentials = {
      email,
      password,
      twoFactorCode,
      rememberMe,
    };

    return this._http.post<AuthResponse>('auth/login', credentials).pipe(
      tap((response) => {
        if (!response.requiresTwoFactor) {
          this.handleAuthResponse(response);
        }
      }),
      catchError((error) =>
        throwError(
          () =>
            new Error('Authentication failed. Please check your credentials.')
        )
      )
    );
  }

  logout(): void {
    if (this.getRefreshToken()) {
      this._http.post<void>('auth/logout', {}).subscribe({
        error: () => {},
      });
    }

    this.clearAuthData();
    this._isAuthenticated.set(false);
    this._userRole.set('');

    this._router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const body = { refreshToken: refreshToken };

    return this._http.post<AuthResponse>('auth/refresh-token', body).pipe(
      tap((response) => this.handleAuthResponse(response)),
      catchError((error) => {
        this.clearAuthData();
        this._isAuthenticated.set(false);
        this._userRole.set('');
        return throwError(
          () => new Error('Session expired. Please log in again.')
        );
      })
    );
  }

  hasRole(requiredRole: string): boolean {
    const userRole = this.getRole();
    return userRole === requiredRole;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getRole(): string {
    return localStorage.getItem(this.ROLE_KEY) || '';
  }

  getTokenExpiration(): number {
    const expString = localStorage.getItem(this.EXPIRATION_KEY);
    if (!expString) {
      console.warn('No expiration found in localStorage');
    }
    return expString ? parseInt(expString, 10) : 0;
  }

  isAuthorized(){
    return this._http.get('users/is-authorized').pipe(())
  }

  private handleAuthResponse(response: AuthResponse): void {
    if (response && response.accessToken) {
      this.storeAuthData(response);
      this._isAuthenticated.set(true);
      this._userRole.set(response.role);
    }
  }

  private storeAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, authData.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
    localStorage.setItem(this.ROLE_KEY, authData.role);
    localStorage.setItem(this.EXPIRATION_KEY, `${authData.exp}`);
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.EXPIRATION_KEY);
  }
}
