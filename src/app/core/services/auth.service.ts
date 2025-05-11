import { inject, Injectable } from "@angular/core";
import { HttpService } from "./http.service";
import { BehaviorSubject, Observable, catchError, of, throwError, tap } from "rxjs";
import { HttpHeaders } from "@angular/common/http";
import { Router } from "@angular/router";
import { AuthResponse } from "../models/auth-response.model";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private _http = inject(HttpService);
    private _router = inject(Router);
    
    private _isAuthenticated = new BehaviorSubject<boolean>(this.hasValidToken());
    isAuthenticated$ = this._isAuthenticated.asObservable();
    
    private _userRole = new BehaviorSubject<string>(this.getRole());
    userRole$ = this._userRole.asObservable();
    
    private readonly ACCESS_TOKEN_KEY = 'iFC03fkUWhcdYGciaclPyeqySdQE6qCd';
    private readonly REFRESH_TOKEN_KEY = 'LXP6usaZ340gDciGr69MQpPwpEdvPj9M';
    private readonly ROLE_KEY = '9JeQyQTsI03hbuMtl9tR1TjbOFGWf54p';
    private readonly EXPIRATION_KEY = 'z6ipay7ciaSpZQbb6cDLueVAAs0WtRjs';
    
    login(email: string, password: string): Observable<AuthResponse> {
        const credentials = JSON.stringify({ email, password });
        
        return this._http.post<AuthResponse>('auth/login', credentials).pipe(
            tap(response => this.handleAuthResponse(response)),
            catchError(error => {
                console.error('Login failed', error);
                return throwError(() => new Error('Authentication failed. Please check your credentials.'));
            })
        );
    }
    

    logout(): void {
        this._http.post<void>('auth/logout', JSON.stringify({ refreshToken: this.getRefreshToken() }))
            .pipe(
                catchError(error => {
                    console.error('Logout request failed', error);
                    return of(null);
                })
            )
            .subscribe();
        
        this.clearAuthData();
        this._isAuthenticated.next(false);
        this._userRole.next('');
        
        this._router.navigate(['/auth/login']);
    }
    

    refreshToken(): Observable<AuthResponse> {
        const refreshToken = this.getRefreshToken();
        
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }
        
        const body = JSON.stringify({ refreshToken });
        
        return this._http.post<AuthResponse>('auth/refresh', body).pipe(
            tap(response => this.handleAuthResponse(response)),
            catchError(error => {
                console.error('Token refresh failed', error);
                this.clearAuthData();
                this._isAuthenticated.next(false);
                this._userRole.next('');
                return throwError(() => new Error('Session expired. Please log in again.'));
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
    
    getRole(): string {
        return localStorage.getItem(this.ROLE_KEY) || '';
    }
    
    getTokenExpiration(): number {
        const expString = localStorage.getItem(this.EXPIRATION_KEY);
        return expString ? parseInt(expString, 10) : 0;
    }
    
    hasValidToken(): boolean {
        const token = this.getAccessToken();
        const expiration = this.getTokenExpiration();
        
        if (!token || !expiration) {
            return false;
        }
        
        return Date.now() < (expiration * 1000 - 10000);
    }
    
    createAuthHeaders(): HttpHeaders {
        const token = this.getAccessToken();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }
    
    private handleAuthResponse(response: AuthResponse): void {
        if (response && response.accessToken) {
            this.storeAuthData(response);
            this._isAuthenticated.next(true);
            this._userRole.next(response.role);
        }
    }
    
    private storeAuthData(authData: AuthResponse): void {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, authData.accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
        localStorage.setItem(this.ROLE_KEY, authData.role);
        localStorage.setItem(this.EXPIRATION_KEY, authData.exp.toString());
    }
    
    private getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    
    private clearAuthData(): void {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.ROLE_KEY);
        localStorage.removeItem(this.EXPIRATION_KEY);
    }
}