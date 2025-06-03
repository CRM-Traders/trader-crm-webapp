// src/app/features/client-portal/kyc-verification/kyc-verification.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { AlertService } from '../../../core/services/alert.service';
import { FileType } from '../../../core/models/storage.model';
import {
  KycProcessDetail,
  KycStatus,
} from '../../../shared/models/kyc/kyc.model';
import { KycService } from '../../../shared/services/kyc/kyc.service';

interface VerificationStep {
  id: number;
  title: string;
  description: string;
  fileType: FileType;
  icon: string;
  completed: boolean;
  fileId?: string;
  fileName?: string;
  uploading: boolean;
  error?: string;
}

@Component({
  selector: 'app-kyc-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Identity Verification
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            @if (isVerified()) { Your identity has been verified successfully }
            @else if (isLocked()) { Your documents are currently being reviewed
            } @else { Please upload the required documents to verify your
            identity }
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="mb-8">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >Verification Progress</span
            >
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >{{ completionPercentage }}%</span
            >
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              class="h-3 rounded-full transition-all duration-500"
              [ngClass]="{
                'bg-blue-600': !isVerified() && !isRejected(),
                'bg-green-600': isVerified(),
                'bg-red-600': isRejected()
              }"
              [style.width.%]="completionPercentage"
            ></div>
          </div>
        </div>

        <!-- Status Alert -->
        @if (kycProcess()) {
        <div
          class="mb-6 p-4 rounded-lg"
          [ngClass]="{
            'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800':
              kycProcess()!.status === KycStatus.NotStarted ||
              kycProcess()!.status === KycStatus.InProgress,
            'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800':
              kycProcess()!.status === KycStatus.DocumentsUploaded ||
              kycProcess()!.status === KycStatus.UnderReview,
            'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800':
              kycProcess()!.status === KycStatus.Verified,
            'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800':
              kycProcess()!.status === KycStatus.Rejected
          }"
        >
          <div class="flex items-center">
            @switch (kycProcess()!.status) { @case (KycStatus.NotStarted) {
            <svg
              class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 class="font-medium text-blue-800 dark:text-blue-200">
                Getting Started
              </h3>
              <p class="text-sm text-blue-700 dark:text-blue-300">
                Upload your documents to begin the verification process.
              </p>
            </div>
            } @case (KycStatus.InProgress) {
            <svg
              class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            <div>
              <h3 class="font-medium text-blue-800 dark:text-blue-200">
                In Progress
              </h3>
              <p class="text-sm text-blue-700 dark:text-blue-300">
                Continue uploading the remaining documents to complete
                verification.
              </p>
            </div>
            } @case (KycStatus.DocumentsUploaded) {
            <svg
              class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 class="font-medium text-yellow-800 dark:text-yellow-200">
                Documents Received
              </h3>
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                All documents have been uploaded and are waiting for review.
              </p>
            </div>
            } @case (KycStatus.UnderReview) {
            <svg
              class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            <div>
              <h3 class="font-medium text-yellow-800 dark:text-yellow-200">
                Under Review
              </h3>
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                Our team is currently reviewing your documents. This usually
                takes 1-2 business days.
              </p>
            </div>
            } @case (KycStatus.Verified) {
            <svg
              class="w-5 h-5 text-green-600 dark:text-green-400 mr-3"
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
            <div>
              <h3 class="font-medium text-green-800 dark:text-green-200">
                Verification Complete
              </h3>
              <p class="text-sm text-green-700 dark:text-green-300">
                Your identity has been successfully verified. You now have full
                access to all features.
              </p>
            </div>
            } @case (KycStatus.Rejected) {
            <svg
              class="w-5 h-5 text-red-600 dark:text-red-400 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 class="font-medium text-red-800 dark:text-red-200">
                Verification Failed
              </h3>
              <p class="text-sm text-red-700 dark:text-red-300">
                {{
                  kycProcess()!.verificationComment ||
                    'Your documents could not be verified. Please ensure all documents are clear and valid, then try again.'
                }}
              </p>
            </div>
            } }
          </div>
        </div>
        }

        <!-- Loading State -->
        @if (loading()) {
        <div class="flex justify-center items-center py-12">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          ></div>
        </div>
        }

        <!-- Error State -->
        @if (error()) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
        >
          <svg
            class="w-12 h-12 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h3 class="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h3>
          <p class="text-red-700 dark:text-red-300 mb-4">{{ error() }}</p>
          <button
            (click)="initializeProcess()"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
        }

        <!-- Verification Steps -->
        @if (!loading() && !error()) {
        <div class="space-y-4">
          @for (step of verificationSteps; track step.id) {
          <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div class="p-6">
              <div class="flex items-start">
                <!-- Step Icon -->
                <div class="flex-shrink-0 mr-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center"
                    [ngClass]="{
                      'bg-green-100 dark:bg-green-900/20': step.completed,
                      'bg-gray-100 dark:bg-gray-700': !step.completed
                    }"
                  >
                    @if (step.completed) {
                    <svg
                      class="w-6 h-6 text-green-600 dark:text-green-400"
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
                    } @else {
                    <svg
                      class="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        [attr.d]="getStepIcon(step.icon)"
                      ></path>
                    </svg>
                    }
                  </div>
                </div>

                <!-- Step Content -->
                <div class="flex-1">
                  <h3
                    class="text-lg font-medium text-gray-900 dark:text-white mb-1"
                  >
                    {{ step.title }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {{ step.description }}
                  </p>

                  @if (step.uploading) {
                  <div class="flex items-center">
                    <div
                      class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"
                    ></div>
                    <span class="text-sm text-gray-600 dark:text-gray-400"
                      >Uploading...</span
                    >
                  </div>
                  } @else if (step.error) {
                  <div class="text-sm text-red-600 dark:text-red-400 mb-3">
                    {{ step.error }}
                  </div>
                  } @if (step.completed && step.fileName) {
                  <div
                    class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <div class="flex items-center">
                      <svg
                        class="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                      <span class="text-sm text-gray-700 dark:text-gray-300">{{
                        step.fileName
                      }}</span>
                    </div>
                    @if (canEdit()) {
                    <button
                      (click)="removeFile(step)"
                      class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                    } @else {
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      @if (isVerified()) { Verified } @else { Locked }
                    </span>
                    }
                  </div>
                  } @else if (!step.uploading && canEdit()) {
                  <div class="flex items-center">
                    <input
                      type="file"
                      [id]="'file-upload-' + step.id"
                      [accept]="getAcceptAttribute(step.fileType)"
                      (change)="onFileSelected($event, step)"
                      class="hidden"
                    />
                    <label
                      [for]="'file-upload-' + step.id"
                      class="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg
                        class="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        ></path>
                      </svg>
                      Choose File
                    </label>
                    <span class="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      {{ getAllowedFormats(step.fileType) }}
                    </span>
                  </div>
                  } @else if (!step.completed && !canEdit()) {
                  <div class="text-sm text-gray-500 dark:text-gray-400 italic">
                    @if (isVerified()) { Document verification completed } @else
                    { Document upload locked during review }
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </div>
  `,
})
export class KycVerificationComponent implements OnInit {
  private kycService = inject(KycService);
  private storageService = inject(StorageService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  kycProcess = signal<KycProcessDetail | null>(null);

  KycStatus = KycStatus;

  verificationSteps: VerificationStep[] = [
    {
      id: 1,
      title: 'Government ID - Front',
      description:
        "Upload a clear photo of the front of your government-issued ID (passport, driver's license, or national ID card)",
      fileType: FileType.IdFront,
      icon: 'id-front',
      completed: false,
      uploading: false,
    },
    {
      id: 2,
      title: 'Government ID - Back',
      description:
        'Upload a clear photo of the back of your government-issued ID',
      fileType: FileType.IdBack,
      icon: 'id-back',
      completed: false,
      uploading: false,
    },
    {
      id: 3,
      title: 'Passport',
      description:
        "Upload a clear photo of your passport's main page showing your photo and personal details",
      fileType: FileType.PassportMain,
      icon: 'passport',
      completed: false,
      uploading: false,
    },
    {
      id: 4,
      title: 'Selfie Photo',
      description: 'Upload a recent selfie photo for identity verification',
      fileType: FileType.FacePhoto,
      icon: 'face',
      completed: false,
      uploading: false,
    },
  ];

  get completionPercentage(): number {
    const completed = this.verificationSteps.filter((s) => s.completed).length;
    return Math.round((completed / this.verificationSteps.length) * 100);
  }

  ngOnInit(): void {
    this.initializeProcess();
  }

  initializeProcess(): void {
    this.loading.set(true);
    this.error.set(null);

    // Check if user already has a KYC process
    this.kycService.getProcesses({ pageSize: 1 }).subscribe({
      next: (response) => {
        if (response.items.length > 0) {
          // Load existing process
          const latestProcess = response.items[0];
          this.loadProcess(latestProcess.id);
        } else {
          // Create new process
          this.createNewProcess();
        }
      },
      error: (error) => {
        this.error.set('Failed to initialize verification process');
        this.loading.set(false);
      },
    });
  }

  private createNewProcess(): void {
    this.kycService.createProcess().subscribe({
      next: (response) => {
        this.loadProcess(response.kycProcessId);
      },
      error: (error) => {
        this.error.set('Failed to create verification process');
        this.loading.set(false);
      },
    });
  }

  private loadProcess(processId: string): void {
    this.kycService.getProcessById(processId).subscribe({
      next: (process) => {
        this.kycProcess.set(process);
        this.updateStepsFromProcess(process);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load verification details');
        this.loading.set(false);
      },
    });
  }

  private updateStepsFromProcess(process: KycProcessDetail): void {
    this.verificationSteps[0].completed = process.hasFrontNationalId;
    this.verificationSteps[1].completed = process.hasBackNationalId;
    this.verificationSteps[2].completed = process.hasPassport;
    this.verificationSteps[3].completed = process.hasFacePhoto;

    if (process.documents) {
      process.documents.forEach((file: any) => {
        const step = this.verificationSteps.find(
          (s) => s.fileType === file.fileType
        );
        if (step) {
          step.fileId = file.id;
          step.fileName = file.fileName;
        }
      });
    }
  }

  private checkAndUpdateProcessStatus(): void {
    const process = this.kycProcess();
    if (!process) return;

    const allCompleted = this.verificationSteps.every((step) => step.completed);

    // Automatically update status based on document completion
    if (allCompleted && process.status === KycStatus.InProgress) {
      this.kycService
        .updateProcessStatus(process.id, KycStatus.DocumentsUploaded)
        .subscribe({
          next: () => {
            this.loadProcess(process.id);
          },
          error: (error) => {
            console.error('Failed to update process status:', error);
          },
        });
    }
  }

  onFileSelected(event: Event, step: VerificationStep): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const process = this.kycProcess();
    if (!process) return;

    step.uploading = true;
    step.error = undefined;

    this.kycService
      .uploadKycFile({
        kycProcessIdOrToken: process.sessionToken,
        fileType: step.fileType,
        file: file,
      })
      .subscribe({
        next: (response) => {
          step.completed = true;
          step.fileId = response.documentId;
          step.fileName = file.name;
          step.uploading = false;
          this.alertService.success(`${step.title} uploaded successfully`);

          // Refresh process and check if all documents are uploaded
          this.loadProcess(process.id);
          setTimeout(() => this.checkAndUpdateProcessStatus(), 1000);
        },
        error: (error) => {
          step.uploading = false;
          step.error = 'Failed to upload file. Please try again.';
          this.alertService.error('Upload failed. Please try again.');
        },
      });

    // Clear the input
    input.value = '';
  }

  removeFile(step: VerificationStep): void {
    if (!step.fileId || !this.canEdit()) return;

    this.storageService.deleteFile(step.fileId).subscribe({
      next: () => {
        step.completed = false;
        step.fileId = undefined;
        step.fileName = undefined;
        this.alertService.success('File removed successfully');

        // Refresh process
        const process = this.kycProcess();
        if (process) {
          this.loadProcess(process.id);
        }
      },
      error: (error) => {
        this.alertService.error('Failed to remove file');
      },
    });
  }

  canEdit(): boolean {
    const process = this.kycProcess();
    if (!process) return false;

    return (
      process.status === KycStatus.NotStarted ||
      process.status === KycStatus.InProgress ||
      process.status === KycStatus.Rejected
    );
  }

  isVerified(): boolean {
    const process = this.kycProcess();
    return process?.status === KycStatus.Verified;
  }

  isRejected(): boolean {
    const process = this.kycProcess();
    return process?.status === KycStatus.Rejected;
  }

  isLocked(): boolean {
    const process = this.kycProcess();
    return (
      process?.status === KycStatus.DocumentsUploaded ||
      process?.status === KycStatus.UnderReview
    );
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getStepIcon(iconType: string): string {
    const icons: Record<string, string> = {
      'id-front':
        'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
      'id-back':
        'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
      passport:
        'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      face: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    };
    return icons[iconType] || '';
  }

  getAcceptAttribute(fileType: FileType): string {
    return this.storageService.getAcceptAttribute(fileType);
  }

  getAllowedFormats(fileType: FileType): string {
    const extensions = this.storageService.getAllowedExtensions(fileType);
    return `Accepted formats: ${extensions.join(', ')}`;
  }
}
