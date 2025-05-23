// src/app/features/affiliates/services/affiliates.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable } from 'rxjs';
import {
  Affiliate,
  AffiliateUpdateRequest,
  AffiliateImportResponse,
} from '../models/affiliates.model';

@Injectable({
  providedIn: 'root',
})
export class AffiliatesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'affiliates';

  getAffiliateById(id: string): Observable<Affiliate> {
    return this.httpService.get<Affiliate>(`${this.apiPath}/${id}`);
  }

  updateAffiliate(request: AffiliateUpdateRequest): Observable<void> {
    const { id, ...body } = request;
    return this.httpService.put<void>(`${this.apiPath}/${id}`, body);
  }

  deleteAffiliate(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  importAffiliates(file: File): Observable<AffiliateImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<AffiliateImportResponse>(
      `${this.apiPath}/import`,
      formData
    );
  }

  /**
   * Export affiliates to file
   * Note: This endpoint might need adjustment based on actual API response
   */
}
