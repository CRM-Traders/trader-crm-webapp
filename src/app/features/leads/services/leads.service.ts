import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Lead,
  LeadCreateRequest,
  LeadUpdateRequest,
  LeadImportResponse,
} from '../models/leads.model';

@Injectable({
  providedIn: 'root',
})
export class LeadsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/leads';

  getClientById(id: string): Observable<Lead> {
    return this.httpService.get<Lead>(`${this.apiPath}/${id}`);
  }

  createClient(request: LeadCreateRequest): Observable<Lead> {
    return this.httpService.post<Lead>(this.apiPath, request);
  }

  updateClient(request: LeadUpdateRequest): Observable<void> {
    const { id, ...body } = request;
    return this.httpService.put<void>(`${this.apiPath}/${id}`, body);
  }

  deleteClient(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  importClients(file: File): Observable<LeadImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<LeadImportResponse>(
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

  exportClients(request: any): Observable<Blob> {
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

  getActiveLeads() {
    return this.httpService.get(`identity/api/users/get-active-users?role=7`);
  }
}
