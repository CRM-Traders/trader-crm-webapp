export interface Department {
  id: string;
  name: string;
  isActive: boolean;
  deskId: string;
  deskName: string;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt?: Date | null;
  lastModifiedBy?: string | null;
}

export interface DepartmentCreateRequest {
  name: string;
  deskId: string;
  isActive?: boolean;
}

export interface DepartmentUpdateRequest {
  id: string;
  name: string;
  deskId: string;
  isActive: boolean;
}

export interface DepartmentsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface DepartmentStatsMetaData {
  value: DepartmentStats;
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
}

export interface DepartmentCreateResponse {
  departmentId: string;
  message?: string;
}

export interface DepartmentImportResponse {
  successCount: number;
  failureCount: number;
  results: DepartmentImportResult[];
}

export interface DepartmentImportResult {
  name: string;
  deskName: string;
  isActive: boolean;
  departmentId: string;
}

export interface DepartmentDropdownItem {
  id: string;
  value: string;
  deskName: string;
}

export interface DepartmentDropdownResponse {
  items: DepartmentDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}
