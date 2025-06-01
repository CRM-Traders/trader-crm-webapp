export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string | null;
  skype: string | null;
  country: string | null;
  language: string | null;
  dateOfBirth: string | null;
  status: LeadStatus;
  kycStatusId: string | null;
  salesStatus: string | null;
  isProblematic: boolean;
  isBonusAbuser: boolean;
  bonusAbuserReason: string | null;
  hasInvestments: boolean;
  affiliateId: string;
  affiliateName: string | null;
  ftdTime: string | null;
  ltdTime: string | null;
  qualificationTime: string | null;
  registrationDate: string;
  registrationIP: string | null;
  source: string | null;
  lastLogin: string | null;
  lastCommunication: string | null;
}

export interface LeadCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  telephone?: string;
  country?: string;
  language?: string;
  dateOfBirth?: string;
  source?: string;
}

export interface LeadUpdateRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  telephone?: string | null;
  secondTelephone?: string | null;
  skype?: string | null;
  country?: string | null;
  language?: string | null;
  dateOfBirth?: string | null;
}

export interface LeadsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface LeadImportResult {
  firstName: string;
  lastName: string;
  email: string;
  generatedPassword: string;
  clientId: string;
  userId: string;
  affiliateId: string;
}

export interface LeadImportResponse {
  successCount: number;
  failureCount: number;
  clientResults: LeadImportResult[];
}

export enum LeadStatus {
  Active = 1,
  Inactive = 0,
  Suspended = 2,
  Closed = 3,
}

export const LeadStatusLabels: Record<LeadStatus, string> = {
  [LeadStatus.Active]: 'Active',
  [LeadStatus.Inactive]: 'Inactive',
  [LeadStatus.Suspended]: 'Suspended',
  [LeadStatus.Closed]: 'Closed',
};

export const LeadStatusColors: Record<LeadStatus, string> = {
  [LeadStatus.Active]: 'bg-green-100 text-green-800',
  [LeadStatus.Inactive]: 'bg-gray-100 text-gray-800',
  [LeadStatus.Suspended]: 'bg-yellow-100 text-yellow-800',
  [LeadStatus.Closed]: 'bg-red-100 text-red-800',
};
