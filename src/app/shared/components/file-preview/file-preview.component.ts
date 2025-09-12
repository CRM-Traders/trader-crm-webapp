// src/app/shared/components/file-preview/file-preview.component.ts

import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AlertService } from '../../../core/services/alert.service';
import {
  FilePreviewResult,
  FilePreviewService,
  PreviewType,
} from '../../services/file-preview.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

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
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './file-preview.component.html',
  // styles: [
  //   `
  //     .file-preview-container {
  //       @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden;
  //       width: 90vw;
  //       max-width: 1200px;
  //       height: 85vh;
  //       display: flex;
  //       flex-direction: column;
  //     }

  //     .preview-header {
  //       @apply px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center;
  //       flex-shrink: 0;
  //     }

  //     .preview-content {
  //       @apply flex-1 overflow-hidden;
  //       min-height: 0;
  //     }

  //     img{
  //       max-width: 500px;
  //     }

  //     .preview-footer {
  //       @apply px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700;
  //       flex-shrink: 0;
  //     }

  //     img,
  //     video {
  //       max-height: calc(85vh - 140px);
  //     }

  //     iframe {
  //       height: calc(85vh - 140px);
  //       min-height: 500px;
  //     }
  //   `,
  // ],
})
export class FilePreviewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) file!: PreviewFile;
  @Input() onClose!: () => void;

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
      isPdf: this.file.isPdf,
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

    this.filePreviewService
      .loadPreview(`/Storage${this.file.fileUrl}`, this.previewType)
      .subscribe({
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
        },
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
        },
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
