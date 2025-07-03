// src/app/features/brands/models/brand.model.ts

export interface Brand {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  desksCount?: number;
  officeName: string;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt?: Date | null;
  lastModifiedBy?: string | null;
}

export interface BrandCreateRequest {
  name: string;
  country?: string;
  officeId?: string;
  isActive?: boolean;
}

export interface BrandUpdateRequest {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
}

export interface BrandsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface BrandStatsMetaData {
  value: BrandStats;
}

export interface BrandStats {
  totalBrands: number;
  activeBrands: number;
}

export interface BrandCreateResponse {
  brandId: string;
  message?: string;
}

export interface BrandImportResponse {
  successCount: number;
  failureCount: number;
  results: BrandImportResult[];
}

export interface BrandImportResult {
  name: string;
  brandId: string;
  isActive: boolean;
}

export interface BrandDropdownItem {
  id: string;
  value: string;
}

export interface BrandDropdownResponse {
  items: BrandDropdownItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BrandDropdownRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}
