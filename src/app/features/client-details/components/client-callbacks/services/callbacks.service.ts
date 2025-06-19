import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Callback,
  CallbackCreateRequest,
  CallbackCreateResponse,
  CallbackUpdateRequest
} from '../models/callback.model';
import { HttpService } from '../../../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class CallbacksService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/clientcallbacks';

  getCallbackById(id: string): Observable<Callback> {
    return this.httpService.get<Callback>(`${this.apiPath}/${id}`);
  }

  getCallbacksByClientId(clientId: string): Observable<Callback[]> {
    return this.httpService.get<Callback[]>(`${this.apiPath}/client/${clientId}`);
  }

  getDueCallbacks(): Observable<Callback[]> {
    return this.httpService.get<Callback[]>(`${this.apiPath}/due`);
  }

  createCallback(request: CallbackCreateRequest): Observable<CallbackCreateResponse> {
    return this.httpService.post<CallbackCreateResponse>(this.apiPath, request);
  }

  updateCallback(id: string, request: CallbackUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${id}`, request);
  }

  deleteCallback(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  openReminder(id: string): Observable<void> {
    return this.httpService.post<void>(`${this.apiPath}/${id}/open-reminder`, {});
  }

  completeCallback(id: string): Observable<void> {
    return this.httpService.post<void>(`${this.apiPath}/${id}/complete`, {});
  }
}
