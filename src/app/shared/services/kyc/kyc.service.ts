// src/app/shared/services/kyc/kyc.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { HttpService } from '../../../core/services/http.service';
import {
  KycProcess,
  KycStatus,
  DocumentType,
  DocumentStatus,
  UserKycStatus,
  CreateKycProcessResponse,
  VerifyKycRequest,
  VerifyKycResponse,
  UploadKycDocumentRequest,
  UploadKycDocumentResponse,
  QrCodeResponse,
  KycFilterParams,
  KycProcessResponse,
} from '../../models/kyc/kyc.model';

@Injectable({
  providedIn: 'root',
})
export class KycService {
  private readonly http = inject(HttpService);
  private readonly baseEndpoint = 'identity/api/kyc';

  /**
   * Creates a new KYC verification process
   */
  createProcess(): Observable<CreateKycProcessResponse> {
    return this.http.post<CreateKycProcessResponse>(
      `${this.baseEndpoint}/process`,
      {}
    );
  }

  /**
   * Gets KYC process by ID or token
   */
  getProcessById(idOrToken: string): Observable<KycProcess> {
    return this.http.get<KycProcess>(
      `${this.baseEndpoint}/process/${idOrToken}`
    );
  }

  /**
   * Gets user's KYC status and active process
   */
  getUserKycStatus(userId: string): Observable<UserKycStatus> {
    return this.http.get<UserKycStatus>(
      `${this.baseEndpoint}/users/${userId}/status`
    );
  }

  getAuthKycStatus(): Observable<UserKycStatus> {
    return this.http.get<UserKycStatus>(`${this.baseEndpoint}/users/status`);
  }

  /**
   * Gets QR code information for a process
   */
  getQrCode(idOrToken: string): Observable<QrCodeResponse> {
    return this.http.get<QrCodeResponse>(
      `${this.baseEndpoint}/qr/${idOrToken}`
    );
  }

  /**
   * Uploads a document for KYC verification
   */
  uploadKycFile(
    request: UploadKycDocumentRequest
  ): Observable<UploadKycDocumentResponse> {
    const formData = new FormData();
    formData.append('KycProcessIdOrToken', request.kycProcessIdOrToken);
    formData.append('FileType', request.fileType);
    formData.append('File', request.file);

    return this.http.post<UploadKycDocumentResponse>(
      `${this.baseEndpoint}/upload`,
      formData
    );
  }

  /**
   * Reviews and approves/rejects a KYC process
   */
  reviewProcess(request: VerifyKycRequest): Observable<VerifyKycResponse> {
    const body = {
      kycProcessId: request.kycProcessId,
      isApproved: request.isApproved,
      comment: request.comment,
    };

    return this.http.post<VerifyKycResponse>(
      `${this.baseEndpoint}/verify`,
      body
    );
  }

  /**
   * Gets paginated list of KYC processes with filtering
   */
  getProcesses(params: KycFilterParams = {}): Observable<KycProcessResponse> {
    let httpParams = new HttpParams();

    if (params.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }
    if (params.status !== undefined) {
      httpParams = httpParams.set('status', params.status.toString());
    }
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params.sortDescending !== undefined) {
      httpParams = httpParams.set(
        'sortDescending',
        params.sortDescending.toString()
      );
    }
    if (params.pageNumber) {
      httpParams = httpParams.set('pageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    return this.http.get<KycProcessResponse>(
      `${this.baseEndpoint}/processes`,
      httpParams
    );
  }

  /**
   * Updates KYC process status
   */
  updateProcessStatus(processId: string, status: KycStatus): Observable<void> {
    return this.http.patch<void>(
      `${this.baseEndpoint}/process/${processId}/status`,
      { status }
    );
  }

  /**
   * Helper methods for UI display
   */
  getStatusLabel(status: KycStatus): string {
    const statusLabels: Record<KycStatus, string> = {
      [KycStatus.NotStarted]: 'Not Started',
      [KycStatus.InProgress]: 'In Progress',
      [KycStatus.DocumentsUploaded]: 'Documents Uploaded',
      [KycStatus.UnderReview]: 'Under Review',
      [KycStatus.Verified]: 'Verified',
      [KycStatus.Rejected]: 'Rejected',
    };
    return statusLabels[status] || 'Unknown';
  }

  getStatusColor(status: KycStatus): string {
    const statusColors: Record<KycStatus, string> = {
      [KycStatus.NotStarted]: 'gray',
      [KycStatus.InProgress]: 'blue',
      [KycStatus.DocumentsUploaded]: 'yellow',
      [KycStatus.UnderReview]: 'orange',
      [KycStatus.Verified]: 'green',
      [KycStatus.Rejected]: 'red',
    };
    return statusColors[status] || 'gray';
  }

  getDocumentTypeLabel(documentType: DocumentType): string {
    const typeLabels: Record<DocumentType, string> = {
      [DocumentType.IdFront]: 'ID Front',
      [DocumentType.IdBack]: 'ID Back',
      [DocumentType.PassportMain]: 'Passport',
      [DocumentType.FacePhoto]: 'Face Photo',
    };
    return typeLabels[documentType] || 'Unknown';
  }

  getDocumentStatusLabel(status: DocumentStatus): string {
    const statusLabels: Record<DocumentStatus, string> = {
      [DocumentStatus.Pending]: 'Pending',
      [DocumentStatus.Approved]: 'Approved',
      [DocumentStatus.Rejected]: 'Rejected',
    };
    return statusLabels[status] || 'Unknown';
  }

  getDocumentStatusColor(status: DocumentStatus): string {
    const statusColors: Record<DocumentStatus, string> = {
      [DocumentStatus.Pending]: 'yellow',
      [DocumentStatus.Approved]: 'green',
      [DocumentStatus.Rejected]: 'red',
    };
    return statusColors[status] || 'gray';
  }

  calculateCompletionPercentage(process: KycProcess): number {
    const totalDocuments = 4; // ID Front, ID Back, Passport, Face Photo
    let completedDocuments = 0;

    if (process.hasFrontNationalId) completedDocuments++;
    if (process.hasBackNationalId) completedDocuments++;
    if (process.hasPassport) completedDocuments++;
    if (process.hasFacePhoto) completedDocuments++;

    return Math.round((completedDocuments / totalDocuments) * 100);
  }

  isProcessEditable(status: KycStatus): boolean {
    return (
      status === KycStatus.NotStarted ||
      status === KycStatus.InProgress ||
      status === KycStatus.Rejected
    );
  }

  isProcessReviewable(status: KycStatus): boolean {
    return (
      status === KycStatus.DocumentsUploaded || status === KycStatus.UnderReview
    );
  }

  canUploadDocuments(process: KycProcess): boolean {
    return this.isProcessEditable(process.status);
  }

  getDocumentTypeFromFileType(fileType: any): DocumentType {
    // Map the old FileType enum to new DocumentType enum
    const fileTypeMap: Record<string, DocumentType> = {
      IdFront: DocumentType.IdFront,
      IdBack: DocumentType.IdBack,
      PassportMain: DocumentType.PassportMain,
      FacePhoto: DocumentType.FacePhoto,
    };

    if (typeof fileType === 'number') {
      return fileType as DocumentType;
    }

    return fileTypeMap[fileType] || DocumentType.IdFront;
  }

  getFileTypeFromDocumentType(documentType: DocumentType): string {
    const documentTypeMap: Record<DocumentType, string> = {
      [DocumentType.IdFront]: 'IdFront',
      [DocumentType.IdBack]: 'IdBack',
      [DocumentType.PassportMain]: 'PassportMain',
      [DocumentType.FacePhoto]: 'FacePhoto',
    };
    return documentTypeMap[documentType] || 'IdFront';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }
}
