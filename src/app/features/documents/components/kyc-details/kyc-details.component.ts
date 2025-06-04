import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HttpService } from '../../../../core/services/http.service';
import { StorageService } from '../../../../core/services/storage.service';
import { HttpParams } from '@angular/common/http';

// Enhanced KYC Models for Details View
export interface KycDocument {
  id: string;
  documentType: KycDocumentType;
  fileStorageId: string;
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

export interface KycProcessDetails {
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
  userFullName: string | null;
  canBeVerified: boolean;
  isCompleted: boolean;
  documentCount: number;
  lastDocumentUploadDate: string | null;
  statusDisplayText: string | null;
  statusColorClass: string | null;
}

export interface VerificationRequest {
  kycProcessId: string;
  isApproved: boolean;
  comment: string;
}

export interface VerificationResponse {
  kycProcessId: string;
  status: number;
  comment: string | null;
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

@Component({
  selector: 'app-kyc-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './kyc-details.component.html',
  styleUrls: ['./kyc-details.component.scss'],
})
export class KycDetailsComponent implements OnInit {
  private readonly httpService = inject(HttpService);
  private readonly alertService = inject(AlertService);
  private readonly storageService = inject(StorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  // Signals for reactive state
  private readonly _process = signal<KycProcessDetails | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _verifying = signal<boolean>(false);
  private readonly _selectedDocument = signal<KycDocument | null>(null);
  private readonly _showPreview = signal<boolean>(false);
  private readonly _showVerificationModal = signal<boolean>(false);
  private readonly _previewUrl = signal<SafeUrl | null>(null);

  // Read-only computed properties
  readonly process = this._process.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly verifying = this._verifying.asReadonly();
  readonly selectedDocument = this._selectedDocument.asReadonly();
  readonly showPreview = this._showPreview.asReadonly();
  readonly showVerificationModal = this._showVerificationModal.asReadonly();
  readonly previewUrl = this._previewUrl.asReadonly();

  // Computed properties
  readonly userFullName = computed(() => {
    const proc = this._process();
    return proc ? `${proc.userFirstName} ${proc.userLastName}` : '';
  });

  readonly documentsByType = computed(() => {
    const proc = this._process();
    if (!proc) return {};

    return proc.documents.reduce((acc, doc) => {
      const type = doc.documentType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(doc);
      return acc;
    }, {} as Record<KycDocumentType, KycDocument[]>);
  });

  readonly canVerify = computed(() => {
    const proc = this._process();
    return proc?.canBeVerified;
  });

  // Forms
  verificationForm: FormGroup;

  // Expose enums for template
  readonly KycStatus = KycStatus;
  readonly KycDocumentType = KycDocumentType;
  readonly KycDocumentStatus = KycDocumentStatus;

  constructor() {
    this.verificationForm = this.formBuilder.group({
      isApproved: [true, Validators.required],
      comment: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(1000),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.loadProcessDetails(id);
      }
    });
  }

  loadProcessDetails(id: string): void {
    this._loading.set(true);

    this.httpService
      .get<KycProcessDetails>(`identity/api/kyc/process/${id}`)
      .subscribe({
        next: (response) => {
          this._process.set(response);
          this._loading.set(false);
        },
        error: (error) => {
          this.alertService.error('Failed to load KYC process details');
          this._loading.set(false);
          this.router.navigate(['/documents']);
        },
      });
  }

  openDocumentPreview(document: KycDocument): void {
    this._selectedDocument.set(document);
    if (document.isImage || document.isPdf) {
      this.loadDocumentPreview(document);
    }
  }

  private loadDocumentPreview(document: KycDocument): void {
    this.httpService
      .getFile(`storage/api/files/${document.fileStorageId}`)
      .subscribe((result: any) => {
        const url = URL.createObjectURL(result);

        this._previewUrl.set(url);
        this._showPreview.set(true);
      });
  }

  downloadDocument(document: KycDocument): void {
    this.storageService.downloadFileAndSave(
      document.fileStorageId,
      document.fileName
    );
  }

  closePreview(): void {
    this._showPreview.set(false);
    this._selectedDocument.set(null);
    const currentUrl = this._previewUrl();
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl.toString());
      this._previewUrl.set(null);
    }
  }

  openVerificationModal(): void {
    this._showVerificationModal.set(true);
    this.verificationForm.reset({
      isApproved: true,
      comment: '',
    });
  }

  closeVerificationModal(): void {
    this._showVerificationModal.set(false);
    this.verificationForm.reset();
  }

  onVerificationSubmit(): void {
    if (this.verificationForm.valid && this._process()) {
      this._verifying.set(true);

      const formValue = this.verificationForm.value;
      const request: VerificationRequest = {
        kycProcessId: this._process()!.id,
        isApproved: formValue.isApproved,
        comment: formValue.comment,
      };

      this.httpService
        .post<VerificationResponse>('identity/api/kyc/verify', request)
        .subscribe({
          next: (response) => {
            this._verifying.set(false);
            this.closeVerificationModal();

            const action = request.isApproved ? 'approved' : 'rejected';
            this.alertService.success(
              `KYC process has been ${action} successfully`
            );

            // Reload the process details to reflect changes
            this.loadProcessDetails(this._process()!.id);
          },
          error: (error) => {
            this._verifying.set(false);
            this.alertService.error('Failed to process verification request');
          },
        });
    }
  }

  getStatusLabel(status: KycStatus): string {
    switch (status) {
      case KycStatus.NotStarted:
        return 'Not Started';
      case KycStatus.InProgress:
        return 'In Progress';
      case KycStatus.DocumentsUploaded:
        return 'Documents Uploaded';
      case KycStatus.UnderReview:
        return 'Under Review';
      case KycStatus.Verified:
        return 'Verified';
      case KycStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getStatusColor(status: KycStatus): string {
    switch (status) {
      case KycStatus.NotStarted:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case KycStatus.InProgress:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case KycStatus.DocumentsUploaded:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KycStatus.UnderReview:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case KycStatus.Verified:
        return 'bg-green-100 text-green-800 border-green-300';
      case KycStatus.Rejected:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getDocumentTypeLabel(type: KycDocumentType): string {
    switch (type) {
      case KycDocumentType.FrontNationalId:
        return 'National ID (Front)';
      case KycDocumentType.BackNationalId:
        return 'National ID (Back)';
      case KycDocumentType.Passport:
        return 'Passport';
      case KycDocumentType.FacePhoto:
        return 'Face Photo';
      case KycDocumentType.ProofOfAddress:
        return 'Proof of Address';
      case KycDocumentType.Other:
        return 'Other Document';
      default:
        return 'Unknown';
    }
  }

  getDocumentStatusColor(status: KycDocumentStatus): string {
    switch (status) {
      case KycDocumentStatus.Pending:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KycDocumentStatus.Approved:
        return 'bg-green-100 text-green-800 border-green-300';
      case KycDocumentStatus.Rejected:
        return 'bg-red-100 text-red-800 border-red-300';
      case KycDocumentStatus.Deleted:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getDocumentStatusLabel(status: KycDocumentStatus): string {
    switch (status) {
      case KycDocumentStatus.Pending:
        return 'Pending';
      case KycDocumentStatus.Approved:
        return 'Approved';
      case KycDocumentStatus.Rejected:
        return 'Rejected';
      case KycDocumentStatus.Deleted:
        return 'Deleted';
      default:
        return 'Unknown';
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  goBack(): void {
    this.router.navigate(['/documents']);
  }
}
