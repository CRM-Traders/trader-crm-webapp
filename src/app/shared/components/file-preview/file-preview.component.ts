import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { StorageService } from '../../../core/services/storage.service';
import { FileMetadata, FileType } from '../../../core/models/storage.model';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-preview-container">
      <div class="preview-header">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ getFileTypeLabel(file.fileType) }}
        </h3>
        <div class="flex gap-2">
          <button
            (click)="download()"
            class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Download
          </button>
          <button
            (click)="onClose()"
            class="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div class="preview-content">
        @if (loading) {
        <div class="flex items-center justify-center h-full">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          ></div>
        </div>
        } @if (!loading && error) {
        <div class="flex flex-col items-center justify-center h-full">
          <svg
            class="w-16 h-16 text-gray-400 mb-4"
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
          <p class="text-gray-600 dark:text-gray-400">{{ error }}</p>
          <button
            (click)="loadPreview()"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
        } @if (!loading && !error) { @switch (previewType) { @case ('image') {
        <img
          [src]="previewUrl"
          [alt]="file.fileName"
          class="max-w-full max-h-full object-contain"
        />
        } @case ('pdf') {
        <iframe [src]="safeUrl" class="w-full h-full" frameborder="0"> </iframe>
        } @case ('video') {
        <video
          [src]="previewUrl"
          controls
          class="max-w-full max-h-full"
        ></video>
        } @case ('audio') {
        <div class="flex items-center justify-center h-full">
          <audio [src]="previewUrl" controls></audio>
        </div>
        } @default {
        <div class="flex flex-col items-center justify-center h-full">
          <svg
            class="w-24 h-24 text-gray-400 mb-4"
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
          <p class="text-gray-600 dark:text-gray-400 mb-2">
            {{ file.fileName }}
          </p>
          <p class="text-sm text-gray-500">
            {{ formatFileSize(file.fileSize) }}
          </p>
          <p class="text-sm text-gray-500 mt-4">
            Preview not available for this file type
          </p>
        </div>
        } } }
      </div>
    </div>
  `,
  styles: [
    `
      .file-preview-container {
        @apply bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden;
        width: 90vw;
        max-width: 1200px;
        height: 80vh;
        display: flex;
        flex-direction: column;
      }

      .preview-header {
        @apply px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center;
      }

      .preview-content {
        @apply flex-1 overflow-auto p-4;
        min-height: 0;
      }

      img,
      video {
        @apply mx-auto;
      }

      iframe {
        min-height: 600px;
      }
    `,
  ],
})
export class FilePreviewComponent implements OnInit {
  @Input({ required: true }) file!: FileMetadata;
  @Input() onClose: () => void = () => {};

  private storageService = inject(StorageService);
  private alertService = inject(AlertService);
  private sanitizer = inject(DomSanitizer);

  loading = true;
  error: string | null = null;
  previewUrl: string | null = null;
  safeUrl: SafeResourceUrl | null = null;
  previewType: 'image' | 'pdf' | 'video' | 'audio' | 'other' = 'other';

  ngOnInit(): void {
    this.determinePreviewType();
    this.loadPreview();
  }

  private determinePreviewType(): void {
    const extension = this.file.fileExtension.toLowerCase();
    const contentType = this.file.contentType.toLowerCase();

    if (
      contentType.startsWith('image/') ||
      this.storageService.isImageFileType(this.file.fileType)
    ) {
      this.previewType = 'image';
    } else if (contentType === 'application/pdf' || extension === 'pdf') {
      this.previewType = 'pdf';
    } else if (contentType.startsWith('video/')) {
      this.previewType = 'video';
    } else if (contentType.startsWith('audio/')) {
      this.previewType = 'audio';
    } else {
      this.previewType = 'other';
    }
  }

  loadPreview(): void {
    this.loading = true;
    this.error = null;

    if (this.previewType === 'other') {
      this.loading = false;
      return;
    }

    this.storageService.downloadFile(this.file.id).subscribe({
      next: (blob) => {
        this.previewUrl = URL.createObjectURL(blob);

        if (this.previewType === 'pdf') {
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            this.previewUrl
          );
        }

        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load file preview';
        this.loading = false;
      },
    });
  }

  download(): void {
    this.storageService.downloadFileAndSave(this.file.id, this.file.fileName);
  }

  getFileTypeLabel(fileType: FileType): string {
    return this.storageService.getFileTypeDisplayName(fileType);
  }

  formatFileSize(bytes: number): string {
    return this.storageService.formatFileSize(bytes);
  }

  ngOnDestroy(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }
}
