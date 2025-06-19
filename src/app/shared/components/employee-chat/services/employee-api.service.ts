// src/app/shared/services/employee/employee-api.service.ts

import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from '../../../../core/services/http.service';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
  lastSeenAt?: Date;
}

export interface EmployeePresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: Date;
}

export interface EmployeeSearchParams {
  searchTerm?: string;
  department?: string;
  role?: string;
  status?: string;
  pageIndex?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeApiService {
  private httpService = inject(HttpService);
  private readonly baseUrl = 'identity/api/workers';

  getAllEmployees(): Observable<Employee[]> {
    return this.httpService.get<Employee[]>(
      `${this.baseUrl}/get-employees?roles=27&roles=22`
    );
  }

  getEmployeeById(employeeId: string): Observable<Employee> {
    return this.httpService.get<Employee>(`${this.baseUrl}/${employeeId}`);
  }

  searchEmployees(params: EmployeeSearchParams): Observable<Employee[]> {
    let httpParams = new HttpParams();

    if (params.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }
    if (params.department) {
      httpParams = httpParams.set('department', params.department);
    }
    if (params.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.pageIndex) {
      httpParams = httpParams.set('pageIndex', params.pageIndex.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.httpService.get<Employee[]>(
      `${this.baseUrl}/search`,
      httpParams
    );
  }

  getEmployeePresence(): Observable<EmployeePresence[]> {
    return this.httpService.get<EmployeePresence[]>(`${this.baseUrl}/presence`);
  }

  updateEmployeeStatus(
    status: 'online' | 'away' | 'busy' | 'offline'
  ): Observable<void> {
    return this.httpService.post<void>(`${this.baseUrl}/status`, { status });
  }

  getEmployeeDepartments(): Observable<string[]> {
    return this.httpService.get<string[]>(`${this.baseUrl}/departments`);
  }

  getEmployeesByDepartment(department: string): Observable<Employee[]> {
    const params = new HttpParams().set('department', department);
    return this.httpService.get<Employee[]>(
      `${this.baseUrl}/by-department`,
      params
    );
  }
}
