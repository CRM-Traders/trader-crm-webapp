// src/app/features/operators/services/operators.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Operator,
  OperatorCreateRequest,
  OperatorUpdateRequest,
  OperatorRole,
  OperatorRoleCreateRequest,
  OperatorStatistics,
  DepartmentSearchParams,
  DepartmentSearchResponse,
} from '../models/operators.model';

@Injectable({
  providedIn: 'root',
})
export class OperatorsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/operators';
  private readonly rolesApiPath = 'identity/api/operatorroles';
  private readonly departmentsApiPath = 'identity/api/departments';

  getOperatorById(id: string): Observable<Operator> {
    return this.httpService.get<Operator>(`${this.apiPath}/${id}`);
  }

  createOperator(
    request: OperatorCreateRequest
  ): Observable<{ operatorId: string }> {
    return this.httpService.post<{ operatorId: string }>(this.apiPath, request);
  }

  updateOperator(request: OperatorUpdateRequest): Observable<void> {
    const { id, ...body } = request;
    return this.httpService.put<void>(`${this.apiPath}/${id}`, body);
  }

  deleteOperator(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  // Get operator statistics
  getOperatorStatistics(): Observable<OperatorStatistics> {
    return this.httpService.get<OperatorStatistics>(
      `${this.apiPath}/operators-stat`
    );
  }

  // Operator roles management
  createOperatorRole(
    request: OperatorRoleCreateRequest
  ): Observable<{ roleId: string }> {
    return this.httpService.post<{ roleId: string }>(
      this.rolesApiPath,
      request
    );
  }

  getOperatorRoles(): Observable<OperatorRole[]> {
    return this.httpService.get<OperatorRole[]>(this.rolesApiPath);
  }

  getOperatorRolesByDepartment(
    departmentId: string
  ): Observable<OperatorRole[]> {
    return this.httpService.get<OperatorRole[]>(
      `${this.rolesApiPath}?departmentId=${departmentId}`
    );
  }

  // Departments dropdown
  getDepartmentsDropdown(
    params: DepartmentSearchParams = {}
  ): Observable<DepartmentSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.pageIndex !== undefined) {
      queryParams.append('pageIndex', params.pageIndex.toString());
    }
    if (params.pageSize !== undefined) {
      queryParams.append('pageSize', params.pageSize.toString());
    }

    const url = `${this.departmentsApiPath}/dropdown${
      queryParams.toString() ? '?' + queryParams.toString() : ''
    }`;
    return this.httpService.post<DepartmentSearchResponse>(url, {});
  }

  // Export operators
  exportOperators(request: any): Observable<Blob> {
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

  // Import operators template download
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
}
