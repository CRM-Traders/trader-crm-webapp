export interface Office {
  id: string;
  name: string;
  country?: string;
  // brandId: string;
  // brandName: string;
  isActive: boolean;
  brandsCount: number;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt?: Date | null;
  lastModifiedBy?: string | null;
}

export interface OfficeCreateRequest {
  name: string;
  country: string;
  isActive?: boolean;
}

export interface OfficeUpdateRequest {
  id: string;
  name: string;
  country: string;
  brandId: string;
  isActive: boolean;
}

export interface OfficesListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface OfficeStatsMetaData {
  value: OfficeStats;
}

export interface OfficeStats {
  totalOffices: number;
  activeOffices: number;
  totalDesks: number;
}

export interface OfficeCreateResponse {
  officeId: string;
  message?: string;
}

export interface OfficeImportResponse {
  successCount: number;
  failureCount: number;
  results: OfficeImportResult[];
}

export interface OfficeImportResult {
  name: string;
  country: string;
  brandName: string;
  isActive: boolean;
  officeId: string;
}

export interface OfficeDropdownItem {
  id: string;
  value: string;
  country: string;
  brandName: string;
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
