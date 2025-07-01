// src/app/features/officies/services/office-rules.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  OfficeRule,
  OfficeRuleCreateRequest,
  OfficeRuleUpdateRequest,
  OfficeRuleCreateResponse,
  OfficeRulesListRequest,
  OfficeRulesListResponse,
  RuleCategory,
  RulePriority,
  RuleType,
  OfficeManager,
  AddManagerRequest,
  OperatorDropdownItem,
} from '../models/office-rules.model';

// New interfaces for the API
export interface UserOrganizationAssignRequest {
  userId: string;
  level: number;
  entityId: string;
}

export interface UserOrganizationAssignResponse {
  userOrganizationId: string;
}

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

  getRuleCategories(): Observable<RuleCategory[]> {
    return this.httpService
      .get<RuleCategory[]>(`${this.apiPath}/categories`)
      .pipe(
        catchError(() =>
          of([
            { value: 1, name: 'General' },
            { value: 2, name: 'Restricted' },
            { value: 3, name: 'Special' },
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

  // Updated method to get office manager using the correct endpoint
  getOfficeManager(officeId: string): Observable<OfficeManager | null> {
    return this.httpService
      .get<any[]>(
        `identity/api/userorganizations/by-organization?entityId=${officeId}`
      )
      .pipe(
        map((managers) => {
          // Assuming the API returns an array of managers
          // Filter for office-level managers (you may need to adjust based on your business logic)
          const officeManager = managers.find((m) => m.level === 3); // Assuming level 3 is office manager

          if (officeManager) {
            return {
              id: officeManager.id,
              userId: officeManager.userId,
              operatorName:
                officeManager.operatorName || officeManager.fullName,
              operatorEmail:
                officeManager.operatorEmail || officeManager.email || '',
              isValidOperator: true,
            };
          }
          return null;
        }),
        catchError(() => of(null))
      );
  }

  // Method to assign a user as office manager
  assignOfficeManager(
    officeId: string,
    userId: string
  ): Observable<UserOrganizationAssignResponse> {
    const request: UserOrganizationAssignRequest = {
      userId: userId,
      level: 3, // Office level (adjust based on your hierarchy)
      entityId: officeId,
    };

    return this.httpService.post<UserOrganizationAssignResponse>(
      'identity/api/userorganizations/assign',
      request
    );
  }

  // Updated method to add office manager
  addOfficeManager(
    officeId: string,
    request: AddManagerRequest
  ): Observable<void> {
    return this.assignOfficeManager(officeId, request.operatorId).pipe(
      map(() => void 0)
    );
  }

  removeOfficeManager(officeId: string) {
    return this.getOfficeManager(officeId).pipe(
      map((manager) => {
        if (manager && manager.id) {
          return this.httpService.delete<void>(
            `identity/api/userorganizations/${manager.id}`
          );
        }
        throw new Error('No manager found to remove');
      }),
      catchError(() => of(void 0))
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

  // Legacy method for backward compatibility
  getAvailableOperators(): Observable<OperatorDropdownItem[]> {
    // This should be called with a specific branch ID
    // For now, returning empty array as it needs context
    return of([]);
  }
}
