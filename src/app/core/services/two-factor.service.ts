// src/app/core/services/two-factor.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpService } from './http.service';
import { Observable } from 'rxjs';
import {
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
} from '../models/two-f.model';

@Injectable({
  providedIn: 'root',
})
export class TwoFactorService {
  private http = inject(HttpService);

  setup(): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>('auth/2fa/setup', {});
  }

  verify(code: string): Observable<any> {
    return this.http.post<any>('auth/2fa/verify', { code });
  }

  disable(code: string): Observable<any> {
    return this.http.post<any>('auth/2fa/disable', { code });
  }

  getStatus(): Observable<TwoFactorStatusResponse> {
    return this.http.get<TwoFactorStatusResponse>('auth/2fa/status');
  }

  generateOtpauthUrl(
    username: string,
    secretKey: string,
    issuer: string = 'Trader CRM'
  ): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedUsername = encodeURIComponent(username);
    const encodedSecret = encodeURIComponent(secretKey);

    return `otpauth://totp/${encodedIssuer}:${encodedUsername}?secret=${encodedSecret}&issuer=${encodedIssuer}`;
  }
}
