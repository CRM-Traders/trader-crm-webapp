// src/app/features/clients/services/clients.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
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
import { OperatorDropdownItem } from '../../officies/models/office-rules.model';

// Add new interfaces for the assignment
export interface AssignClientsToOperatorRequest {
  operatorId: string;
  clientType: number;
  entityIds: string[];
  isActive: boolean;
}

export interface AssignClientsToOperatorResponse {
  successCount: number;
  failureCount: number;
  createdOperatorClientIds: string[];
  errors: string[];
}

// New interfaces for shuffle clients functionality
export interface OperatorAssignment {
  operatorId: string;
  percentage: number;
}

export interface ShuffleClientsRequest {
  clientIds: string[];
  clientType: number;
  operators: OperatorAssignment[];
  saleStatus?: number;
}

export interface ShuffleClientsResponse {
  successCount: number;
  failureCount: number;
  createdOperatorClientIds: string[];
  errors: string[];
}

export enum ClientType {
  Lead = 0,
  Client = 1,
}

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

  unAssignOperator(clients: string[]) {
    return this.httpService.post(
      'identity/api/operatorclient/unassign-clients-from-operator',
      {
        clientIds: clients,
        clientType: 1,
      }
    );
  }

  // New method to assign clients to operator
  assignClientsToOperator(
    request: AssignClientsToOperatorRequest
  ): Observable<AssignClientsToOperatorResponse> {
    return this.httpService.post<AssignClientsToOperatorResponse>(
      'identity/api/operatorclient/assign-clients-to-operator',
      request
    );
  }

  // New method to shuffle clients to multiple operators with percentages
  shuffleClients(
    request: ShuffleClientsRequest
  ): Observable<ShuffleClientsResponse> {
    return this.httpService.post<ShuffleClientsResponse>(
      'identity/api/operatorclient/shuffle-clients',
      request
    );
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

  autoLogin(clientId: string) {
    return this.httpService.post(`identity/api/auth/admin/client/login`, {
      clientId: clientId,
    });
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
    return this.httpService.get(`identity/api/users/get-active-users?role=22`);
  }

  // Fetch clients via grid endpoint to build dropdowns (all clients, not only active)
  getClientsDropdown(
    params: {
      pageIndex?: number;
      pageSize?: number;
      globalFilter?: string | null;
    } = {}
  ) {
    const request = {
      pageIndex: params.pageIndex ?? 0,
      pageSize: params.pageSize ?? 1000,
      sortField: 'firstName',
      sortDirection: 'asc',
      visibleColumns: null,
      globalFilter: params.globalFilter ?? null,
      filters: null,
    };

    return this.httpService.post<any>(`${this.apiPath}/grid`, request);
  }

  // TODO: Add password change method when API is ready
  changePassword(request: {
    clientId: string;
    newPassword: string;
  }): Observable<void> {
    // Placeholder for when the API endpoint is available
    // return this.httpService.put<void>(`${this.apiPath}/${request.clientId}/change-password`, {
    //   newPassword: request.newPassword
    // });

    // Temporary implementation
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next();
        observer.complete();
      }, 1000);
    });
  }

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

  // Get all available operators
  getAvailableOperators(
    pageIndex: number = 0,
    pageSize: number = 100,
    searchTerm: string = ''
  ): Observable<OperatorDropdownItem[]> {
    const request = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      sortField: '',
      sortDirection: 'asc',
      globalFilter: searchTerm,
    };

    return this.httpService
      .post<any>('identity/api/operators/dropdown', request)
      .pipe(
        map((response) => {
          return response.items.map((operator: any) => ({
            id: operator.id,
            value: operator.value || operator.fullName,
          }));
        }),
        catchError((error) => {
          return of([]);
        })
      );
  }
}

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
