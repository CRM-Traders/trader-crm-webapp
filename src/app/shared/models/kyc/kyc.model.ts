// src/app/core/models/kyc.model.ts
export enum KycStatus {
  New = 1,
  PartiallyCompleted = 2,
  DocumentsUploaded = 3,
  UnderReview = 4,
  Verified = 5,
  Rejected = 6,
}

export interface KycHistoryItem {
  id: string;
  status: KycStatus;
  createdAt: string;
  reviewedAt: string | null;
  verificationComment: string | null;
  isCurrent: boolean;
}

export interface KycProcess {
  id: string;
  userId: string;
  status: KycStatus;
  sessionToken: string;
  createdAt: string;
  lastActivityTime: string;
  verificationComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  userEmail: string | null;
  userFullName: string | null;
  hasIdFront: boolean;
  hasIdBack: boolean;
  hasPassport: boolean;
  hasFacePhoto: boolean;
  isDocumentationComplete: boolean;
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  lastApprovedDate: string | null;
  history: KycHistoryItem[];
}

export interface KycProcessResponse {
  items: KycProcess[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

export interface KycReviewRequest {
  processId: string;
  status: KycStatus.Verified | KycStatus.Rejected;
  comment: string;
}

export interface KycFilterParams {
  status?: KycStatus;
  userId?: string;
  searchTerm?: string;
  sortBy?: 'createdAt' | 'lastActivityTime' | 'status';
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}
