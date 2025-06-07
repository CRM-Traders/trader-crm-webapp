export interface Affiliate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  isActive: boolean;
  createdAt: string;
  lastModifiedAt: string | null;
  clientsCount: number;
}

export interface AffiliateCreateRequest {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  website?: string;
}

export interface AffiliateCreateResponse {
  affiliateId: string;
  userId: string;
  generatedPassword: string; // Added response structure
}

export interface AffiliateUpdateRequest {
  id: string;
  phone: string | null;
  website: string | null;
}

export interface AffiliatesListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface AffiliateImportResult {
  name: string;
  email: string;
  generatedPassword: string;
  affiliateId: string;
  userId: string;
}

export interface AffiliateImportResponse {
  successCount: number;
  failureCount: number;
  affiliateResults: AffiliateImportResult[];
}
