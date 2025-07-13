import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Lead,
  LeadCreateRequest,
  LeadCreateResponse,
  LeadUpdateRequest,
  LeadImportResponse,
} from '../models/leads.model';

// Add these interfaces for the conversion responses
export interface LeadConversionResponse {
  success: boolean;
  clientId?: string;
  message?: string;
}

export interface BulkLeadConversionResponse {
  successCount: number;
  failureCount: number;
  convertedClientIds: string[];
  errors: Array<{
    leadId: string;
    email: string;
    reason: string;
  }>;
}

export interface BulkConversionRequest {
  leadIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class LeadsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/leads';

  createLead(request: LeadCreateRequest): Observable<LeadCreateResponse> {
    return this.httpService.post<LeadCreateResponse>(
      `${this.apiPath}`,
      request
    );
  }

  getClientById(id: string): Observable<Lead> {
    return this.httpService.get<Lead>(`${this.apiPath}/${id}`);
  }

  createClient(request: LeadCreateRequest) {
    // Alias for backward compatibility
    return this.createLead(request);
  }

  updateClient(request: LeadUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
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

  getActiveLeads(): Observable<any> {
    return this.httpService.get(`identity/api/users/get-active-users?role=7`);
  }

  /**
   * Convert a single lead to client
   */
  convertLeadToClient(leadId: string): Observable<any> {
    const request = { leadId };
    return this.httpService.post<any>(
      `${this.apiPath}/${leadId}/convert-to-client`,
      request
    );
  }

  /**
   * Convert multiple leads to clients
   */
  convertLeadsToClients(leadIds: string[]): Observable<BulkLeadConversionResponse> {
    const request: BulkConversionRequest = { leadIds };
    return this.httpService.post<BulkLeadConversionResponse>(
      'identity/convert-to-clients',
      request
    );
  }
}