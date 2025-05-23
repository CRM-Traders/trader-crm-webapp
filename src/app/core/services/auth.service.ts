import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpService } from './http.service';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/auth-response.model';
import {
  Observable,
  catchError,
  tap,
  throwError,
  BehaviorSubject,
  of,
  interval,
  Subscription,
  switchMap,
  filter,
  take,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private _http = inject(HttpService);
  private _router = inject(Router);

  private readonly ACCESS_TOKEN_KEY = 'iFC03fkUWhcdYGciaclPyeqySdQE6qCd';
  private readonly REFRESH_TOKEN_KEY = 'LXP6usaZ340gDciGr69MQpPwpEdvPj9M';
  private readonly ROLE_KEY = '9JeQyQTsI03hbuMtl9tR1TjbOFGWf54p';
  private readonly EXPIRATION_KEY = 'z6ipay7ciaSpZQbb6cDLueVAAs0WtRjs';

  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private tokenCheckInterval: Subscription | null = null;

  private readonly _isAuthenticated = signal<boolean>(this.hasValidToken());
  private readonly _userRole = signal<string>(this.getRole());

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly userRole = this._userRole.asReadonly();

  constructor() {
    this.initTokenRefresh();
  }

  ngOnDestroy(): void {
    this.stopTokenCheck();
  }

  login(
    email: string,
    password: string,
    twoFactorCode: string | null = null,
    rememberMe: boolean = false
  ): Observable<AuthResponse> {
    const credentials = {
      emailOrUsername: email,
      password,
      twoFactorCode,
      rememberMe,
    };

    return this._http.post<AuthResponse>('auth/login', credentials).pipe(
      tap((response) => {
        if (!response.requiresTwoFactor) {
          this.handleAuthResponse(response);
          this.initTokenRefresh();
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
    this.stopTokenCheck();

    if (this.getRefreshToken()) {
      this._http.post<void>('auth/logout', {}).subscribe({
        error: () => {
          /* Ignore logout errors */
        },
        complete: () => this.clearAuthState(),
      });
    } else {
      this.clearAuthState();
    }
  }

  private clearAuthState(): void {
    this.clearAuthData();
    this._isAuthenticated.set(false);
    this._userRole.set('');
    this._router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    const accessToken = this.getAccessToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap(() =>
          of({
            accessToken: this.getAccessToken() || '',
            refreshToken: this.getRefreshToken() || '',
            role: this.getRole(),
            exp: this.getTokenExpiration(),
          } as AuthResponse)
        )
      );
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    const body = { accessToken: accessToken, refreshToken: refreshToken };

    return this._http.post<AuthResponse>('auth/refresh-token', body).pipe(
      tap((response) => {
        this.handleAuthResponse(response);
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(response.accessToken);
      }),
      catchError((error) => {
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(null);
        this.clearAuthState();
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
    return expString ? parseInt(expString, 10) : 0;
  }

  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const expTime = this.getTokenExpiration();
      const currentTime = Math.floor(Date.now() / 1000);
      return expTime > currentTime;
    } catch (error) {
      return false;
    }
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

  private initTokenRefresh(): void {
    this.stopTokenCheck();

    if (this.hasValidToken()) {
      this.tokenCheckInterval = interval(30000).subscribe(() => {
        this.checkAndRefreshToken();
      });

      this.checkAndRefreshToken();
    }
  }

  private stopTokenCheck(): void {
    if (this.tokenCheckInterval) {
      this.tokenCheckInterval.unsubscribe();
      this.tokenCheckInterval = null;
    }
  }

  private checkAndRefreshToken(): void {
    if (!this.hasValidToken()) {
      this.refreshToken().subscribe();
      return;
    }

    const expTime = this.getTokenExpiration();
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expTime - currentTime;

    const totalTokenLifetime = 300;

    const refreshThreshold = totalTokenLifetime * 0.25;

    if (timeUntilExpiry < refreshThreshold) {
      this.refreshToken().subscribe();
    }
  }
}
