// src/app/features/officies/models/office-rules.model.ts

export interface OfficeRule {
  id: string;
  name: string;
  category: number;
  categoryName: string;
  priority: number;
  priorityName: string;
  type: number;
  typeName: string;
  objectId: string;
  country: string;
  language: string;
  partners: string;
  affiliateReferrals: string;
  sources: string;
  operators: OfficeRuleOperator[];
  operatorsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface OfficeManager {
  id: string;
  operatorId: string;
  operatorName: string;
  operatorFullName: string;
  operatorEmail: string;
  branchType: number;
  branchTypeName: string;
  branchId: string;
  createdAt: string;
}

export interface OfficeRuleOperator {
  id: string;
  userId: string;
  operatorName: string;
  operatorEmail: string;
  ratio: number;
  isValidOperator: boolean;
}

export interface OfficeRuleCreateRequest {
  ruleName: string;
  category: number;
  priority: number;
  type: number;
  objectId: string;
  country?: string;
  language?: string;
  partners?: string;
  affiliateReferrals?: string;
  sources?: string;
}

export interface OfficeRuleUpdateRequest {
  id: string;
  ruleName: string;
  priority: number;
  country?: string;
  language?: string;
  partners?: string;
  affiliateReferrals?: string;
  sources?: string;
}

export interface OfficeRulesListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: {
    additional_properties?: {
      field?: string;
      operator?: string;
      value?: any;
      values?: any[] | null;
    };
  } | null;
}

export interface OfficeRulesListResponse {
  items: OfficeRule[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface OfficeRuleCreateResponse {
  ruleId: string;
}

export interface RuleCategory {
  value: number;
  name: string;
}

export interface RulePriority {
  value: number;
  name: string;
}

export interface RuleType {
  value: number;
  name: string;
}

export interface OfficeManager {
  id: string;
  userId: string;
  operatorName: string;
  operatorEmail: string;
  isValidOperator: boolean;
}

export interface AddManagerRequest {
  operatorId: string;
}

export interface OperatorDropdownItem {
  id: string;
  value: string;
  email: string;
}
