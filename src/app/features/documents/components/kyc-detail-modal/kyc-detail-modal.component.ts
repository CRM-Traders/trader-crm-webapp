import { Component, Input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../../../core/services/storage.service';
import { AlertService } from '../../../../core/services/alert.service';
import { FileMetadata, FileType } from '../../../../core/models/storage.model';
import { FilePreviewComponent } from '../../../../shared/components/file-preview/file-preview.component';
import {
  KycProcessListItem,
  KycProcessDetail,
  KycStatus,
} from '../../../../shared/models/kyc/kyc.model';
import { KycService } from '../../../../shared/services/kyc/kyc.service';

@Component({
  selector: 'app-kyc-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewComponent],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      (click)="onClose()"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <div
          class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            KYC Process Details
          </h2>
          <button
            (click)="onClose()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <div class="px-6 py-4 overflow-y-auto flex-1">
          <!-- User Information -->
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              User Information
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >Name:</span
                >
                <span class="text-gray-900 dark:text-white font-medium">{{
                  process.userFullName || 'N/A'
                }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >Email:</span
                >
                <span class="text-gray-900 dark:text-white font-medium">{{
                  process.userEmail || 'N/A'
                }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >User ID:</span
                >
                <span class="text-xs text-gray-900 dark:text-white">{{
                  process.userId
                }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-sm text-gray-600 dark:text-gray-400"
                  >Status:</span
                >
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit"
                  [ngClass]="{
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                      kycService.getStatusColor(process.status) === 'blue',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                      kycService.getStatusColor(process.status) === 'yellow',
                    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200':
                      kycService.getStatusColor(process.status) === 'orange',
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200':
                      kycService.getStatusColor(process.status) === 'purple',
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      kycService.getStatusColor(process.status) === 'green',
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                      kycService.getStatusColor(process.status) === 'red',
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200':
                      kycService.getStatusColor(process.status) === 'gray'
                  }"
                >
                  {{ kycService.getStatusLabel(process.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Process Statistics -->
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              Statistics
            </h3>
            <div class="grid grid-cols-4 gap-4">
              <div
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ getTotalSubmissions(process) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total Submissions
                </div>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <div class="text-2xl font-bold text-green-600">
                  {{ getTotalApprove(process) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Approved
                </div>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <div class="text-2xl font-bold text-red-600">
                  {{ getTotalReject(process) }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Rejected
                </div>
              </div>
              <div
                class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
              >
                <div class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ kycService.calculateCompletionPercentage(process) }}%
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Completion
                </div>
              </div>
            </div>
          </div>

          <!-- Documents -->
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              Documents
            </h3>
            <div class="grid grid-cols-2 gap-4">
              @for (doc of documentTypes; track doc.type) {
              <div
                class="border rounded-lg p-4 flex items-center gap-4"
                [ngClass]="{
                  'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20':
                    doc.hasDocument,
                  'border-gray-200 dark:border-gray-700': !doc.hasDocument
                }"
              >
                <div class="flex-shrink-0">
                  @if (doc.hasDocument) {
                  <svg
                    class="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  } @else {
                  <svg
                    class="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    ></path>
                  </svg>
                  }
                </div>
                <div class="flex-1 flex justify-between items-center">
                  <div class="font-medium text-gray-900 dark:text-white">
                    {{ doc.label }}
                  </div>
                  @if (doc.hasDocument && doc.files.length > 0) {
                  <button
                    (click)="viewFile(doc.files[0])"
                    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    View
                  </button>
                  }
                </div>
              </div>
              }
            </div>
          </div>

          <!-- History -->
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              History
            </h3>
            <div class="relative pl-8">
              <div
                class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700"
              ></div>
              @for (item of getHistoryItems(); track item.id) {
              <div class="relative mb-4">
                <div
                  class="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                  [ngClass]="{
                    'bg-blue-600': item.isCurrent,
                    'bg-gray-400': !item.isCurrent
                  }"
                ></div>
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div class="flex justify-between items-center mb-1">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                          kycService.getStatusColor(item.status) === 'blue',
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                          kycService.getStatusColor(item.status) === 'yellow',
                        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200':
                          kycService.getStatusColor(item.status) === 'orange',
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200':
                          kycService.getStatusColor(item.status) === 'purple',
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                          kycService.getStatusColor(item.status) === 'green',
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                          kycService.getStatusColor(item.status) === 'red',
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200':
                          kycService.getStatusColor(item.status) === 'gray'
                      }"
                    >
                      {{ kycService.getStatusLabel(item.status) }}
                    </span>
                    <span class="text-sm text-gray-600 dark:text-gray-400">{{
                      formatDate(item.createdAt)
                    }}</span>
                  </div>
                  @if (item.verificationComment) {
                  <div class="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {{ item.verificationComment }}
                  </div>
                  } @if (item.reviewedAt) {
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Reviewed: {{ formatDate(item.reviewedAt) }}
                  </div>
                  }
                </div>
              </div>
              }
            </div>
          </div>

          <!-- Review Section -->
          @if (canReview()) {
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-3"
            >
              Review Process
            </h3>
            <div class="space-y-4">
              <textarea
                [(ngModel)]="reviewComment"
                placeholder="Enter review comments (required)"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows="4"
              ></textarea>
              <div class="flex gap-3">
                <button
                  (click)="approve()"
                  [disabled]="!reviewComment.trim() || submitting()"
                  class="px-4 py-2 rounded-md font-medium flex items-center transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    class="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                  Approve
                </button>
                <button
                  (click)="reject()"
                  [disabled]="!reviewComment.trim() || submitting()"
                  class="px-4 py-2 rounded-md font-medium flex items-center transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    class="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                  Reject
                </button>
              </div>
            </div>
          </div>
          }
        </div>

        <!-- File Preview Modal -->
        @if (selectedFile()) {
        <div
          class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]"
          (click)="closeFilePreview()"
        >
          <div class="relative" (click)="$event.stopPropagation()">
            <app-file-preview
              [file]="selectedFile()!"
              [onClose]="closeFilePreview.bind(this)"
            >
            </app-file-preview>
          </div>
        </div>
        }
      </div>
    </div>
  `,
})
export class KycDetailModalComponent implements OnInit {
  @Input({ required: true }) process!: KycProcessListItem | KycProcessDetail;
  @Input() onClose: () => void = () => {};
  @Input() onUpdate: () => void = () => {};

  protected kycService = inject(KycService);
  private storageService = inject(StorageService);
  private alertService = inject(AlertService);

  reviewComment = '';
  submitting = signal(false);
  selectedFile = signal<FileMetadata | null>(null);
  userFiles = signal<FileMetadata[]>([]);

  documentTypes = [
    {
      type: FileType.IdFront,
      label: 'ID Front',
      hasDocument: false,
      files: [] as FileMetadata[],
    },
    {
      type: FileType.IdBack,
      label: 'ID Back',
      hasDocument: false,
      files: [] as FileMetadata[],
    },
    {
      type: FileType.PassportMain,
      label: 'Passport',
      hasDocument: false,
      files: [] as FileMetadata[],
    },
    {
      type: FileType.FacePhoto,
      label: 'Face Photo',
      hasDocument: false,
      files: [] as FileMetadata[],
    },
  ];

  ngOnInit(): void {
    this.updateDocumentStatus();
    this.loadUserFiles();
  }

  getTotalSubmissions(process: KycProcessListItem | KycProcessDetail) {
    const proc = process as KycProcessListItem;
    return proc.totalSubmissions;
  }

  getTotalApprove(process: KycProcessListItem | KycProcessDetail) {
    const proc = process as KycProcessListItem;
    return proc.approvedCount;
  }

  getTotalReject(process: KycProcessListItem | KycProcessDetail) {
    const proc = process as KycProcessListItem;
    return proc.rejectedCount;
  }

  private updateDocumentStatus(): void {
    if ('hasFrontIdDocument' in this.process) {
      this.documentTypes[0].hasDocument = this.process.hasFrontIdDocument;
      this.documentTypes[1].hasDocument = this.process.hasBackIdDocument;
      this.documentTypes[2].hasDocument = this.process.hasPassport;
      this.documentTypes[3].hasDocument = this.process.hasFacePhoto;
    } else {
      this.documentTypes[0].hasDocument = this.process.hasFrontNationalId;
      this.documentTypes[1].hasDocument = this.process.hasBackNationalId;
      this.documentTypes[2].hasDocument = this.process.hasPassport;
      this.documentTypes[3].hasDocument = this.process.hasFacePhoto;
    }
  }

  private loadUserFiles(): void {
    this.storageService.getUserFiles(this.process.userId).subscribe({
      next: (files) => {
        this.userFiles.set(files);

        // Group files by type
        this.documentTypes.forEach((docType) => {
          docType.files = files.filter((f) => f.fileType === docType.type);
        });
      },
      error: (error) => {
        console.error('Failed to load user files:', error);
      },
    });
  }

  getHistoryItems() {
    // Use history if it's a list item, otherwise use documents or create from current process
    if ('history' in this.process && this.process.history) {
      return this.process.history;
    } else if ('documents' in this.process && this.process.documents) {
      // Convert documents to history format for detail view
      return this.process.documents.map((doc) => ({
        id: doc.id,
        status: this.process.status,
        createdAt: doc.createdAt,
        reviewedAt: this.process.reviewedAt,
        verificationComment: this.process.verificationComment,
        isCurrent: true,
      }));
    } else {
      // Create a single history item from current process state
      return [
        {
          id: this.process.id,
          status: this.process.status,
          createdAt: this.process.createdAt,
          reviewedAt: this.process.reviewedAt,
          verificationComment: this.process.verificationComment,
          isCurrent: true,
        },
      ];
    }
  }

  canReview(): boolean {
    return (
      this.process.status === KycStatus.DocumentsUploaded ||
      this.process.status === KycStatus.UnderReview
    );
  }

  viewFile(file: FileMetadata): void {
    this.selectedFile.set(file);
  }

  closeFilePreview(): void {
    this.selectedFile.set(null);
  }

  approve(): void {
    if (!this.reviewComment.trim()) {
      this.alertService.warning('Please provide review comments');
      return;
    }

    this.submitting.set(true);

    this.kycService
      .reviewProcess({
        processId: this.process.id,
        status: KycStatus.Verified,
        comment: this.reviewComment,
      })
      .subscribe({
        next: () => {
          this.alertService.success('KYC process approved successfully');
          this.onUpdate();
          this.onClose();
        },
        error: (error) => {
          this.alertService.error('Failed to approve KYC process');
          this.submitting.set(false);
        },
      });
  }

  reject(): void {
    if (!this.reviewComment.trim()) {
      this.alertService.warning('Please provide review comments');
      return;
    }

    this.submitting.set(true);

    this.kycService
      .reviewProcess({
        processId: this.process.id,
        status: KycStatus.Rejected,
        comment: this.reviewComment,
      })
      .subscribe({
        next: () => {
          this.alertService.success('KYC process rejected');
          this.onUpdate();
          this.onClose();
        },
        error: (error) => {
          this.alertService.error('Failed to reject KYC process');
          this.submitting.set(false);
        },
      });
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
}
