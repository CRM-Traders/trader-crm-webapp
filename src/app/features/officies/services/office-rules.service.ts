// src/app/features/officies/services/office-rules.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  // getRulesList(
  //   request: OfficeRulesListRequest
  // ): Observable<OfficeRulesListResponse> {
  //   return this.httpService.post<OfficeRulesListResponse>(
  //     this.apiPath,
  //     request
  //   );
  // }

  getRuleCategories(): Observable<RuleCategory[]> {
    // Provide fallback data if API fails
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

  getOfficeManager(officeId: string): Observable<OfficeManager | null> {
    return this.httpService
      .get<OfficeManager>(
        `identity/api/userorganizations/by-organization?entityId=${officeId}`
      )
      .pipe(catchError(() => of(null)));
  }

  addOfficeManager(
    officeId: string,
    request: AddManagerRequest
  ): Observable<void> {
    return this.httpService.post<void>(
      `identity/api/offices/${officeId}/manager`,
      request
    );
  }

  removeOfficeManager(officeId: string): Observable<void> {
    return this.httpService.delete<void>(
      `identity/api/offices/${officeId}/manager`
    );
  }

  getAvailableOperators(): Observable<OperatorDropdownItem[]> {
    return this.httpService
      .get<OperatorDropdownItem[]>(
        'identity/api/userorganizations/by-organization'
      )
      .pipe(
        catchError(() =>
          this.httpService
            .get<OperatorDropdownItem[]>('identity/api/operators/dropdown')
            .pipe(catchError(() => of([])))
        )
      );
  }
}
