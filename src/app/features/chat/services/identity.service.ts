import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';

export interface ClientSearchRequest {
  searchTerm: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface OperatorSearchRequest {
  searchTerm?: string | null;
  pageIndex?: number;
  pageSize?: number;
}

export interface Client {
  id: string;
  userId: string;
  externalId: string;
  fullName: string;
}

export interface Operator {
  id: string;
  userId: string;
  value: string;
  department: string;
  role: string;
}

export interface SearchResponse<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class IdentityService {
  private http = inject(HttpService);

  searchClients(
    searchTerm: string | null = null,
    pageIndex: number = 1,
    pageSize: number = 20
  ): Observable<SearchResponse<Client>> {
    const request: ClientSearchRequest = {
      searchTerm,
      pageIndex,
      pageSize,
    };

    return this.http.post<SearchResponse<Client>>(
      'identity/api/clients/clients-for-trading-manager',
      request
    );
  }

  searchOperators(
    searchTerm: string | null = null,
    pageIndex: number = 1,
    pageSize: number = 20
  ): Observable<SearchResponse<Operator>> {
    const request: OperatorSearchRequest = {
      searchTerm,
      pageIndex,
      pageSize,
    };

    return this.http.post<SearchResponse<Operator>>(
      'identity/api/operators/dropdown',
      request
    );
  }

  getClientById(clientId: string): Observable<Client> {
    return this.http.get<Client>(`identity/clients/${clientId}`);
  }

  getOperatorById(operatorId: string): Observable<Operator> {
    return this.http.get<Operator>(`identity/operators/${operatorId}`);
  }
}
