// // src/app/shared/models/kyc/kyc.model.ts

// export enum KycStatus {
//   NotStarted = 0,
//   InProgress = 1,
//   DocumentsUploaded = 2,
//   UnderReview = 3,
//   Verified = 4,
//   Rejected = 5,
// }

// export enum DocumentType {
//   IdFront = 1,
//   IdBack = 2,
//   PassportMain = 3,
//   FacePhoto = 4,
// }

// export enum DocumentStatus {
//   Pending = 1,
//   Approved = 2,
//   Rejected = 3,
// }

// export interface KycDocument {
//   id: string;
//   documentType: DocumentType;
//   fileName: string;
//   fileSize: number;
//   contentType: string;
//   status: DocumentStatus;
//   rejectionReason: string | null;
//   createdAt: string;
//   fileUrl: string;
//   fileSizeFormatted: string | null;
//   isImage: boolean;
//   isPdf: boolean;
//   documentTypeDisplayText: string | null;
//   statusDisplayText: string | null;
//   statusColorClass: string | null;
//   fileExtension: string | null;
//   documentTypeIcon: string | null;
// }

// export interface KycProcess {
//   id: string;
//   userId: string;
//   userFirstName: string;
//   userLastName: string;
//   userEmail: string;
//   status: KycStatus;
//   sessionToken: string;
//   createdAt: string;
//   lastActivityTime: string;
//   verificationComment: string | null;
//   reviewedBy: string | null;
//   reviewedAt: string | null;
//   documents: KycDocument[];
//   hasFrontNationalId: boolean;
//   hasBackNationalId: boolean;
//   hasPassport: boolean;
//   hasFacePhoto: boolean;
//   isDocumentationComplete: boolean;
//   userFullName: string | null;
//   canBeVerified: boolean;
//   isCompleted: boolean;
//   documentCount: number;
//   lastDocumentUploadDate: string | null;
//   statusDisplayText: string | null;
//   statusColorClass: string | null;
// }

// export interface UserKycStatus {
//   userId: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   currentKycStatus: KycStatus;
//   lastKycCompletedDate: string | null;
//   activeProcess: KycProcess | null;
//   documents: KycDocument[];
// }

// export interface CreateKycProcessResponse {
//   kycProcessId: string;
//   userId: string;
//   sessionToken: string;
//   userFullName: string;
//   continuationUrl: string;
//   qrCodeUrl: string;
// }

// export interface VerifyKycRequest {
//   kycProcessId: string;
//   isApproved: boolean;
//   comment?: string;
// }

// export interface VerifyKycResponse {
//   kycProcessId: string;
//   status: KycStatus;
//   comment: string | null;
// }

// export interface UploadKycDocumentRequest {
//   kycProcessIdOrToken: string;
//   fileType: string;
//   file: File;
// }

// export interface UploadKycDocumentResponse {
//   documentId: string;
//   kycProcessId: string;
//   documentType: DocumentType;
//   fileName: string;
//   fileSize: number;
//   status: DocumentStatus;
//   fileUrl: string;
// }

// export interface QrCodeResponse {
//   kycProcessId: string;
//   sessionToken: string;
//   continuationUrl: string;
// }

// export interface KycFilterParams {
//   searchTerm?: string;
//   status?: KycStatus;
//   sortBy?: string;
//   sortDescending?: boolean;
//   pageNumber?: number;
//   pageSize?: number;
// }

// export interface KycProcessResponse {
//   items: KycProcess[];
//   totalCount: number;
//   totalPages: number;
//   currentPage: number;
//   pageSize: number;
//   statusCounts: Record<string, number>;
// }

// src/app/shared/models/kyc/kyc-process.model.ts

export enum KycStatus {
  NotStarted = 0,
  InProgress = 1,
  DocumentsUploaded = 2,
  UnderReview = 3,
  Verified = 4,
  Rejected = 5,
}

export enum DocumentType {
  IdFront = 1,
  IdBack = 2,
  PassportMain = 3,
  FacePhoto = 4,
}

export enum DocumentStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

export interface KycHistoryItem {
  id: string;
  status: KycStatus;
  createdAt: string;
  reviewedAt: string | null;
  verificationComment: string | null;
  isCurrent: boolean;
}

export interface KycProcessBase {
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
}

export interface KycProcessListItem extends KycProcessBase {
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  lastApprovedDate: string | null;
  history: KycHistoryItem[];
}

export interface KycDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  fileId: string;
  fileName: string;
  uploadedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface KycProcessDetail extends KycProcessBase {
  documents: KycDocument[];
  submissionHistory: KycHistoryItem[];
}

export interface KycReviewRequest {
  processId: string;
  status: KycStatus;
  comment: string;
}

export interface KycProcessStats {
  totalProcesses: number;
  pendingReview: number;
  verified: number;
  rejected: number;
  completionRate: number;
}

export interface KycStatusSummary {
  status: KycStatus;
  count: number;
  percentage: number;
  color: string;
}

// Utility interfaces for UI components
export interface DocumentTypeInfo {
  type: DocumentType;
  label: string;
  icon: string;
  required: boolean;
  hasDocument: boolean;
  files: any[];
}

export interface KycProcessCard {
  id: string;
  userInfo: {
    fullName: string;
    email: string;
    userId: string;
  };
  status: KycStatus;
  progress: {
    completionPercentage: number;
    documentsUploaded: number;
    totalRequiredDocuments: number;
  };
  timestamps: {
    createdAt: string;
    lastActivity: string;
    reviewedAt: string | null;
  };
  statistics: {
    totalSubmissions: number;
    approvedCount: number;
    rejectedCount: number;
  };
  actions: {
    canReview: boolean;
    canEdit: boolean;
    canView: boolean;
  };
}
