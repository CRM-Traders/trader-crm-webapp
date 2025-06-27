// src/app/features/offices/services/offices.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Office,
  OfficeCreateRequest,
  OfficeUpdateRequest,
  OfficeCreateResponse,
  OfficeImportResponse,
  OfficeStatsMetaData,
  OfficeDropdownResponse,
  OfficesListRequest,
} from '../models/office.model';

@Injectable({
  providedIn: 'root',
})
export class OfficesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/offices';

  getOfficeById(id: string): Observable<Office> {
    return this.httpService.get<Office>(`${this.apiPath}/${id}`);
  }

  createOffice(request: OfficeCreateRequest): Observable<OfficeCreateResponse> {
    return this.httpService.post<OfficeCreateResponse>(this.apiPath, request);
  }

  updateOffice(request: OfficeUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
  }

  deleteOffice(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  getOfficeStats(): Observable<OfficeStatsMetaData> {
    return this.httpService.get<OfficeStatsMetaData>(
      `${this.apiPath}/offices-stat`
    );
  }

  getOfficeDropdown(
    request: OfficesListRequest
  ): Observable<OfficeDropdownResponse> {
    return this.httpService.post<OfficeDropdownResponse>(
      `${this.apiPath}/dropdown`,
      request
    );
  }

  importOffices(file: File): Observable<OfficeImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<OfficeImportResponse>(
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

  exportOffices(request: any): Observable<Blob> {
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
