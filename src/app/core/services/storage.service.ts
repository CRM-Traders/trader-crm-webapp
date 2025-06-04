import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError, catchError } from 'rxjs';
import {
  FileContentResponse,
  FileUploadRequest,
  FileUploadResponse,
  FileType,
  MakePermanentResponse,
  FileMetadata,
  FileUploadProgress,
} from '../models/storage.model';
import { AlertService } from './alert.service';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly http = inject(HttpService);
  private readonly alertService = inject(AlertService);
  private readonly baseEndpoint = 'storage/api/files';

  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  getFile(id: string): Observable<FileContentResponse> {
    return this.http.get<FileContentResponse>(`${this.baseEndpoint}/${id}`);
  }

  deleteFile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseEndpoint}/${id}`);
  }

  uploadFile(request: FileUploadRequest): Observable<FileUploadResponse> {
    return this.http.post<FileUploadResponse>(this.baseEndpoint, request);
  }

  uploadFileFromBlob(
    file: File,
    fileType: FileType,
    options: {
      description?: string;
      reference?: string;
      ownerId?: string;
      makePermanent?: boolean;
    } = {}
  ): Observable<FileUploadResponse> {
    if (file.size > this.MAX_FILE_SIZE) {
      this.alertService.error(
        `File size exceeds maximum allowed size of ${this.formatFileSize(
          this.MAX_FILE_SIZE
        )}`
      );
      return throwError(
        () => new Error('File size exceeds maximum allowed size')
      );
    }

    if (!this.isValidFileType(file, fileType)) {
      this.alertService.error('Invalid file type for the selected category');
      return throwError(() => new Error('Invalid file type'));
    }

    return new Observable<FileUploadResponse>((observer) => {
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];

        const request: FileUploadRequest = {
          fileType: fileType.toString(),
          file: base64Data,
          description: options.description || '',
          reference: options.reference || '',
          ownerId: options.ownerId || '',
          makePermanent: options.makePermanent || false,
        };

        this.uploadFile(request)
          .pipe(
            catchError((error) => {
              this.alertService.error(
                'Failed to upload file. Please try again.'
              );
              return throwError(() => error);
            })
          )
          .subscribe({
            next: (response) => {
              this.alertService.success('File uploaded successfully');
              observer.next(response);
            },
            error: (error) => observer.error(error),
            complete: () => observer.complete(),
          });
      };

      reader.onerror = (error) => {
        this.alertService.error('Failed to read file');
        observer.error(error);
      };
      reader.readAsDataURL(file);
    });
  }

  makeFilePermanent(id: string): Observable<MakePermanentResponse> {
    return this.http.post<MakePermanentResponse>(
      `${this.baseEndpoint}/${id}/make-permanent`,
      {}
    );
  }

  getUserFiles(
    userId: string,
    fileType?: FileType
  ): Observable<FileMetadata[]> {
    let params = new HttpParams();

    if (fileType !== undefined) {
      params = params.set('fileType', fileType.toString());
    }

    return this.http.get<FileMetadata[]>(
      `${this.baseEndpoint}/user/${userId}`,
      params
    );
  }

  getFilesByReference(reference: string): Observable<FileMetadata[]> {
    return this.http.get<FileMetadata[]>(
      `${this.baseEndpoint}/reference/${reference}`
    );
  }

  downloadFile(id: string): Observable<Blob> {
    return new Observable<Blob>((observer) => {
      this.getFile(id).subscribe({
        next: (response) => {
          const byteCharacters = atob(response.fileContents);
          const byteNumbers = new Array(byteCharacters.length);

          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }

          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {
            type: response.contentType || 'application/octet-stream',
          });

          observer.next(blob);
          observer.complete();
        },
        error: (error) => observer.error(error),
      });
    });
  }

  downloadFileAndSave(id: string, fileName?: string): void {
    this.getFile(id).subscribe({
      next: (response) => {
        const byteCharacters = atob(response.fileContents);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: response.contentType || 'application/octet-stream',
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || response.fileDownloadName || 'download';
        link.click();

        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading file:', error);
      },
    });
  }

  getFileTypeDisplayName(fileType: FileType): string {
    const fileTypeNames: Record<FileType, string> = {
      [FileType.IdFront]: 'ID Front',
      [FileType.IdBack]: 'ID Back',
      [FileType.PassportMain]: 'Passport Main',
      [FileType.FacePhoto]: 'Face Photo',
      [FileType.Document]: 'Document',
      [FileType.Image]: 'Image',
      [FileType.Contract]: 'Contract',
      [FileType.Invoice]: 'Invoice',
      [FileType.Report]: 'Report',
      [FileType.Presentation]: 'Presentation',
      [FileType.Archive]: 'Archive',
      [FileType.Video]: 'Video',
      [FileType.Audio]: 'Audio',
      [FileType.Other]: 'Other',
    };

    return fileTypeNames[fileType] || 'Unknown';
  }

  getFileTypeIcon(fileType: FileType): string {
    const fileTypeIcons: Record<FileType, string> = {
      [FileType.IdFront]: 'id-card',
      [FileType.IdBack]: 'id-card',
      [FileType.PassportMain]: 'passport',
      [FileType.FacePhoto]: 'user',
      [FileType.Document]: 'file-text',
      [FileType.Image]: 'image',
      [FileType.Contract]: 'file-signature',
      [FileType.Invoice]: 'file-invoice',
      [FileType.Report]: 'file-chart',
      [FileType.Presentation]: 'file-powerpoint',
      [FileType.Archive]: 'file-archive',
      [FileType.Video]: 'video',
      [FileType.Audio]: 'music',
      [FileType.Other]: 'file',
    };

    return fileTypeIcons[fileType] || 'file';
  }

  isImageFileType(fileType: FileType): boolean {
    return [
      FileType.IdFront,
      FileType.IdBack,
      FileType.PassportMain,
      FileType.FacePhoto,
      FileType.Image,
    ].includes(fileType);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isValidFileType(file: File, fileType: FileType): boolean {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    switch (fileType) {
      case FileType.Image:
      case FileType.IdFront:
      case FileType.IdBack:
      case FileType.PassportMain:
      case FileType.FacePhoto:
        return mimeType.startsWith('image/');

      case FileType.Document:
        return (
          ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension) ||
          ['application/pdf', 'application/msword', 'text/plain'].some((t) =>
            mimeType.includes(t)
          )
        );

      case FileType.Contract:
      case FileType.Invoice:
        return (
          ['pdf', 'doc', 'docx'].includes(extension) ||
          ['application/pdf', 'application/msword'].some((t) =>
            mimeType.includes(t)
          )
        );

      case FileType.Report:
        return ['pdf', 'xls', 'xlsx', 'csv'].includes(extension);

      case FileType.Presentation:
        return (
          ['ppt', 'pptx', 'pdf'].includes(extension) ||
          mimeType.includes('powerpoint') ||
          mimeType.includes('presentation')
        );

      case FileType.Archive:
        return ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);

      case FileType.Video:
        return mimeType.startsWith('video/');

      case FileType.Audio:
        return mimeType.startsWith('audio/');

      case FileType.Other:
      default:
        return true;
    }
  }

  getAllowedExtensions(fileType: FileType): string[] {
    switch (fileType) {
      case FileType.Image:
      case FileType.IdFront:
      case FileType.IdBack:
      case FileType.PassportMain:
      case FileType.FacePhoto:
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

      case FileType.Document:
        return ['.pdf', '.doc', '.docx', '.txt', '.rtf'];

      case FileType.Contract:
      case FileType.Invoice:
        return ['.pdf', '.doc', '.docx'];

      case FileType.Report:
        return ['.pdf', '.xls', '.xlsx', '.csv'];

      case FileType.Presentation:
        return ['.ppt', '.pptx', '.pdf'];

      case FileType.Archive:
        return ['.zip', '.rar', '.7z', '.tar', '.gz'];

      case FileType.Video:
        return ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];

      case FileType.Audio:
        return ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];

      case FileType.Other:
      default:
        return ['*'];
    }
  }

  getAcceptAttribute(fileType: FileType): string {
    const extensions = this.getAllowedExtensions(fileType);
    if (extensions.includes('*')) {
      return '*';
    }

    const mimeTypes: string[] = [];
    if (this.isImageFileType(fileType)) {
      mimeTypes.push('image/*');
    } else if (fileType === FileType.Video) {
      mimeTypes.push('video/*');
    } else if (fileType === FileType.Audio) {
      mimeTypes.push('audio/*');
    }

    return [...extensions, ...mimeTypes].join(',');
  }

  uploadMultipleFiles(
    files: File[],
    fileType: FileType,
    options: {
      description?: string;
      reference?: string;
      ownerId?: string;
      makePermanent?: boolean;
    } = {}
  ): Observable<FileUploadProgress[]> {
    return new Observable<FileUploadProgress[]>((observer) => {
      const progress: FileUploadProgress[] = files.map((file, index) => ({
        fileId: `temp-${index}`,
        fileName: file.name,
        progress: 0,
        status: 'pending' as const,
      }));

      observer.next([...progress]);

      files.forEach((file, index) => {
        progress[index].status = 'uploading';
        observer.next([...progress]);

        this.uploadFileFromBlob(file, fileType, options).subscribe({
          next: (response) => {
            progress[index] = {
              fileId: response.fileId,
              fileName: file.name,
              progress: 100,
              status: 'completed',
            };
            observer.next([...progress]);

            if (
              progress.every(
                (p) => p.status === 'completed' || p.status === 'error'
              )
            ) {
              observer.complete();
            }
          },
          error: (error) => {
            progress[index] = {
              fileId: `temp-${index}`,
              fileName: file.name,
              progress: 0,
              status: 'error',
              error: error.message || 'Upload failed',
            };
            observer.next([...progress]);

            if (
              progress.every(
                (p) => p.status === 'completed' || p.status === 'error'
              )
            ) {
              observer.complete();
            }
          },
        });
      });
    });
  }

  deleteMultipleFiles(
    fileIds: string[]
  ): Observable<{ success: number; failed: number }> {
    return new Observable((observer) => {
      let success = 0;
      let failed = 0;
      let completed = 0;

      fileIds.forEach((id) => {
        this.deleteFile(id).subscribe({
          next: () => {
            success++;
            completed++;
            if (completed === fileIds.length) {
              observer.next({ success, failed });
              observer.complete();
            }
          },
          error: () => {
            failed++;
            completed++;
            if (completed === fileIds.length) {
              observer.next({ success, failed });
              observer.complete();
            }
          },
        });
      });
    });
  }
}
