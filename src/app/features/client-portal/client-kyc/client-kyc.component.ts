import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';
import { HttpService } from '../../../core/services/http.service';

export interface KycProcessInitResponse {
  kycProcessId: string;
  userId: string;
  sessionToken: string;
  userFullName: string;
  continuationUrl: string;
  qrCodeUrl: string;
}

export interface KycUploadRequest {
  kycProcessIdOrToken: string;
  fileType: string;
  file: string;
}

export interface KycUploadResponse {
  documentId: string;
  kycProcessId: string;
  documentType: number;
  fileName: string;
  fileSize: number;
  status: number;
  fileUrl: string;
}

export interface ClientKycDocument {
  id: string;
  documentType: KycDocumentType;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: KycDocumentStatus;
  rejectionReason: string | null;
  createdAt: string;
  fileUrl: string;
  fileSizeFormatted: string | null;
  isImage: boolean;
  isPdf: boolean;
  documentTypeDisplayText: string | null;
  statusDisplayText: string | null;
  statusColorClass: string | null;
  fileExtension: string | null;
  documentTypeIcon: string | null;
}

export interface ActiveKycProcess {
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
  documents: ClientKycDocument[];
  hasFrontNationalId: boolean;
  hasBackNationalId: boolean;
  hasPassport: boolean;
  hasFacePhoto: boolean;
  isDocumentationComplete: boolean;
  userFullName: string | null;
  canBeVerified: boolean;
  isCompleted: boolean;
  documentCount: number;
  lastDocumentUploadDate: string | null;
  statusDisplayText: string | null;
  statusColorClass: string | null;
}

export interface ClientKycStatus {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentKycStatus: KycStatus;
  lastKycCompletedDate: string | null;
  activeProcess: ActiveKycProcess | null;
  documents: ClientKycDocument[];
}

export enum KycStatus {
  NotStarted = 0,
  InProgress = 1,
  DocumentsUploaded = 2,
  UnderReview = 3,
  Verified = 4,
  Rejected = 5,
}

export enum KycDocumentType {
  FrontNationalId = 1,
  BackNationalId = 2,
  Passport = 3,
  FacePhoto = 4,
  ProofOfAddress = 5,
  Other = 99,
}

export enum KycDocumentStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Deleted = 3,
}

interface DocumentUploadState {
  type: KycDocumentType;
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  documentId?: string;
}

@Component({
  selector: 'app-client-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './client-kyc.component.html',
  styleUrls: ['./client-kyc.component.scss'],
})
export class ClientKycComponent implements OnInit {
  private readonly httpService = inject(HttpService);
  private readonly alertService = inject(AlertService);

  private readonly _loading = signal<boolean>(false);
  private readonly _initializing = signal<boolean>(false);
  private readonly _kycStatus = signal<ClientKycStatus | null>(null);
  private readonly _activeProcess = signal<ActiveKycProcess | null>(null);
  private readonly _selectedIdOption = signal<'national-id' | 'passport'>('national-id');

  private readonly _uploads = signal<Record<KycDocumentType, DocumentUploadState>>({
    [KycDocumentType.FacePhoto]: {
      type: KycDocumentType.FacePhoto,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    },
    [KycDocumentType.FrontNationalId]: {
      type: KycDocumentType.FrontNationalId,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    },
    [KycDocumentType.BackNationalId]: {
      type: KycDocumentType.BackNationalId,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    },
    [KycDocumentType.Passport]: {
      type: KycDocumentType.Passport,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    },
    [KycDocumentType.ProofOfAddress]: {
      type: KycDocumentType.ProofOfAddress,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    },
    [KycDocumentType.Other]: {
      type: KycDocumentType.Other,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    },
  });

  // Read-only computed properties
  readonly loading = this._loading.asReadonly();
  readonly initializing = this._initializing.asReadonly();
  readonly kycStatus = this._kycStatus.asReadonly();
  readonly activeProcess = this._activeProcess.asReadonly();
  readonly selectedIdOption = this._selectedIdOption.asReadonly();
  readonly uploads = this._uploads.asReadonly();

  // Computed properties
  readonly currentUserName = computed(() => {
    const status = this._kycStatus();
    return status ? `${status.firstName} ${status.lastName}`.trim() : '';
  });

  readonly isKycCompleted = computed(() => {
    const status = this._kycStatus();
    return status?.currentKycStatus === KycStatus.Verified;
  });

  readonly isKycRejected = computed(() => {
    const status = this._kycStatus();
    return status?.currentKycStatus === KycStatus.Rejected;
  });

  readonly canSubmitForReview = computed(() => {
    const uploads = this._uploads();
    const hasFacePhoto = uploads[KycDocumentType.FacePhoto].uploaded;

    if (this._selectedIdOption() === 'national-id') {
      const hasFrontId = uploads[KycDocumentType.FrontNationalId].uploaded;
      const hasBackId = uploads[KycDocumentType.BackNationalId].uploaded;
      return hasFacePhoto && hasFrontId && hasBackId;
    } else {
      const hasPassport = uploads[KycDocumentType.Passport].uploaded;
      return hasFacePhoto && hasPassport;
    }
  });

  readonly uploadProgress = computed(() => {
    const uploads = this._uploads();
    const requiredUploads = this._selectedIdOption() === 'national-id' ? 3 : 2;

    let completed = 0;
    if (uploads[KycDocumentType.FacePhoto].uploaded) completed++;

    if (this._selectedIdOption() === 'national-id') {
      if (uploads[KycDocumentType.FrontNationalId].uploaded) completed++;
      if (uploads[KycDocumentType.BackNationalId].uploaded) completed++;
    } else {
      if (uploads[KycDocumentType.Passport].uploaded) completed++;
    }

    return Math.round((completed / requiredUploads) * 100);
  });

  // Expose enums for template
  readonly KycStatus = KycStatus;
  readonly KycDocumentType = KycDocumentType;
  readonly KycDocumentStatus = KycDocumentStatus;

  ngOnInit(): void {
    this.initializeKycProcess();
  }

  private async initializeKycProcess(): Promise<void> {
    this._initializing.set(true);

    try {
      const processResponse = await this.httpService
        .post<KycProcessInitResponse>('identity/api/kyc/process', {})
        .toPromise();

      if (processResponse) {
        await this.loadKycStatus();
      }
    } catch (error) {
      this.alertService.error('Failed to initialize KYC process. Please try again.');
    } finally {
      this._initializing.set(false);
    }
  }

  private async loadKycStatus(): Promise<void> {
    this._loading.set(true);

    try {
      const statusResponse = await this.httpService
        .get<ClientKycStatus>('identity/api/kyc/users/status')
        .toPromise();

      if (statusResponse) {
        this._kycStatus.set(statusResponse);
        this._activeProcess.set(statusResponse.activeProcess);
        this.updateUploadStatesFromDocuments(statusResponse.activeProcess?.documents || []);
      }
    } catch (error) {
      this.alertService.error('Failed to load KYC status. Please refresh the page.');
    } finally {
      this._loading.set(false);
    }
  }

  private updateUploadStatesFromDocuments(documents: ClientKycDocument[]): void {
    const currentUploads = { ...this._uploads() };

    documents.forEach((doc) => {
      if (currentUploads[doc.documentType]) {
        currentUploads[doc.documentType] = {
          ...currentUploads[doc.documentType],
          uploaded: true,
          documentId: doc.id,
        };
      }
    });

    this._uploads.set(currentUploads);
  }

  onIdOptionChange(option: 'national-id' | 'passport'): void {
    this._selectedIdOption.set(option);

    // Clear uploads for the non-selected option to prevent confusion
    const currentUploads = { ...this._uploads() };

    if (option === 'national-id') {
      // Clear passport upload if switching to national ID
      if (!currentUploads[KycDocumentType.Passport].uploaded) {
        currentUploads[KycDocumentType.Passport] = {
          type: KycDocumentType.Passport,
          file: null,
          uploading: false,
          uploaded: false,
          error: null,
        };
      }
    } else {
      // Clear national ID uploads if switching to passport
      if (!currentUploads[KycDocumentType.FrontNationalId].uploaded) {
        currentUploads[KycDocumentType.FrontNationalId] = {
          type: KycDocumentType.FrontNationalId,
          file: null,
          uploading: false,
          uploaded: false,
          error: null,
        };
      }
      if (!currentUploads[KycDocumentType.BackNationalId].uploaded) {
        currentUploads[KycDocumentType.BackNationalId] = {
          type: KycDocumentType.BackNationalId,
          file: null,
          uploading: false,
          uploaded: false,
          error: null,
        };
      }
    }

    this._uploads.set(currentUploads);
  }

  onFileSelected(event: Event, documentType: KycDocumentType): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!this.validateFile(file, documentType)) {
      input.value = '';
      return;
    }

    const currentUploads = { ...this._uploads() };
    currentUploads[documentType] = {
      ...currentUploads[documentType],
      file: file,
      error: null,
      uploaded: false, // Reset uploaded state when new file is selected
    };
    this._uploads.set(currentUploads);
  }

  private validateFile(file: File, documentType: KycDocumentType): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.alertService.error('File size must be less than 10MB');
      return false;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.alertService.error('Only JPEG, PNG, and PDF files are allowed');
      return false;
    }

    return true;
  }

  async uploadDocument(documentType: KycDocumentType): Promise<void> {
    const uploadState = this._uploads()[documentType];

    if (!uploadState.file || !this._activeProcess()) {
      return;
    }

    const currentUploads = { ...this._uploads() };
    currentUploads[documentType] = {
      ...currentUploads[documentType],
      uploading: true,
      error: null,
    };
    this._uploads.set(currentUploads);

    try {
      const fileTypeString = this.mapDocumentTypeToFileType(documentType);
      const formData = new FormData();
      formData.append('KycProcessIdOrToken', this._activeProcess()!.id);
      formData.append('FileType', fileTypeString);
      formData.append('File', uploadState.file);

      const result = await this.httpService
        .postForm<KycUploadResponse>('identity/api/kyc/upload', formData, undefined)
        .toPromise();

      if (result) {
        currentUploads[documentType] = {
          ...currentUploads[documentType],
          uploading: false,
          uploaded: true,
          documentId: result.documentId,
          file: null, // Clear file after successful upload
        };
        this._uploads.set(currentUploads);

        this.alertService.success(`${this.getDocumentTypeLabel(documentType)} uploaded successfully`);
        await this.loadKycStatus();
      }
    } catch (error) {
      currentUploads[documentType] = {
        ...currentUploads[documentType],
        uploading: false,
        error: 'Upload failed. Please try again.',
      };
      this._uploads.set(currentUploads);

      this.alertService.error(`Failed to upload ${this.getDocumentTypeLabel(documentType)}`);
    }
  }

  private mapDocumentTypeToFileType(documentType: KycDocumentType): string {
    switch (documentType) {
      case KycDocumentType.FacePhoto: return '4';
      case KycDocumentType.FrontNationalId: return '1';
      case KycDocumentType.BackNationalId: return '2';
      case KycDocumentType.Passport: return '3';
      case KycDocumentType.ProofOfAddress: return '5';
      case KycDocumentType.Other: return '99';
      default: return '99';
    }
  }

  removeDocument(documentType: KycDocumentType): void {
    const currentUploads = { ...this._uploads() };
    currentUploads[documentType] = {
      type: documentType,
      file: null,
      uploading: false,
      uploaded: false,
      error: null,
    };
    this._uploads.set(currentUploads);
  }

  getDocumentTypeLabel(type: KycDocumentType): string {
    switch (type) {
      case KycDocumentType.FrontNationalId: return 'National ID (Front)';
      case KycDocumentType.BackNationalId: return 'National ID (Back)';
      case KycDocumentType.Passport: return 'Passport';
      case KycDocumentType.FacePhoto: return 'Selfie Photo';
      case KycDocumentType.ProofOfAddress: return 'Proof of Address';
      case KycDocumentType.Other: return 'Other Document';
      default: return 'Unknown';
    }
  }

  getStatusLabel(status: KycStatus): string {
    switch (status) {
      case KycStatus.NotStarted: return 'Not Started';
      case KycStatus.InProgress: return 'In Progress';
      case KycStatus.DocumentsUploaded: return 'Documents Uploaded';
      case KycStatus.UnderReview: return 'Under Review';
      case KycStatus.Verified: return 'Verified';
      case KycStatus.Rejected: return 'Rejected';
      default: return 'Unknown';
    }
  }

  getStatusColor(status: KycStatus): string {
    switch (status) {
      case KycStatus.NotStarted: return 'bg-gray-100 text-gray-800';
      case KycStatus.InProgress: return 'bg-blue-100 text-blue-800';
      case KycStatus.DocumentsUploaded: return 'bg-yellow-100 text-yellow-800';
      case KycStatus.UnderReview: return 'bg-orange-100 text-orange-800';
      case KycStatus.Verified: return 'bg-green-100 text-green-800';
      case KycStatus.Rejected: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  async submitForReview(): Promise<void> {
    if (!this.canSubmitForReview()) {
      this.alertService.warning('Please upload all required documents before submitting for review');
      return;
    }

    try {
      this._loading.set(true);
      await this.loadKycStatus();
      this.alertService.success('Documents submitted for review successfully');
    } catch (error) {
      this.alertService.error('Failed to submit documents for review');
    } finally {
      this._loading.set(false);
    }
  }

  refreshStatus(): void {
    this.loadKycStatus();
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
