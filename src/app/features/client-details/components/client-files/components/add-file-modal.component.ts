import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../../core/services/alert.service';
import { FilesService, FileType, UploadFileResponse } from '../services/files.service';
import { catchError, finalize, of } from 'rxjs';

export interface FileUploadData {
  fileType: FileType;
  description: string;
  reference: string;
  ownerId: string;
  makePermanent: boolean;
}

@Component({
  selector: 'app-add-file-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <!-- Modal Backdrop -->
    <div
      *ngIf="isOpen"
      class="fixed inset-0 bg-black/40 overflow-y-auto h-full w-full z-50"
      (click)="closeModal()"
    >
      <!-- Modal Content -->
      <div
        class="relative top-20 mx-auto p-5 w-11/12 md:w-3/4 lg:w-1/2 rounded-md bg-white dark:bg-gray-800"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Upload New File
          </h3>
          <button
            type="button"
            (click)="closeModal()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="mt-4">
          <form [formGroup]="uploadForm" class="space-y-6">
            <!-- File Upload Drag & Drop Area -->
            <div
              class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              [class.border-blue-500]="isDragOver"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="mt-4">
                <label for="file-upload" class="cursor-pointer">
                  <span class="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                    Drop files here or
                    <span class="text-blue-600 dark:text-blue-400 hover:text-blue-500">
                      browse
                    </span>
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    class="sr-only"
                    multiple
                    (change)="onFileSelected($event)"
                    [disabled]="isUploading"
                  />
                </label>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, PDF up to 10MB each
                </p>
              </div>
            </div>

            <!-- Selected Files Preview -->
            <div *ngIf="selectedFiles.length > 0" class="space-y-3">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                Selected Files ({{ selectedFiles.length }}):
              </h4>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                <div
                  *ngFor="let file of selectedFiles; let i = index"
                  class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div class="flex items-center space-x-2">
                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ file.name }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(file.size) }}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeFile(i)"
                    [disabled]="isUploading"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Form Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- File Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  File Type <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="fileType"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select File Type</option>
                  <option value="1">KYC - ID Front</option>
                  <option value="2">KYC - ID Back</option>
                  <option value="3">KYC - Passport</option>
                  <option value="4">KYC - Face Photo</option>
                  <option value="10">Document</option>
                  <option value="11">Image</option>
                  <option value="12">Contract</option>
                  <option value="13">Invoice</option>
                  <option value="14">Report</option>
                  <option value="15">Presentation</option>
                  <option value="16">Archive</option>
                  <option value="17">Video</option>
                  <option value="18">Audio</option>
                  <option value="99">Other</option>
                </select>
                <div
                  *ngIf="uploadForm.get('fileType')?.invalid && uploadForm.get('fileType')?.touched"
                  class="mt-1 text-sm text-red-600 dark:text-red-400"
                >
                  Please select a file type
                </div>
              </div>

              <!-- Reference -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  formControlName="reference"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="e.g., KYC Process ID"
                />
              </div>
            </div>

            <!-- Owner ID -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Owner ID
              </label>
              <input
                type="text"
                formControlName="ownerId"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Owner/Client ID"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                formControlName="description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Enter file description..."
              ></textarea>
            </div>

            <!-- Make Permanent -->
            <div>
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  formControlName="makePermanent"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Make file permanent (not deleted after 5 days)
                </span>
              </label>
            </div>
          </form>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <button
            type="button"
            (click)="closeModal()"
            [disabled]="isUploading"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="uploadFiles()"
            [disabled]="!canUpload() || isUploading"
            class="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <svg
              *ngIf="isUploading"
              class="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>
              {{ isUploading ? 'Uploading...' : 'Upload ' + selectedFiles.length + ' File' + (selectedFiles.length !== 1 ? 's' : '') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class AddFileModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() clientId?: string;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() uploadSuccess = new EventEmitter<UploadFileResponse[]>();

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private filesService = inject(FilesService);

  uploadForm: FormGroup;
  selectedFiles: File[] = [];
  isUploading = false;
  isDragOver = false;

  constructor() {
    this.uploadForm = this.fb.group({
      fileType: ['', Validators.required],
      makePermanent: [true],
      description: [''],
      reference: [''],
      ownerId: [this.clientId || 'demo-client'],
    });
  }

  ngOnInit(): void {
    // Update ownerId when clientId is available
    if (this.clientId) {
      this.uploadForm.patchValue({ ownerId: this.clientId });
    }
  }

  /**
   * Check if upload is possible
   */
  canUpload(): boolean {
    return this.uploadForm.valid && this.selectedFiles.length > 0;
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []);
    this.handleFiles(files);
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.handleFiles(files);
    }
  }

  /**
   * Process selected files
   */
  private handleFiles(files: File[]): void {
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        this.alertService.error(
          `File ${file.name} is too large. Maximum size is 10MB.`
        );
        return false;
      }
      return true;
    });

    this.selectedFiles = [...this.selectedFiles, ...validFiles];
  }

  /**
   * Remove a file from selection
   */
  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Determine FileType enum from file
   */
  private getFileTypeFromFile(file: File): FileType {
    if (file.type.startsWith('image/')) {
      return FileType.Image;
    } else if (file.type.startsWith('video/')) {
      return FileType.Video;
    } else if (file.type.startsWith('audio/')) {
      return FileType.Audio;
    } else if (file.type === 'application/pdf') {
      return FileType.Document;
    } else if (file.type.includes('document') || file.type.includes('word')) {
      return FileType.Document;
    } else if (file.type.includes('presentation') || file.type.includes('powerpoint')) {
      return FileType.Presentation;
    } else if (file.type.includes('zip') || file.type.includes('archive')) {
      return FileType.Archive;
    } else {
      return FileType.Other;
    }
  }

  /**
   * Upload selected files
   */
  uploadFiles(): void {
    if (!this.canUpload()) {
      this.alertService.error('Please fill in all required fields and select files');
      return;
    }

    this.isUploading = true;
    const formData = this.uploadForm.value;
    const filesCount = this.selectedFiles.length;
    const uploadPromises = this.selectedFiles.map(file => this.uploadSingleFile(file, formData));

    Promise.all(uploadPromises)
      .then((responses: UploadFileResponse[]) => {
        this.alertService.success(`${filesCount} file(s) uploaded successfully`);
        this.uploadSuccess.emit(responses);
        this.resetModal();
        this.closeModal();
      })
      .catch(error => {
        console.error('Upload error:', error);
        this.alertService.error('Some files failed to upload');
      })
      .finally(() => {
        this.isUploading = false;
        this.closeModal();
      });
  }

  /**
   * Upload a single file
   */
  private async uploadSingleFile(file: File, formData: FileUploadData): Promise<UploadFileResponse> {
    const fileType = Number(formData.fileType) || this.getFileTypeFromFile(file);
    
    const metadata = {
      description: formData.description,
      reference: formData.reference,
      fileType: fileType,
      ownerId: formData.ownerId || this.clientId || 'demo-client',
      makePermanent: formData.makePermanent
    };

    return this.filesService.uploadFile(file, metadata)
      .pipe(
        catchError(error => {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        })
      )
      .toPromise() as Promise<UploadFileResponse>;
  }

  /**
   * Close the modal
   */
  closeModal(): void {
    if (!this.isUploading) {
      this.resetModal();
      this.closeEvent.emit();
    }
  }

  /**
   * Reset modal state
   */
  private resetModal(): void {
    this.uploadForm.reset();
    this.selectedFiles = [];
    this.isDragOver = false;
  }
}
