import { Injectable, inject } from '@angular/core';
import { Observable, throwError, catchError, of, map } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpService } from '../../core/services/http.service';
import { AlertService } from '../../core/services/alert.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

// File preview types
export type PreviewType = 'image' | 'pdf' | 'video' | 'audio' | 'other';

// File preview result interface
export interface FilePreviewResult {
  previewUrl: string | null;
  safeUrl: SafeResourceUrl | null;
  previewType: PreviewType;
  error?: string;
}

// File download result interface
export interface FileDownloadResult {
  success: boolean;
  error?: string;
  blob?: Blob;
}

@Injectable({
  providedIn: 'root',
})
export class FilePreviewService {
  private readonly http = inject(HttpService);
  private readonly httpClient = inject(HttpClient);
  private readonly alertService = inject(AlertService);
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Determine the preview type based on file information
   */
  determinePreviewType(file: {
    contentType?: string;
    fileName?: string;
    fileExtension?: string;
    isImage?: boolean;
    isPdf?: boolean;
  }): PreviewType {
    const contentType = file.contentType?.toLowerCase() || '';
    const fileName = file.fileName?.toLowerCase() || '';
    const fileExtension = file.fileExtension?.toLowerCase() || '';

    if (
      contentType.startsWith('image/') ||
      file.isImage ||
      fileExtension.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/) ||
      fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)
    ) {
      return 'image';
    } else if (
      contentType === 'application/pdf' ||
      file.isPdf ||
      fileName.endsWith('.pdf') ||
      fileExtension === '.pdf'
    ) {
      return 'pdf';
    } else if (
      contentType.startsWith('video/') ||
      fileExtension.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/) ||
      fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/)
    ) {
      return 'video';
    } else if (
      contentType.startsWith('audio/') ||
      fileExtension.match(/\.(mp3|wav|ogg|aac|flac|wma)$/) ||
      fileName.match(/\.(mp3|wav|ogg|aac|flac|wma)$/)
    ) {
      return 'audio';
    } else {
      return 'other';
    }
  }

  /**
   * Load file preview based on file URL and type
   */
  loadPreview(
    fileUrl: string,
    previewType: PreviewType
  ): Observable<FilePreviewResult> {
    if (!fileUrl) {
      console.error('FilePreviewService: No file URL provided');
      return throwError(() => new Error('File URL not available'));
    }

    // Construct the full URL
    const fullUrl = this.constructFullUrl(fileUrl);

    // For images, we can use the URL directly
    if (previewType === 'image') {
      return of({
        previewUrl: fullUrl,
        safeUrl: null,
        previewType: 'image',
      });
    }

    // For PDFs, create a safe URL for iframe
    if (previewType === 'pdf') {
      // First try to create a blob URL for better security and CORS handling
      return this.httpClient.get(fullUrl, { responseType: 'blob' }).pipe(
        map((blob) => {
          const objectUrl = this.createObjectUrl(blob);
          const safeUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
          return {
            previewUrl: objectUrl,
            safeUrl: safeUrl,
            previewType: 'pdf' as PreviewType,
          };
        }),
        catchError((error) => {
          console.warn(
            'Failed to load PDF as blob, falling back to direct URL:',
            error
          );
          // Fallback to direct URL
          const safeUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
          return of({
            previewUrl: null,
            safeUrl: safeUrl,
            previewType: 'pdf' as PreviewType,
            error: 'Using fallback PDF viewer',
          });
        })
      );
    }

    // For videos and audio, try to fetch as blob for better control
    if (previewType === 'video' || previewType === 'audio') {
      return this.httpClient.get(fullUrl, { responseType: 'blob' }).pipe(
        map((blob) => {
          const objectUrl = this.createObjectUrl(blob);
          return {
            previewUrl: objectUrl,
            safeUrl: null,
            previewType: previewType,
          };
        }),
        catchError((error) => {
          console.warn(
            `Error loading ${previewType} preview as blob, falling back to direct URL:`,
            error
          );
          // Fallback to direct URL if blob fetch fails
          return of({
            previewUrl: fullUrl,
            safeUrl: null,
            previewType: previewType,
            error: `Using fallback ${previewType} player`,
          });
        })
      );
    }

    // For other file types, return no preview
    return of({
      previewUrl: null,
      safeUrl: null,
      previewType: 'other',
    });
  }

  /**
   * Download a file
   */
  downloadFile(fileUrl: string): Observable<FileDownloadResult> {
    if (!fileUrl) {
      this.alertService.error('Download URL not available');
      return of({ success: false, error: 'Download URL not available' });
    }

    const fullUrl = this.constructFullUrl(fileUrl);

    return this.httpClient.get(fullUrl, { responseType: 'blob' }).pipe(
      map((blob) => {
        return { success: true, blob: blob };
      }),
      catchError((error) => {
        console.error('Error downloading file:', error);
        this.alertService.error('Failed to download file');
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Construct full URL for file access
   */
  private constructFullUrl(fileUrl: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanFileUrl = fileUrl.startsWith('/')
      ? fileUrl.substring(1)
      : fileUrl;

    // If fileUrl already starts with /Storage, don't add it again
    if (cleanFileUrl.startsWith('Storage/')) {
      return `${environment.gatewayDomain}/${cleanFileUrl}`;
    }

    // If fileUrl already contains the full path with /Storage
    if (fileUrl.includes('/Storage/')) {
      return `${environment.gatewayDomain}${fileUrl}`;
    }

    // Default case - add /Storage prefix
    return `${environment.gatewayDomain}/Storage/${cleanFileUrl}`;
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
   * Format date for display
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Create object URL from blob and revoke it when done
   */
  createObjectUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke object URL to free memory
   */
  revokeObjectUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0
      ? fileName.substring(lastDotIndex).toLowerCase()
      : '';
  }

  /**
   * Check if file is an image
   */
  isImageFile(fileName: string, contentType?: string): boolean {
    const extension = this.getFileExtension(fileName);
    const isImageExtension = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(
      extension
    );
    const isImageContentType = contentType?.startsWith('image/') || false;
    return isImageExtension || isImageContentType;
  }

  /**
   * Check if file is a PDF
   */
  isPdfFile(fileName: string, contentType?: string): boolean {
    const extension = this.getFileExtension(fileName);
    const isPdfExtension = extension === '.pdf';
    const isPdfContentType = contentType === 'application/pdf';
    return isPdfExtension || isPdfContentType;
  }

  /**
   * Validate if a URL is accessible
   */
  validateUrl(url: string): Observable<boolean> {
    return this.httpClient.head(url).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
