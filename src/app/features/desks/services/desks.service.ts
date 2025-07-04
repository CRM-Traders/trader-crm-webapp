import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Desk,
  DeskCreateRequest,
  DeskUpdateRequest,
  DeskCreateResponse,
  DeskImportResponse,
  DeskStats,
  DeskStatsMetaData,
  DeskDropdownResponse,
  DesksGridRequest,
  OfficeDropdownRequest,
  OfficeDropdownResponse,
} from '../models/desk.model';
import { BrandDropdownRequest } from '../../brands/models/brand.model';
import { BrandDropdownResponse } from '../../brand-selection/models/brand.model';

@Injectable({
  providedIn: 'root',
})
export class DesksService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/desks';
  private readonly officesApiPath = 'identity/api/offices';

  getDeskById(id: string): Observable<Desk> {
    return this.httpService.get<Desk>(`${this.apiPath}/${id}`);
  }

  createDesk(request: DeskCreateRequest): Observable<DeskCreateResponse> {
    return this.httpService.post<DeskCreateResponse>(this.apiPath, request);
  }

  updateDesk(request: DeskUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
  }

  deleteDesk(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  getDeskStats(): Observable<DeskStatsMetaData> {
    return this.httpService.get<DeskStatsMetaData>(
      `${this.apiPath}/desks-stat`
    );
  }

  getDeskDropdown(request: DesksGridRequest): Observable<DeskDropdownResponse> {
    return this.httpService.post<DeskDropdownResponse>(
      `${this.apiPath}/dropdown`,
      request
    );
  }

  getOfficesDropdown(
    request: OfficeDropdownRequest
  ): Observable<OfficeDropdownResponse> {
    return this.httpService.post<OfficeDropdownResponse>(
      `${this.officesApiPath}/dropdown`,
      request
    );
  }

    getBrandsDropdown(
    request: BrandDropdownRequest
  ): Observable<BrandDropdownResponse> {
    return this.httpService.post<BrandDropdownResponse>(
      `identity/api/brands/dropdown`,
      request
    );
  }

  importDesks(file: File): Observable<DeskImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<DeskImportResponse>(
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

  exportDesks(request: any): Observable<Blob> {
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
