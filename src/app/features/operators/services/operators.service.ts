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
  OperatorDepartmentRoleAssignRequest,
  OperatorDepartmentRoleRemoveRequest,
  UserOrganizationAssignRequest,
  UserOrganizationReassignRequest,
  UserProfileUpdateRequest,
} from '../models/operators.model';

interface BranchDropdownResponse {
  items: BranchDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface BranchDropdownItem {
  id: string;
  value: string;
  brandName?: string;
  country?: string;
  officeName?: string;
  language?: string;
  type?: number;
  deskName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OperatorsService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/operators';
  private readonly rolesApiPath = 'identity/api/operatorroles';
  private readonly departmentsApiPath = 'identity/api/departments';
  private readonly brandsApiPath = 'identity/api/brands';
  private readonly officesApiPath = 'identity/api/offices';
  private readonly teamsApiPath = 'identity/api/teams';
  private readonly desksApiPath = 'identity/api/desks';

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
    const requestBody = {
      departmentId: departmentId,
      pageIndex: 0,
      pageSize: 100,
    };

    return this.httpService.post(`${this.rolesApiPath}/dropdown`, requestBody);
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

  // Branch dropdown methods based on branch type
  getBrandsDropdown(params: any = {}): Observable<BranchDropdownResponse> {
    const requestBody = {
      pageIndex: params.pageIndex || 0,
      pageSize: params.pageSize || 50,
      sortField: params.sortField || null,
      sortDirection: params.sortDirection || null,
      visibleColumns: params.visibleColumns || null,
      globalFilter: params.globalFilter || null,
      filters: params.filters || null,
    };

    return this.httpService.post<BranchDropdownResponse>(
      `${this.brandsApiPath}/dropdown`,
      requestBody
    );
  }

  getOfficesDropdown(params: any = {}): Observable<BranchDropdownResponse> {
    const requestBody = {
      brandId: params.brandId || null,
      pageIndex: params.pageIndex || 0,
      pageSize: params.pageSize || 50,
      sortField: params.sortField || null,
      sortDirection: params.sortDirection || null,
      visibleColumns: params.visibleColumns || null,
      globalFilter: params.globalFilter || null,
      filters: params.filters || null,
    };

    return this.httpService.post<BranchDropdownResponse>(
      `${this.officesApiPath}/dropdown`,
      requestBody
    );
  }

  getTeamsDropdown(params: any = {}): Observable<BranchDropdownResponse> {
    const requestBody = {
      deskId: params.deskId || null,
      pageIndex: params.pageIndex || 0,
      pageSize: params.pageSize || 50,
      sortField: params.sortField || null,
      sortDirection: params.sortDirection || null,
      visibleColumns: params.visibleColumns || null,
      globalFilter: params.globalFilter || null,
      filters: params.filters || null,
    };

    return this.httpService.post<BranchDropdownResponse>(
      `${this.teamsApiPath}/dropdown`,
      requestBody
    );
  }

  getDesksDropdown(params: any = {}): Observable<BranchDropdownResponse> {
    const requestBody = {
      officeId: params.officeId || null,
      pageIndex: params.pageIndex || 0,
      pageSize: params.pageSize || 50,
      sortField: params.sortField || null,
      sortDirection: params.sortDirection || null,
      visibleColumns: params.visibleColumns || null,
      globalFilter: params.globalFilter || null,
      filters: params.filters || null,
    };

    return this.httpService.post<BranchDropdownResponse>(
      `${this.desksApiPath}/dropdown`,
      requestBody
    );
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

  updateUserProfile(
    userId: string,
    request: UserProfileUpdateRequest
  ): Observable<void> {
    return this.httpService.put<void>(`identity/api/users/${userId}`, request);
  }

  // User organization management
  assignUserOrganization(
    request: UserOrganizationAssignRequest
  ): Observable<{ userOrganizationId: string }> {
    return this.httpService.post<{ userOrganizationId: string }>(
      'identity/api/userorganizations/assign',
      request
    );
  }

  reassignUserOrganization(
    id: string,
    request: UserOrganizationReassignRequest
  ): Observable<void> {
    return this.httpService.put<void>(
      `identity/api/userorganizations/${id}/reassign`,
      request
    );
  }

  removeUserOrganization(userId: string): Observable<void> {
    return this.httpService.delete<void>(
      `identity/api/userorganizations/users/${userId}`
    );
  }

  assignOperatorDepartmentRole(
    request: OperatorDepartmentRoleAssignRequest
  ): Observable<{ id: string }> {
    return this.httpService.post<{ id: string }>(
      'identity/api/operatordepartmentroles/assign',
      request
    );
  }

  removeOperatorDepartmentRole(
    request: OperatorDepartmentRoleRemoveRequest
  ): Observable<void> {
    return this.httpService.deleteWithBody<void>(
      'identity/api/operatordepartmentroles/remove',
      request
    );
  }
}
