// src/app/features/brands/models/brand.model.ts

export interface Brand {
  id: string;
  name: string;
  isActive: boolean;
  departmentsCount?: number;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt?: Date | null;
  lastModifiedBy?: string | null;
}

export interface BrandCreateRequest {
  name: string;
  isActive?: boolean;
}

export interface BrandUpdateRequest {
  id: string;
  name: string;
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
