import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Client,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientImportResponse,
} from '../models/clients.model';

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

  updateClient(request: ClientUpdateRequest): Observable<void> {
    const { id, ...body } = request;
    return this.httpService.put<void>(`${this.apiPath}/${id}`, body);
  }

  deleteClient(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
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
}
