// src/app/features/operators/models/operators.model.ts

export interface Operator {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  departmentId: string;
  departmentName: string;
  roleId: string;
  roleName: string;
  branchType: BranchType;
  branchTypeName: string;
  branchId: string;
  branchName: string;
  userType: UserType;
  userTypeName: string;
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
}

export interface OperatorCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string | null;
  departmentId: string;
  roleId: string;
  branchType: BranchType;
  branchId: string;
  userType: UserType;
}

export interface OperatorUpdateRequest {
  id: string;
  departmentId?: string;
  roleId?: string;
  branchType?: BranchType;
  branchId?: string;
  userType?: UserType;
}

export interface OperatorRole {
  id: string;
  value: string;
  department: string;
}

export interface OperatorRoleCreateRequest {
  name: string;
  departmentId: string;
}

export interface OperatorStatistics {
  totalOperators: number;
  activeOperators: number;
  operatorsByDepartmentCount: number;
  operatorsByRoleCount: number;
}

export interface OperatorsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface DepartmentDropdownItem {
  id: string;
  value: string;
}

export interface DepartmentSearchParams {
  pageIndex?: number;
  pageSize?: number;
}

export interface DepartmentSearchResponse {
  items: DepartmentDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BranchDropdownItem {
  id: string;
  value: string;
  brandName?: string;
  country?: string;
  officeName?: string;
  language?: string;
  type?: number;
  deskName?: string;
}

export interface BranchDropdownResponse {
  items: BranchDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BranchSearchParams {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
  brandId?: string | null;
  officeId?: string | null;
  deskId?: string | null;
}

export enum BranchType {
  Office = 0,
  Desk = 1,
  Team = 2,
  Brand = 3,
}

export enum UserType {
  CompanyAdmin = 1,
  BrandAdmin = 2,
  SalesHOD = 3,
  RetentionHOD = 4,
  SupportHOD = 5,
  PspHOD = 6,
  SalesManager = 7,
  RetentionManager = 8,
  SupportManager = 9,
  PSPManager = 10,
  BOManager = 11,
  ComplianceManager = 12,
  OperationsManager = 13,
  DealingManager = 14,
  SalesLead = 15,
  RetentionLead = 16,
  SupportLead = 17,
  SalesAgent = 18,
  RetentionAgent = 19,
  SupportAgent = 20,
  AffiliateManager = 21,
}

export const BranchTypeLabels: Record<BranchType, string> = {
  [BranchType.Office]: 'Office',
  [BranchType.Desk]: 'Desk',
  [BranchType.Team]: 'Team',
  [BranchType.Brand]: 'Brand',
};

export const BranchTypeColors: Record<BranchType, string> = {
  [BranchType.Office]: 'bg-blue-100 text-blue-800',
  [BranchType.Desk]: 'bg-green-100 text-green-800',
  [BranchType.Team]: 'bg-purple-100 text-purple-800',
  [BranchType.Brand]: 'bg-orange-100 text-orange-800',
};

export const UserTypeLabels: Record<UserType, string> = {
  [UserType.CompanyAdmin]: 'Company Admin',
  [UserType.BrandAdmin]: 'Brand Admin',
  [UserType.SalesHOD]: 'Sales HOD',
  [UserType.RetentionHOD]: 'Retention HOD',
  [UserType.SupportHOD]: 'Support HOD',
  [UserType.PspHOD]: 'PSP HOD',
  [UserType.SalesManager]: 'Sales Manager',
  [UserType.RetentionManager]: 'Retention Manager',
  [UserType.SupportManager]: 'Support Manager',
  [UserType.PSPManager]: 'PSP Manager',
  [UserType.BOManager]: 'BO Manager',
  [UserType.ComplianceManager]: 'Compliance Manager',
  [UserType.OperationsManager]: 'Operations Manager',
  [UserType.DealingManager]: 'Dealing Manager',
  [UserType.SalesLead]: 'Sales Lead',
  [UserType.RetentionLead]: 'Retention Lead',
  [UserType.SupportLead]: 'Support Lead',
  [UserType.SalesAgent]: 'Sales Agent',
  [UserType.RetentionAgent]: 'Retention Agent',
  [UserType.SupportAgent]: 'Support Agent',
  [UserType.AffiliateManager]: 'Affiliate Manager',
};

export const UserTypeColors: Record<UserType, string> = {
  [UserType.CompanyAdmin]: 'bg-red-100 text-red-800',
  [UserType.BrandAdmin]: 'bg-red-100 text-red-800',
  [UserType.SalesHOD]: 'bg-indigo-100 text-indigo-800',
  [UserType.RetentionHOD]: 'bg-indigo-100 text-indigo-800',
  [UserType.SupportHOD]: 'bg-indigo-100 text-indigo-800',
  [UserType.PspHOD]: 'bg-indigo-100 text-indigo-800',
  [UserType.SalesManager]: 'bg-blue-100 text-blue-800',
  [UserType.RetentionManager]: 'bg-blue-100 text-blue-800',
  [UserType.SupportManager]: 'bg-blue-100 text-blue-800',
  [UserType.PSPManager]: 'bg-blue-100 text-blue-800',
  [UserType.BOManager]: 'bg-blue-100 text-blue-800',
  [UserType.ComplianceManager]: 'bg-blue-100 text-blue-800',
  [UserType.OperationsManager]: 'bg-blue-100 text-blue-800',
  [UserType.DealingManager]: 'bg-blue-100 text-blue-800',
  [UserType.SalesLead]: 'bg-purple-100 text-purple-800',
  [UserType.RetentionLead]: 'bg-purple-100 text-purple-800',
  [UserType.SupportLead]: 'bg-purple-100 text-purple-800',
  [UserType.SalesAgent]: 'bg-green-100 text-green-800',
  [UserType.RetentionAgent]: 'bg-green-100 text-green-800',
  [UserType.SupportAgent]: 'bg-green-100 text-green-800',
  [UserType.AffiliateManager]: 'bg-yellow-100 text-yellow-800',
};
