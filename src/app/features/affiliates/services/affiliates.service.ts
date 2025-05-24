import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Affiliate,
  AffiliateCreateRequest,
  AffiliateUpdateRequest,
  AffiliateImportResponse,
} from '../models/affiliates.model';

@Injectable({
  providedIn: 'root',
})
export class AffiliatesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/affiliates';

  getAffiliateById(id: string): Observable<Affiliate> {
    return this.httpService.get<Affiliate>(`${this.apiPath}/${id}`);
  }

  createAffiliate(request: AffiliateCreateRequest): Observable<Affiliate> {
    return this.httpService.post<Affiliate>(this.apiPath, request);
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

  downloadImportTemplate(): Observable<Blob> {
    const headers = new HttpHeaders({
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return this.httpService['_http'].get<Blob>(
      `${this.httpService['_apiUrl']}/${this.apiPath}/import-template`,
      {
        responseType: 'blob' as 'json',
        headers,
      }
    );
  }

  exportAffiliates(request: any): Observable<Blob> {
    const headers = new HttpHeaders({
      Accept: 'text/csv',
    });

    return this.httpService['_http'].post<Blob>(
      `${this.httpService['_apiUrl']}/${this.apiPath}/export`,
      request,
      {
        responseType: 'blob' as 'json',
        headers,
      }
    );
  }
}
