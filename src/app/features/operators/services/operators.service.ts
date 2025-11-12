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
  OperatorPersonalInfoUpdateRequest,
} from '../models/operators.model';

// Operator clients request/response models
export interface OperatorClientsRequest {
  operatorId: string;
  pageIndex: number;
  pageSize: number;
  sortField: string | null;
  sortDirection: string | null;
  visibleColumns: string[] | null;
  globalFilter: any;
  filters: any;
}

export interface OperatorClientItem {
  clientId: string;
  clientName: string;
  clientStatus: string;
  assignDate: string;
}

export interface OperatorClientsResponse {
  clients: OperatorClientItem[];
  leads: any[];
  totalClients: number;
  totalLeads: number;
}

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
  private readonly operatorClientApiPath = 'identity/api/operatorclient';

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
    params: any = {}
  ): Observable<DepartmentSearchResponse> {
    const requestBody = {
      pageIndex: params.pageIndex || 0,
      pageSize: params.pageSize || 50,
      sortField: params.sortField || null,
      sortDirection: params.sortDirection || null,
      visibleColumns: params.visibleColumns || null,
      globalFilter: params.globalFilter || null,
      filters: params.filters || null,
    };

    return this.httpService.post<DepartmentSearchResponse>(
      `${this.departmentsApiPath}/dropdown`,
      requestBody
    );
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

  getSwitchOfficesDropdown(
    pageIndex: number = 0,
    pageSize: number = 50
  ): Observable<BranchDropdownResponse> {
    const requestBody = {
      pageIndex,
      pageSize,
      sortField: null,
      sortDirection: null,
      visibleColumns: ['array', null],
      globalFilter: null,
      filters: null,
    };

    return this.httpService.post<BranchDropdownResponse>(
      `${this.officesApiPath}/switch-office`,
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

  updateOperatorPersonalInfo(
    request: OperatorPersonalInfoUpdateRequest
  ): Observable<void> {
    return this.httpService.put<void>(
      `${this.apiPath}/update-personal-information`,
      request
    );
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

  removeOperatorDepartmentRole(operatorDepartmentRoleId: string): Observable<void> {
    return this.httpService.delete<void>(
      `identity/api/operatordepartmentroles/remove/${operatorDepartmentRoleId}`
    );
  }

  // Operator assigned clients
  getOperatorClients(
    request: OperatorClientsRequest
  ): Observable<OperatorClientsResponse> {
    return this.httpService.post<OperatorClientsResponse>(
      `${this.operatorClientApiPath}/operator-clients`,
      request
    );
  }

  // Bulk clone operators to office
  bulkCloneToOffice(request: {
    userIds: string[];
    fromOfficeId: string;
    toOfficeId: string;
  }): Observable<any> {
    return this.httpService.post<any>(
      'identity/api/operators/bulk-clone-to-office',
      request
    );
  }

  // Get target offices for branch assignment
  getTargetOffices(
    pageIndex: number = 0,
    pageSize: number = 100
  ): Observable<BranchDropdownResponse> {
    return this.httpService.get<BranchDropdownResponse>(
      `identity/api/branch/target-offices?pageIndex=${pageIndex}&pageSize=${pageSize}`
    );
  }

  // Get branches for assignment by office and level
  getBranchesForAssignment(
    officeId: string,
    levelFilter: number,
    pageIndex: number = 0,
    pageSize: number = 100
  ): Observable<BranchDropdownResponse> {
    return this.httpService.get<BranchDropdownResponse>(
      `identity/api/branch/for-assignment/${officeId}?LevelFilter=${levelFilter}&pageIndex=${pageIndex}&pageSize=${pageSize}`
    );
  }
}
