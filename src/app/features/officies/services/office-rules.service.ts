// src/app/features/officies/services/office-rules.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  OfficeRule,
  OfficeRuleCreateRequest,
  OfficeRuleUpdateRequest,
  OfficeRuleCreateResponse,
  OfficeRulesListRequest,
  OfficeRulesListResponse,
  RuleCategory,
  RuleCategoryOption,
  RulePriority,
  RuleType,
  OfficeManager,
  AddManagerRequest,
  OperatorDropdownItem,
} from '../models/office-rules.model';

// Manager API interfaces
export interface OperatorManagerRequest {
  operatorId: string;
  branchType: number;
  branchId: string;
}

export interface OperatorManagerResponse {
  value: {
    operatorManagerId: string;
  };
  isSuccess: boolean;
  isFailure: boolean;
  error: string | null;
  errorCode: string | null;
  validationErrors: string[] | null;
  metadata: any | null;
}

// Branch operators interfaces
export interface BranchOperatorsRequest {
  entityId: string;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: string;
  visibleColumns?: string[];
  globalFilter?: string;
  filters?: any;
}

export interface BranchOperator {
  operatorId: string;
  fullName: string;
  username: string;
}

export interface BranchOperatorsResponse {
  items: BranchOperator[];
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
export class OfficeRulesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/rules';
  private readonly operatorManagerPath = 'identity/api/operatormanager';

  // Rule management methods
  createRule(
    request: OfficeRuleCreateRequest
  ): Observable<OfficeRuleCreateResponse> {
    return this.httpService.post<OfficeRuleCreateResponse>(
      `${this.apiPath}/create`,
      request
    );
  }

  getRuleById(id: string): Observable<OfficeRule> {
    return this.httpService.get<OfficeRule>(`${this.apiPath}/${id}`);
  }

  updateRule(request: OfficeRuleUpdateRequest): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${request.id}`, request);
  }

  deleteRule(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  getRuleCategories(): Observable<RuleCategoryOption[]> {
    return this.httpService
      .get<RuleCategoryOption[]>(`${this.apiPath}/categories`)
      .pipe(
        catchError(() =>
          of([
            { value: 0, name: 'Brand' },
            { value: 1, name: 'Desk' },
            { value: 2, name: 'Team' },
            { value: 3, name: 'Sale' },
            { value: 4, name: 'Retention' },
          ])
        )
      );
  }

  getRulePriorities(): Observable<RulePriority[]> {
    return this.httpService
      .get<RulePriority[]>(`${this.apiPath}/priorities`)
      .pipe(
        catchError(() =>
          of([
            { value: 1, name: 'Low' },
            { value: 2, name: 'Medium' },
            { value: 3, name: 'High' },
            { value: 4, name: 'Critical' },
          ])
        )
      );
  }

  getRuleTypes(): Observable<RuleType[]> {
    return this.httpService.get<RuleType[]>(`${this.apiPath}/types`).pipe(
      catchError(() =>
        of([
          { value: 1, name: 'Assignment' },
          { value: 2, name: 'Distribution' },
          { value: 3, name: 'Routing' },
        ])
      )
    );
  }

  // Get all office managers - returns array of managers
  getOfficeManagers(officeId: string): Observable<OfficeManager[]> {
    // First try to get managers by branch ID
    return this.httpService
      .get<OfficeManager[]>(
        `${this.operatorManagerPath}/get-manager-by-branch-id?BranchId=${officeId}`
      )
      .pipe(
        map((managers) => {
          // Ensure we always return an array
          if (Array.isArray(managers)) {
            return managers;
          } else if (managers) {
            // If single manager is returned, wrap in array
            return [managers];
          }
          return [];
        }),
        catchError((error) => {
          // If endpoint doesn't exist or returns 404, try single manager endpoint
          if (error.status === 404 || error.status === 405) {
            return this.getSingleOfficeManager(officeId).pipe(
              map((manager) => (manager ? [manager] : []))
            );
          }
          return of([]);
        })
      );
  }

  // Fallback method to get single manager if multiple managers endpoint doesn't exist
  private getSingleOfficeManager(
    officeId: string
  ): Observable<OfficeManager | null> {
    return this.httpService
      .get<OfficeManager>(
        `${this.operatorManagerPath}/get-manager-by-branch-id?BranchId=${officeId}`
      )
      .pipe(catchError(() => of(null)));
  }

  // Add office manager
  addOfficeManager(
    officeId: string,
    request: AddManagerRequest
  ): Observable<void> {
    const managerRequest: OperatorManagerRequest = {
      operatorId: request.operatorId,
      branchType: 1, // 1 for office
      branchId: officeId,
    };

    return this.httpService
      .post<OperatorManagerResponse>(this.operatorManagerPath, managerRequest)
      .pipe(
        map((response) => {
          if (response.isFailure) {
            throw new Error(response.error || 'Failed to add manager');
          }
          return void 0;
        })
      );
  }

  // Remove specific office manager by manager ID
  removeOfficeManager(managerId: string): Observable<void> {
    return this.httpService.delete<void>(
      `${this.operatorManagerPath}/${managerId}`
    );
  }

  // Get operators available for the branch/office
  getBranchOperators(
    branchId: string,
    pageIndex: number = 0,
    pageSize: number = 100
  ): Observable<OperatorDropdownItem[]> {
    const request: BranchOperatorsRequest = {
      entityId: branchId,
      pageIndex: pageIndex,
      pageSize: pageSize,
      sortField: '',
      sortDirection: 'asc',
    };

    return this.httpService
      .post<BranchOperatorsResponse>(
        'identity/api/branch/get-operators-by-branch-id',
        request
      )
      .pipe(
        map((response) => {
          return response.items.map((operator) => ({
            id: operator.operatorId,
            value: operator.fullName,
            email: operator.username,
          }));
        }),
        catchError((error) => {
          console.error('Error fetching branch operators:', error);
          return of([]);
        })
      );
  }

  // Get all available operators
  getAvailableOperators(
    pageIndex: number = 0,
    pageSize: number = 100,
    searchTerm: string = ''
  ): Observable<OperatorDropdownItem[]> {
    const request = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      sortField: '',
      sortDirection: 'asc',
      globalFilter: searchTerm,
    };

    return this.httpService
      .post<any>('identity/api/operators/dropdown', request)
      .pipe(
        map((response) => {
          return response.items.map((operator: any) => ({
            id: operator.id,
            value: operator.value || operator.fullName,
            email: operator.email || operator.username,
          }));
        }),
        catchError((error) => {
          console.error('Error fetching operators:', error);
          return of([]);
        })
      );
  }

  // Check if operator is already a manager for any office
  isOperatorManager(operatorId: string): Observable<boolean> {
    // This would need a specific endpoint from backend
    // For now, returning false
    return of(false);
  }
}
