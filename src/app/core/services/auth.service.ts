import { Injectable, inject, signal, OnDestroy, Injector } from '@angular/core';
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
  private _injector = inject(Injector);

  private readonly ACCESS_TOKEN_KEY = 'iFC03fkUWhcdYGciaclPyeqySdQE6qCd';
  private readonly REFRESH_TOKEN_KEY = 'LXP6usaZ340gDciGr69MQpPwpEdvPj9M';
  private readonly ROLE_KEY = '9JeQyQTsI03hbuMtl9tR1TjbOFGWf54p';
  private readonly PERMISSION_KEY = 'PerseQyQTsI03hbuMtl9tR1TjbOFGWf54p';
  private readonly EXPIRATION_KEY = 'z6ipay7ciaSpZQbb6cDLueVAAs0WtRjs';
  private readonly NAME_KEY = 'amskskwmwi7ciaSpZQbb6cDLueVAAs0WtRjs';

  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private tokenCheckInterval: Subscription | null = null;

  private readonly _isAuthenticated = signal<boolean>(this.hasValidToken());
  private readonly _userRole = signal<string>(this.getRole());
  private readonly _userPermissions = signal<string>(this.getUserPermissions());

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly userRole = this._userRole.asReadonly();
  readonly userPermissions = this._userPermissions.asReadonly();

  constructor() {
    this.initTokenRefresh();
  }

  ngOnDestroy(): void {
    this.stopTokenCheck();
  }

  private setCookie(name: string, value: string, days = 7): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/; Secure; SameSite=Strict`;
  }

  private getCookie(name: string): string | null {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
      const [key, val] = cookie.split('=');
      if (key === name) {
        return decodeURIComponent(val);
      }
    }
    return null;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict`;
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

    return this._http
      .post<AuthResponse>('identity/api/auth/login', credentials)
      .pipe(
        tap((response) => {
          if (!response.requiresTwoFactor) {
            this.handleAuthResponse(response);
            this.initTokenRefresh();
          }
        }),
        catchError(() =>
          throwError(
            () =>
              new Error('Authentication failed. Please check your credentials.')
          )
        )
      );
  }

  confirmAuth(authKey: string): Observable<AuthResponse> {
    return this._http
      .get<AuthResponse>(`identity/api/auth/confirm-auth?authKey=${authKey}`)
      .pipe(
        tap((response) => {
          this.handleAuthResponse(response);
          this.initTokenRefresh();
        }),
        catchError(() =>
          throwError(() => new Error('Authentication token validation failed.'))
        )
      );
  }

  logout(): void {
    this.stopTokenCheck();

    if (this.getRefreshToken()) {
      this._http.post<void>('identity/api/auth/logout', {}).subscribe({
        error: () => {},
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
            name: this.getName(),
            permission: this.getUserPermissions(),
          } as AuthResponse)
        )
      );
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    const body = { accessToken, refreshToken };

    return this._http
      .post<AuthResponse>('identity/api/auth/refresh-token', body)
      .pipe(
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
    return this.getRole() === requiredRole;
  }

  // ====== COOKIE-BASED GETTERS ======

  getAccessToken(): string | null {
    return this.getCookie(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.getCookie(this.REFRESH_TOKEN_KEY);
  }

  getRole(): string {
    return this.getCookie(this.ROLE_KEY) || '';
  }

  getUserPermissions(): string {
    const stored = this.getCookie(this.PERMISSION_KEY);
    return stored ?? '';
  }

  getName(): string {
    return this.getCookie(this.NAME_KEY) || '';
  }

  getUserId(): string {
    const token = this.getAccessToken();
    if (!token) return '';
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || payload.id || '';
    } catch {
      return '';
    }
  }

  getTokenExpiration(): number {
    const expString = this.getCookie(this.EXPIRATION_KEY);
    return expString ? parseInt(expString, 10) : 0;
  }

  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const expTime = this.getTokenExpiration();
      const currentTime = Math.floor(Date.now() / 1000);
      return expTime > currentTime;
    } catch {
      return false;
    }
  }

  public handleAuthResponse(response: AuthResponse): void {
    if (response && response.accessToken) {
      this.storeAuthData(response);
      this._isAuthenticated.set(true);
      this._userRole.set(response.role);
      this._userPermissions.set(response.permission);
    }
  }

  private storeAuthData(authData: AuthResponse): void {
    this.setCookie(this.ACCESS_TOKEN_KEY, authData.accessToken, 7);
    this.setCookie(this.REFRESH_TOKEN_KEY, authData.refreshToken, 7);
    this.setCookie(this.ROLE_KEY, authData.role, 7);
    this.setCookie(this.EXPIRATION_KEY, `${authData.exp}`, 7);
    this.setCookie(this.NAME_KEY, authData.name, 7);
    this.setCookie(this.PERMISSION_KEY, authData.permission, 7);
  }

  private clearAuthData(): void {
    this.deleteCookie(this.ACCESS_TOKEN_KEY);
    this.deleteCookie(this.REFRESH_TOKEN_KEY);
    this.deleteCookie(this.ROLE_KEY);
    this.deleteCookie(this.EXPIRATION_KEY);
    this.deleteCookie(this.NAME_KEY);
    this.deleteCookie(this.PERMISSION_KEY);
    this.clearBrandSelection();
  }

  // ====== TOKEN REFRESH LOGIC ======

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

    // Assuming tokens last 5 minutes (300 sec)
    const totalTokenLifetime = 300;

    // Refresh if less than 25% time left
    const refreshThreshold = totalTokenLifetime * 0.25;

    if (timeUntilExpiry < refreshThreshold) {
      this.refreshToken().subscribe();
    }
  }

  hasPermission(permissionIndex: number): boolean {
    const permissions = this._userPermissions();
    if (!permissions) return false;
    return permissions.charAt(permissionIndex - 1) === '1';
  }

  // ====== BRAND SELECTION (still uses cookies) ======

  hasSelectedBrand(): boolean {
    return this.getCookie('brand-selected') === 'true';
  }

  markBrandAsSelected(): void {
    this.setCookie('brand-selected', 'true', 7);
  }

  clearBrandSelection(): void {
    this.deleteCookie('brand-selected');
  }
}
