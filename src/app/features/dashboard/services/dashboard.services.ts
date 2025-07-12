// dashboard.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable } from 'rxjs';
import { DashboardData } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/offices/office-dashboard';

  getDashboardData(): Observable<DashboardData> {
    return this.httpService.get<DashboardData>(this.apiPath);
  }
}