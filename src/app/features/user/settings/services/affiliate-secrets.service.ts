// src/app/features/user/settings/services/affiliate-secrets.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpService } from '../../../../core/services/http.service';
import { Observable } from 'rxjs';
import {
  AffiliateSecret,
  CreateAffiliateSecretRequest,
  UpdateAffiliateSecretRequest,
} from '../models/affiliate-secret.model';

@Injectable({
  providedIn: 'root',
})
export class AffiliateSecretsService {
  private _http = inject(HttpService);
  private baseUrl = 'identity/api/affiliatesecrets';

  // Get all affiliate secrets for the current user
  getAffiliateSecrets(): Observable<AffiliateSecret[]> {
    return this._http.get<AffiliateSecret[]>(this.baseUrl);
  }

  // Get a specific affiliate secret
  getAffiliateSecret(id: string): Observable<AffiliateSecret> {
    return this._http.get<AffiliateSecret>(`${this.baseUrl}/${id}`);
  }

  // Create a new affiliate secret
  createAffiliateSecret(
    request: CreateAffiliateSecretRequest
  ): Observable<AffiliateSecret> {
    return this._http.post<AffiliateSecret>(this.baseUrl, request);
  }

  // Update an existing affiliate secret
  updateAffiliateSecret(
    id: string,
    request: UpdateAffiliateSecretRequest
  ): Observable<void> {
    return this._http.put<void>(`${this.baseUrl}/${id}`, request);
  }

  // Delete an affiliate secret
  deleteAffiliateSecret(id: string): Observable<void> {
    return this._http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Activate an affiliate secret
  activateAffiliateSecret(id: string): Observable<void> {
    return this._http.post<void>(`${this.baseUrl}/${id}/activate`, {});
  }

  // Deactivate an affiliate secret
  deactivateAffiliateSecret(id: string): Observable<void> {
    return this._http.post<void>(`${this.baseUrl}/${id}/deactivate`, {});
  }
}
