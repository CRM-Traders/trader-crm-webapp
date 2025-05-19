import { Injectable, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService implements OnDestroy {
  private refreshTokenTimeout: any;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {
    if (this.authService.isAuthenticated()) {
      this.scheduleRefresh();
    } else {
      this.clearRefreshTimer();
    }
  }

  private scheduleRefresh(): void {
    this.clearRefreshTimer();
    const expiration = this.authService.getTokenExpiration() * 1000;
    const now = Date.now();
    const timeToRefresh = expiration - now - 60 * 1000;

    if (timeToRefresh > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.authService.refreshToken().subscribe();
      }, timeToRefresh);
    } else {
      this.authService.refreshToken().subscribe();
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearRefreshTimer();
  }
}
