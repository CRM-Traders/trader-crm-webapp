// src/app/features/sales-rules/services/sales-rules.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable } from 'rxjs';
import {
  SalesRule,
  SalesRuleDetails,
  CreateSalesRuleRequest,
  CreateSalesRuleResponse,
  AddOperatorRequest,
  UpdateOperatorRatioRequest,
  OperatorDropdownRequest,
  OperatorDropdownResponse,
} from '../models/sales-rules.model';

@Injectable({
  providedIn: 'root',
})
export class SalesRulesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'identity/api/salerules';
  private readonly operatorsApiPath = 'identity/api/operators';

  // Get all sales rules (grid endpoint)
  getSalesRules(): Observable<any> {
    return this.httpService.get<any>(`${this.apiPath}/grid`);
  }

  // Get single sales rule details
  getSalesRuleById(id: string): Observable<SalesRuleDetails> {
    return this.httpService.get<SalesRuleDetails>(`${this.apiPath}/${id}`);
  }

  // Create new sales rule
  createSalesRule(
    request: CreateSalesRuleRequest
  ): Observable<CreateSalesRuleResponse> {
    return this.httpService.post<CreateSalesRuleResponse>(
      `${this.apiPath}/create`,
      request
    );
  }

  // Delete sales rule
  deleteSalesRule(id: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${id}`);
  }

  // Add operator to sales rule
  addOperatorToRule(
    ruleId: string,
    request: AddOperatorRequest
  ): Observable<void> {
    return this.httpService.post<void>(
      `${this.apiPath}/${ruleId}/operators`,
      request
    );
  }

  // Update operator ratio
  updateOperatorRatio(
    ruleId: string,
    userId: string,
    request: UpdateOperatorRatioRequest
  ): Observable<void> {
    return this.httpService.put<void>(
      `${this.apiPath}/${ruleId}/operators/${userId}/ratio`,
      request
    );
  }

  // Remove operator from rule
  removeOperatorFromRule(ruleId: string, userId: string): Observable<void> {
    return this.httpService.delete<void>(
      `${this.apiPath}/${ruleId}/operators/${userId}`
    );
  }

  // Get operators dropdown
  getOperatorsDropdown(
    request: OperatorDropdownRequest
  ): Observable<OperatorDropdownResponse> {
    return this.httpService.post<OperatorDropdownResponse>(
      `${this.operatorsApiPath}/dropdown`,
      request
    );
  }

  // Update sales rule (general update)
  updateSalesRule(
    id: string,
    request: Partial<CreateSalesRuleRequest>
  ): Observable<void> {
    return this.httpService.put<void>(`${this.apiPath}/${id}`, request);
  }

  // Toggle rule active status
  toggleRuleStatus(id: string, isActive: boolean): Observable<void> {
    return this.httpService.patch<void>(`${this.apiPath}/${id}/status`, {
      isActive,
    });
  }
}
