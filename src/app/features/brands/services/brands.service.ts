import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Brand,
  BrandCreateRequest,
  BrandUpdateRequest,
  BrandCreateResponse,
  BrandImportResponse,
  BrandStats,
  BrandStatsMetaData,
} from '../models/brand.model';

@Injectable({
  providedIn: 'root',
})
export class BrandsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/brands';

  getBrandById(id: string): Observable<Brand> {
    return this.httpService.get<Brand>(`${this.apiPath}/${id}`);
  }

  createBrand(request: BrandCreateRequest): Observable<BrandCreateResponse> {
    return this.httpService.post<BrandCreateResponse>(this.apiPath, request);
  }

  updateBrand(request: BrandUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
  }

  deleteBrand(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  getBrandStats(): Observable<BrandStatsMetaData> {
    return this.httpService.get<BrandStatsMetaData>(
      `${this.apiPath}/brands-stat`
    );
  }

  importBrands(file: File): Observable<BrandImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<BrandImportResponse>(
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

  exportBrands(request: any): Observable<Blob> {
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
