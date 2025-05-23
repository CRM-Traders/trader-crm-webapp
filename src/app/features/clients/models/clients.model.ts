// src/app/features/clients/models/clients.model.ts

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string | null;
  secondTelephone: string | null;
  skype: string | null;
  country: string | null;
  language: string | null;
  dateOfBirth: string | null;
  status: ClientStatus;
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

export interface ClientCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  affiliateId: string;
  telephone?: string;
  country?: string;
  language?: string;
  dateOfBirth?: string;
  source?: string;
}

export interface ClientUpdateRequest {
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

export interface ClientsListRequest {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string | null;
  sortDirection?: 'asc' | 'desc' | null;
  visibleColumns?: string[] | null;
  globalFilter?: string | null;
  filters?: Record<string, any> | null;
}

export interface ClientImportResult {
  firstName: string;
  lastName: string;
  email: string;
  generatedPassword: string;
  clientId: string;
  userId: string;
  affiliateId: string;
}

export interface ClientImportResponse {
  successCount: number;
  failureCount: number;
  clientResults: ClientImportResult[];
}

export enum ClientStatus {
  Active = 1,
  Inactive = 0,
  Suspended = 2,
  Closed = 3,
}

export const ClientStatusLabels: Record<ClientStatus, string> = {
  [ClientStatus.Active]: 'Active',
  [ClientStatus.Inactive]: 'Inactive',
  [ClientStatus.Suspended]: 'Suspended',
  [ClientStatus.Closed]: 'Closed',
};

export const ClientStatusColors: Record<ClientStatus, string> = {
  [ClientStatus.Active]: 'bg-green-100 text-green-800',
  [ClientStatus.Inactive]: 'bg-gray-100 text-gray-800',
  [ClientStatus.Suspended]: 'bg-yellow-100 text-yellow-800',
  [ClientStatus.Closed]: 'bg-red-100 text-red-800',
};
