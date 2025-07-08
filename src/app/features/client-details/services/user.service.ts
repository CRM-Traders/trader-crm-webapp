import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile, UpdateProfileRequest } from '../models/profile';


@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/users';

  getEmail(id: string): Observable<any> {
    return this.httpService.get<any>(`${this.apiPath}/get-user-email?userId=${id}`);
  }

  getPhone(id: string): Observable<any> {
    return this.httpService.get<any>(`${this.apiPath}/get-user-phone?userId=${id}`);
  }

  getClient(id: string): Observable<any> {
    return this.httpService.get<any>(`identity/api/clients/${id}`);
  }

  updateClient(id: string, clientData: UpdateProfileRequest): Observable<Profile> {
    return this.httpService.put<Profile>(`identity/api/clients/${id}`, clientData);
  }
}
