// src/app/features/sales-rules/models/sales-rules.model.ts

export interface SalesRule {
  id: string;
  name: string;
  category: RuleCategory;
  categoryName: string;
  priority: RulePriority;
  priorityName: string;
  type: RuleType;
  typeName: string;
  country: string;
  language: string;
  operatorsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface SalesRuleDetails extends SalesRule {
  objectId: string;
  partners: string;
  affiliateReferrals: string | null;
  sources: string;
  operators: SalesRuleOperator[];
}

export interface SalesRuleOperator {
  id: string;
  userId: string;
  operatorName: string;
  operatorEmail: string;
  ratio: number;
  isValidOperator: boolean;
}

export interface CreateSalesRuleRequest {
  ruleName: string;
  priority: RulePriority;
  type: RuleType;
  country?: string;
  language?: string;
  partners?: string;
  affiliateReferrals?: string;
  operators?: any[];
  sources?: string;
}

export interface CreateSalesRuleResponse {
  ruleId: string;
}

export interface AddOperatorRequest {
  userId: string;
  ratio: number;
}

export interface UpdateOperatorRatioRequest {
  ratio: number;
}

export interface OperatorDropdownRequest {
  departmentId?: string | null;
  roleId?: string | null;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: string | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface OperatorDropdownItem {
  id: string;
  value: string;
  department: string;
  role: string;
}

export interface OperatorDropdownResponse {
  items: OperatorDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export enum RuleCategory {
  Office = 0,
  Desk = 1,
  Team = 2,
  Sale = 3,
  Retention = 4,
}

export enum RulePriority {
  Lowest = 1,
  VeryLow = 2,
  Low = 3,
  BelowNormal = 4,
  Normal = 5,
  AboveNormal = 6,
  High = 7,
  VeryHigh = 8,
  Critical = 9,
  Highest = 10,
}

export enum RuleType {
  Client = 0,
  Lead = 1,
}

export const RuleCategoryLabels: Record<RuleCategory, string> = {
  [RuleCategory.Office]: 'Office',
  [RuleCategory.Desk]: 'Desk',
  [RuleCategory.Team]: 'Team',
  [RuleCategory.Sale]: 'Sale',
  [RuleCategory.Retention]: 'Retention',
};

export const RulePriorityLabels: Record<RulePriority, string> = {
  [RulePriority.Lowest]: 'Lowest',
  [RulePriority.VeryLow]: 'Very Low',
  [RulePriority.Low]: 'Low',
  [RulePriority.BelowNormal]: 'Below Normal',
  [RulePriority.Normal]: 'Normal',
  [RulePriority.AboveNormal]: 'Above Normal',
  [RulePriority.High]: 'High',
  [RulePriority.VeryHigh]: 'Very High',
  [RulePriority.Critical]: 'Critical',
  [RulePriority.Highest]: 'Highest',
};

export const RuleTypeLabels: Record<RuleType, string> = {
  [RuleType.Client]: 'Client',
  [RuleType.Lead]: 'Lead',
};

export const RulePriorityColors: Record<RulePriority, string> = {
  [RulePriority.Lowest]: 'bg-gray-100 text-gray-800',
  [RulePriority.VeryLow]: 'bg-gray-200 text-gray-900',
  [RulePriority.Low]: 'bg-blue-100 text-blue-800',
  [RulePriority.BelowNormal]: 'bg-blue-200 text-blue-900',
  [RulePriority.Normal]: 'bg-green-100 text-green-800',
  [RulePriority.AboveNormal]: 'bg-yellow-100 text-yellow-800',
  [RulePriority.High]: 'bg-orange-100 text-orange-800',
  [RulePriority.VeryHigh]: 'bg-orange-200 text-orange-900',
  [RulePriority.Critical]: 'bg-red-100 text-red-800',
  [RulePriority.Highest]: 'bg-red-200 text-red-900',
};
