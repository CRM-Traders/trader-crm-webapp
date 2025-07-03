export interface Office {
  id: string;
  value: string;
}

export interface BrandDropdownResponse {
  items: Office[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface SetBrandResponse {
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  name: string;
  exp: number;
  tradingAccountId: string | null;
  selectedBrandId: string | null;
  requiresTwoFactor: boolean;
}
