export interface Desk {
  id: string;
  name: string;
  isActive: boolean;
  officeId: string;
  officeName: string;
  language: string | null;
  type: number;
  teamsCount: number;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt?: Date | null;
  lastModifiedBy?: string | null;
}

export interface DeskCreateRequest {
  name: string;
  officeId: string;
  language?: string | null;
  type?: number;
  isActive?: boolean;
}

export interface DeskUpdateRequest {
  id: string;
  name: string;
  officeId: string;
  language?: string | null;
  type: number;
  isActive: boolean;
}

export interface DesksGridRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface DeskStatsMetaData {
  value: DeskStats;
}

export interface DeskStats {
  totalDesks: number;
  activeDesks: number;
}

export interface DeskCreateResponse {
  deskId: string;
  message?: string;
}

export interface DeskImportResponse {
  successCount: number;
  failureCount: number;
  results: DeskImportResult[];
}

export interface DeskImportResult {
  name: string;
  officeName: string;
  language: string | null;
  type: number;
  isActive: boolean;
  deskId: string;
}

export interface DeskDropdownItem {
  id: string;
  value: string;
  officeName: string;
  language: string | null;
  type: number;
}

export interface DeskDropdownResponse {
  items: DeskDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

// Office-related interfaces for the new dropdown endpoint
export interface OfficeDropdownItem {
  id: string;
  value: string;
  brandName: string;
  country: string;
}

export interface OfficeDropdownRequest {
  brandId?: string | null;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface OfficeDropdownResponse {
  items: OfficeDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
