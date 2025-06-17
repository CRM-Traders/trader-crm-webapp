export interface Team {
  id: string;
  name: string;
  isActive: boolean;
  departmentId: string;
  departmentName: string;
  deskId: string;
  deskName: string;
  brandId: string;
  brandName: string;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt?: Date | null;
  lastModifiedBy?: string | null;
}

export interface TeamCreateRequest {
  name: string;
  departmentId: string;
  isActive?: boolean;
}

export interface TeamUpdateRequest {
  id: string;
  name: string;
  departmentId: string;
  isActive: boolean;
}

export interface TeamsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface TeamStatsMetaData {
  value: TeamStats;
}

export interface TeamStats {
  totalTeams: number;
  activeTeams: number;
}

export interface TeamCreateResponse {
  teamId: string;
  message?: string;
}

export interface TeamImportResponse {
  successCount: number;
  failureCount: number;
  results: TeamImportResult[];
}

export interface TeamImportResult {
  name: string;
  departmentName: string;
  isActive: boolean;
  teamId: string;
}

export interface TeamDropdownItem {
  id: string;
  value: string;
  departmentName: string;
}

export interface TeamDropdownResponse {
  items: TeamDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}
