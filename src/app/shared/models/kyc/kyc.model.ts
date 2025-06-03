// src/app/core/models/kyc.model.ts
export enum KycStatus {
  NotStarted = 0,
  InProgress = 1,
  DocumentsUploaded = 2,
  UnderReview = 3,
  Verified = 4,
  Rejected = 5,
}

export interface KycHistoryItem {
  id: string;
  status: KycStatus;
  createdAt: string;
  reviewedAt: string | null;
  verificationComment: string | null;
  isCurrent: boolean;
}

export interface KycDocument {
  id: string;
  documentType: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: number;
  rejectionReason: string | null;
  createdAt: string;
  fileUrl: string;
  fileSizeFormatted: string;
  isImage: boolean;
  isPdf: boolean;
  documentTypeDisplayText: string;
  statusDisplayText: string;
  statusColorClass: string;
  fileExtension: string;
  documentTypeIcon: string;
}

// For detailed process view (individual process)
export interface KycProcessDetail {
  id: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  status: KycStatus;
  sessionToken: string;
  createdAt: string;
  lastActivityTime: string;
  verificationComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  documents: KycDocument[];
  hasFrontNationalId: boolean;
  hasBackNationalId: boolean;
  hasPassport: boolean;
  hasFacePhoto: boolean;
  isDocumentationComplete: boolean;
  userFullName: string;
  canBeVerified: boolean;
  isCompleted: boolean;
  documentCount: number;
  lastDocumentUploadDate: string | null;
  statusDisplayText: string;
  statusColorClass: string;
}

// For list view (matches network response structure)
export interface KycProcessListItem {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  status: KycStatus;
  sessionToken: string;
  createdAt: string;
  lastActivityTime: string;
  verificationComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  hasFrontIdDocument: boolean;
  hasBackIdDocument: boolean;
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
  items: KycProcessListItem[];
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
