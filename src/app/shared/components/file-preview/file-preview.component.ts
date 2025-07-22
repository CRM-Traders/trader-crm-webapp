// src/app/shared/components/file-preview/file-preview.component.ts

import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AlertService } from '../../../core/services/alert.service';
import { FilePreviewResult, FilePreviewService, PreviewType } from '../../services/file-preview.service';

// Generic file interface that can work with different file types
export interface PreviewFile {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  contentType?: string;
  createdAt?: string;
  uploadedAt?: string;
  isImage?: boolean;
  isPdf?: boolean;
  fileExtension?: string;
}

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-preview-container bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl overflow-hidden">
      <div class="preview-header">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ file.fileName }}
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
          <span class="ml-3 text-gray-600 dark:text-gray-400"
            >Loading preview...</span
          >
        </div>
        } @else if (error) {
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
          <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
          <button
            (click)="loadPreview()"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
        } @else { @switch (previewType) { @case ('image') {
        <div class="flex items-center justify-center h-full">
          <img
            [src]="previewUrl!"
            [alt]="file.fileName"
            class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            (error)="onImageError()"
          />
        </div>
        } @case ('pdf') {
        <iframe
          [src]="safeUrl!"
          class="w-full h-full rounded-lg"
          frameborder="0"
          (error)="onPreviewError()"
        ></iframe>
        } @case ('video') {
        <div class="flex items-center justify-center h-full">
          <video
            [src]="previewUrl!"
            controls
            class="max-w-full max-h-full rounded-lg shadow-lg"
            (error)="onPreviewError()"
          ></video>
        </div>
        } @case ('audio') {
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <svg
              class="w-24 h-24 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              ></path>
            </svg>
            <audio
              [src]="previewUrl!"
              controls
              class="mb-4"
              (error)="onPreviewError()"
            ></audio>
            <p class="text-gray-600 dark:text-gray-400">{{ file.fileName }}</p>
          </div>
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
          <p class="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {{ file.fileName }}
          </p>
          @if (file.fileSize) {
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {{ formatFileSize(file.fileSize) }}
          </p>
          }
          <p class="text-sm text-gray-500 mb-4">
            Preview not available for this file type
          </p>
          @if (file.fileUrl) {
          <a
            [href]="file.fileUrl"
            target="_blank"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              ></path>
            </svg>
            Open in New Tab
          </a>
          }
        </div>
        } } }
      </div>

      <!-- File Info Footer -->
      <div class="preview-footer">
        <div
          class="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400"
        >
          @if (file.fileSize) {
          <span>Size: {{ formatFileSize(file.fileSize) }}</span>
          } @if (file.contentType) {
          <span>Type: {{ file.contentType }}</span>
          } @if (file.createdAt || file.uploadedAt) {
          <span
            >Uploaded: {{ formatDate(file.createdAt || file.uploadedAt) }}</span
          >
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .file-preview-container {
        @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden;
        width: 90vw;
        max-width: 1200px;
        height: 85vh;
        display: flex;
        flex-direction: column;
      }

      .preview-header {
        @apply px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center;
        flex-shrink: 0;
      }

      .preview-content {
        @apply flex-1 overflow-hidden;
        min-height: 0;
      }

      .preview-footer {
        @apply px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700;
        flex-shrink: 0;
      }

      img,
      video {
        max-height: calc(85vh - 140px);
      }

      iframe {
        height: calc(85vh - 140px);
        min-height: 500px;
      }
    `,
  ],
})
export class FilePreviewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) file!: PreviewFile;
  @Input() onClose: () => void = () => {};

  private readonly filePreviewService = inject(FilePreviewService);
  private readonly alertService = inject(AlertService);
  private readonly sanitizer = inject(DomSanitizer);

  loading = true;
  error: string | null = null;
  previewUrl: string | null = null;
  safeUrl: SafeResourceUrl | null = null;
  previewType: PreviewType = 'other';

  ngOnInit(): void {
    this.determinePreviewType();
    this.loadPreview();
  }

  ngOnDestroy(): void {
    if (this.previewUrl) {
      this.filePreviewService.revokeObjectUrl(this.previewUrl);
    }
  }

  private determinePreviewType(): void {
    this.previewType = this.filePreviewService.determinePreviewType({
      contentType: this.file.contentType,
      fileName: this.file.fileName,
      fileExtension: this.file.fileExtension,
      isImage: this.file.isImage,
      isPdf: this.file.isPdf
    });
  }

  loadPreview(): void {
    this.loading = true;
    this.error = null;

    if (!this.file.fileUrl) {
      console.error('FilePreviewComponent: No file URL available');
      this.previewType = 'other';
      this.loading = false;
      return;
    }

    this.filePreviewService.loadPreview(this.file.fileUrl, this.previewType).subscribe({
      next: (result: FilePreviewResult) => {
        this.previewUrl = result.previewUrl;
        this.safeUrl = result.safeUrl;
        this.previewType = result.previewType;
        this.error = result.error || null;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = error.message || 'Failed to load preview';
        this.loading = false;
      }
    });
  }

  onImageError(): void {
    this.error = 'Failed to load image preview';
  }

  onPreviewError(): void {
    this.error = 'Failed to load file preview';
  }

  download(): void {
    if (this.file.fileUrl) {
      this.filePreviewService.downloadFile(this.file.fileUrl).subscribe({
        next: (result) => {
          if (result.success && result.blob) {
            const url = URL.createObjectURL(result.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.file.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            this.alertService.error(result.error || 'Download failed');
          }
        },
        error: (error) => {
          this.alertService.error('Download failed');
        }
      });
    } else {
      this.alertService.error('Download URL not available');
    }
  }

  formatFileSize(bytes: number): string {
    return this.filePreviewService.formatFileSize(bytes);
  }

  formatDate(dateString: string | undefined): string {
    return this.filePreviewService.formatDate(dateString);
  }
}
