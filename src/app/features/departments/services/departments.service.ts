// src/app/features/departments/services/departments.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentCreateResponse,
  DepartmentImportResponse,
  DepartmentStats,
  DepartmentStatsMetaData,
  DepartmentDropdownResponse,
  DepartmentsListRequest,
} from '../models/department.model';

@Injectable({
  providedIn: 'root',
})
export class DepartmentsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/departments';

  getDepartmentById(id: string): Observable<Department> {
    return this.httpService.get<Department>(`${this.apiPath}/${id}`);
  }

  createDepartment(
    request: DepartmentCreateRequest
  ): Observable<DepartmentCreateResponse> {
    return this.httpService.post<DepartmentCreateResponse>(
      this.apiPath,
      request
    );
  }

  updateDepartment(request: DepartmentUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
  }

  deleteDepartment(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  getDepartmentStats(): Observable<DepartmentStatsMetaData> {
    return this.httpService.get<DepartmentStatsMetaData>(
      `${this.apiPath}/stats`
    );
  }

  getDepartmentDropdown(
    request: DepartmentsListRequest
  ): Observable<DepartmentDropdownResponse> {
    return this.httpService.post<DepartmentDropdownResponse>(
      `${this.apiPath}/dropdown`,
      request
    );
  }

  // Method to get desks dropdown for department creation/editing
  getDesksDropdown(request: any): Observable<any> {
    return this.httpService.post<any>('identity/api/desks/dropdown', request);
  }

  importDepartments(file: File): Observable<DepartmentImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpService.post<DepartmentImportResponse>(
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

  exportDepartments(request: any): Observable<Blob> {
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
}
