import { Component, EventEmitter, inject, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
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
            Upload Photo
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
                    Drop a photo here or
                    <span class="text-blue-600 dark:text-blue-400 hover:text-blue-500">
                      browse
                    </span>
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    class="sr-only"
                    accept="image/*"
                    (change)="onFileSelected($event)"
                    [disabled]="isUploading"
                  />
                </label>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>

            <!-- Selected File Preview -->
            <div *ngIf="selectedFiles.length > 0" class="space-y-3">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                Selected Photo:
              </h4>
              <div class="space-y-2">
                <div
                  class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div class="flex items-center space-x-2">
                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ selectedFiles[0].name }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(selectedFiles[0].size) }}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeFile(0)"
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
            <div class="grid grid-cols-1 gap-4">
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

              <!-- Reference -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  formControlName="reference"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter reference number or identifier..."
                />
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
              {{ isUploading ? 'Uploading...' : 'Upload Photo' }}
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
export class AddFileModalComponent implements OnInit, OnChanges {
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
      fileType: [99], // Always set to "Other" (99)
      makePermanent: [true],
      description: [''],
      reference: [''],
      ownerId: [''], // Don't set clientId here, it will be set in ngOnChanges
    });

    // Debug form changes
    this.uploadForm.valueChanges.subscribe(value => {
      console.log('Form value changed:', value);
    });
  }

  ngOnInit(): void {
    // Update ownerId when clientId is available and set fileType to "Other"
    if (this.clientId) {
      this.uploadForm.patchValue({ 
        ownerId: this.clientId,
        fileType: 99 // Always set to "Other"
      });
    } else {
      this.uploadForm.patchValue({ fileType: 99 }); // Always set to "Other"
    }
    console.log('ngOnInit - clientId:', this.clientId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle changes to clientId input
    if (changes['clientId'] && changes['clientId'].currentValue) {
      this.uploadForm.patchValue({ 
        ownerId: changes['clientId'].currentValue,
        fileType: 99 // Always set to "Other"
      });
      console.log('ngOnChanges - clientId updated:', changes['clientId'].currentValue);
    }
    
    // Handle changes to isOpen input - reset form when modal opens
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.resetModal();
      // Ensure clientId is set when modal opens
      if (this.clientId) {
        this.uploadForm.patchValue({ 
          ownerId: this.clientId,
          fileType: 99 // Always set to "Other"
        });
        console.log('Modal opened - clientId set:', this.clientId);
      } else {
        console.warn('Modal opened but clientId is not available');
        this.uploadForm.patchValue({ fileType: 99 }); // Always set to "Other"
      }
    }
  }

  /**
   * Force refresh client ID in form
   */
  private refreshClientId(): void {
    if (this.clientId) {
      this.uploadForm.patchValue({ 
        ownerId: this.clientId,
        fileType: 99 // Always set to "Other"
      });
      console.log('Client ID refreshed:', this.clientId);
    }
  }

  /**
   * Check if upload is possible
   */
  canUpload(): boolean {
    const formValid = this.uploadForm.valid;
    const hasFile = this.selectedFiles.length === 1;
    const canUpload = formValid && hasFile;
    
    console.log('canUpload check:', {
      formValid,
      hasFile,
      selectedFilesCount: this.selectedFiles.length,
      formErrors: this.uploadForm.errors,
      formValue: this.uploadForm.value,
      canUpload
    });
    
    return canUpload;
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
    console.log('Processing files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    // Only allow one file at a time
    const file = files[0];
    
    if (!file) {
      console.log('No file provided');
      return;
    }

    // Check if file is empty
    if (file.size === 0) {
      console.log('File is empty:', file.name);
      this.alertService.error('Selected file is empty. Please select a valid file.');
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      this.alertService.error('Please select an image file (PNG, JPG, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      this.alertService.error(
        `File ${file.name} is too large. Maximum size is 10MB.`
      );
      return;
    }

    console.log('Valid file:', { name: file.name, size: file.size, type: file.type });
    this.selectedFiles = [file]; // Replace any existing files with the new one
    console.log('Selected file:', this.selectedFiles[0]);
  }

  /**
   * Remove the selected file
   */
  removeFile(index: number): void {
    this.selectedFiles = [];
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
    console.log('Starting upload process...');
    console.log('Form data:', this.uploadForm.value);
    console.log('Selected files:', this.selectedFiles);
    console.log('Client ID:', this.clientId);

    if (!this.canUpload()) {
      console.log('Upload validation failed');
      this.alertService.error('Please select a photo to upload');
      return;
    }

    // Validate that clientId is available
    if (!this.clientId) {
      console.log('Client ID not available');
      this.alertService.error('Client ID is not available. Please refresh the page and try again.');
      return;
    }

    // Validate file is not empty
    const selectedFile = this.selectedFiles[0];
    if (!selectedFile || selectedFile.size === 0) {
      console.log('File is empty or invalid');
      this.alertService.error('Selected file is empty or invalid. Please select a valid file.');
      return;
    }

    // Force refresh client ID before upload
    this.refreshClientId();

    // Test with the selected file
    if (this.selectedFiles.length === 1) {
      console.log('Testing with selected file:', this.selectedFiles[0]);
      const testFile = this.selectedFiles[0];
      const testFormData = this.uploadForm.value;
      
      // Create a simple test to see if the issue is with the file or the API
      const testFormDataObj = new FormData();
      testFormDataObj.append('file', testFile);
      testFormDataObj.append('fileType', '99');
      testFormDataObj.append('ownerId', this.clientId || '');
      testFormDataObj.append('makePermanent', 'true');
      testFormDataObj.append('description', testFormData.description || '');
      testFormDataObj.append('reference', testFormData.reference || '');
      
      console.log('Test FormData entries:', Array.from(testFormDataObj.entries()));
    }

    this.isUploading = true;
    const formData = this.uploadForm.value;
    
    console.log('About to upload photo:', {
      formData,
      clientId: this.clientId,
      formValid: this.uploadForm.valid,
      formErrors: this.uploadForm.errors,
      formRawValue: this.uploadForm.getRawValue()
    });

    const uploadPromise = this.uploadSingleFile(this.selectedFiles[0], formData);

    uploadPromise
      .then((response: UploadFileResponse) => {
        console.log('Upload successful:', response);
        this.alertService.success('Photo uploaded successfully');
        this.uploadSuccess.emit([response]);
        this.resetModal();
        this.closeModal();
      })
      .catch(error => {
        console.error('Upload error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error
        });
        this.alertService.error(`Upload failed: ${error.message || 'Unknown error'}`);
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
    // Validate file before upload
    if (!file || file.size === 0) {
      throw new Error('File is empty or invalid');
    }

    // Additional validation to ensure file can be read
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error('File content is empty');
      }
      console.log(`File ${file.name} can be read successfully, size: ${arrayBuffer.byteLength} bytes`);
    } catch (error) {
      console.error(`Error reading file ${file.name}:`, error);
      throw new Error(`File cannot be read: ${error}`);
    }

    console.log(`Uploading file: ${file.name}`, {
      fileSize: file.size,
      fileType: file.type,
      formData
    });

    console.log('Form data fileType:', {
      raw: formData.fileType,
      type: typeof formData.fileType,
      isNull: formData.fileType === null,
      isUndefined: formData.fileType === undefined
    });

    // Ensure we always have a valid fileType
    let fileType: number;
    if (formData.fileType && formData.fileType !== null && formData.fileType !== undefined) {
      fileType = Number(formData.fileType);
    } else {
      fileType = this.getFileTypeFromFile(file);
    }
    
    // Fallback to "Other" if still invalid
    if (!fileType || isNaN(fileType)) {
      fileType = 99; // FileType.Other
    }
    
    const metadata = {
      description: formData.description || '',
      reference: formData.reference || '',
      fileType: fileType,
      ownerId: formData.ownerId || this.clientId,
      makePermanent: formData.makePermanent
    };

    console.log('Upload metadata:', metadata);

    return new Promise<UploadFileResponse>((resolve, reject) => {
      this.filesService.uploadFile(file, metadata)
        .pipe(
          catchError(error => {
            console.error(`Error uploading ${file.name}:`, error);
            console.error(`File ${file.name} error details:`, {
              message: error.message,
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              error: error.error
            });
            reject(error);
            return [];
          })
        )
        .subscribe({
          next: (response) => {
            console.log(`File ${file.name} uploaded successfully:`, response);
            resolve(response);
          },
          error: (error) => {
            console.error(`File ${file.name} upload failed:`, error);
            console.error(`File ${file.name} error details:`, {
              message: error.message,
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              error: error.error
            });
            reject(error);
          }
        });
    });
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
    this.selectedFiles = [];
    this.isDragOver = false;
    
    // Reset form with proper initial values
    this.uploadForm.reset({
      fileType: 99, // Always set to "Other"
      makePermanent: true,
      description: '',
      reference: '',
      ownerId: this.clientId || ''
    });
  }
}
