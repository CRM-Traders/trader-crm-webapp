// src/app/features/clients/services/clients.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientImportResponse,
  ClientRegistrationResponse,
  ClientCreateForAffiliateRequest,
} from '../models/clients.model';
import {
  ClientComment,
  ClientCommentCreateRequest,
  ClientCommentUpdateRequest,
  ClientCommentsResponse,
} from '../models/client-comments.model';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/clients';

  getClientById(id: string): Observable<Client> {
    return this.httpService.get<Client>(`${this.apiPath}/${id}`);
  }

  createClient(request: ClientCreateRequest): Observable<Client> {
    return this.httpService.post<Client>(this.apiPath, request);
  }

  // New method for admin client creation with generated password
  createClientForAdmin(
    request: ClientCreateRequest
  ): Observable<ClientRegistrationResponse> {
    return this.httpService.post<ClientRegistrationResponse>(
      `${this.apiPath}/create-client-for-admin`,
      request
    );
  }

  createClientForAffiliate(
    request: ClientCreateForAffiliateRequest
  ): Observable<ClientRegistrationResponse> {
    return this.httpService.post<ClientRegistrationResponse>(
      `${this.apiPath}/create-client-for-user`,
      request
    );
  }

  updateClient(request: ClientUpdateRequest): Observable<void> {
    const { id, ...body } = request;
    return this.httpService.put<void>(`${this.apiPath}/${id}`, body);
  }

  deleteClient(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  updateClientStatus(clientId: string, saleStatus: number): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/update-client-status`, {
      clientId,
      saleStatus,
    });
  }

  importClients(file: File): Observable<ClientImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<ClientImportResponse>(
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

  getActiveClients() {
    return this.httpService.get(`identity/api/users/get-active-users?role=6`);
  }

  // Enhanced method to get affiliates with pagination and filtering
  getAffiliatesDropdown(
    params: AffiliateSearchParams = {}
  ): Observable<AffiliateSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.globalFilter) {
      queryParams.append('globalFilter', params.globalFilter);
    }
    if (params.pageIndex !== undefined) {
      queryParams.append('pageIndex', params.pageIndex.toString());
    }
    if (params.pageSize !== undefined) {
      queryParams.append('pageSize', params.pageSize.toString());
    }

    const url = `identity/api/affiliates/affiliates-dropdown${
      queryParams.toString() ? '?' + queryParams.toString() : ''
    }`;
    return this.httpService.get<AffiliateSearchResponse>(url);
  }

  // Client Comments Methods
  getClientComments(clientId: string): Observable<ClientComment> {
    return this.httpService.get<ClientComment>(
      `identity/api/clientcomments/client/${clientId}`
    );
  }

  createClientComment(
    body: ClientCommentCreateRequest
  ): Observable<ClientComment> {
    return this.httpService.post<ClientComment>(
      `identity/api/clientcomments`,
      body
    );
  }

  deleteClientComment(commentId: string): Observable<void> {
    return this.httpService.delete<void>(
      `identity/api/clientcomments/${commentId}`
    );
  }
}

// Enhanced interfaces for paginated affiliate search
export interface AffiliateDropdownItem {
  affiliateId: string;
  userFullName: string;
}

export interface AffiliateSearchParams {
  globalFilter?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface AffiliateSearchResponse {
  items: AffiliateDropdownItem[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
