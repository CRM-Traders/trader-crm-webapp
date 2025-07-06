import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';

// Interfaces based on the OpenAPI specification
export interface StoredFileDto {
  id: string;
  userId: string;
  fileName: string;
  fileExtension: string;
  contentType: string;
  fileSize: number;
  fileType: FileType;
  status: FileStatus;
  bucketName: string;
  kycProcessId?: string | null;
  creationTime: string;
  fileUrl: string;
  reference?: string | null;
  description?: string | null;
}

export interface UploadFileResponse {
  fileId: string;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  status: FileStatus;
  fileUrl: string;
}

export interface MakePermanentResponse {
  fileId: string;
  newPath: string;
  newBucket: string;
  success: boolean;
}

export interface FileContentResult {
  fileContents: string; // base64 encoded
  contentType?: string;
  fileDownloadName?: string;
  lastModified?: string;
  enableRangeProcessing: boolean;
}

export enum FileType {
  IdFront = 1,
  IdBack = 2,
  PassportMain = 3,
  FacePhoto = 4,

  Document = 10,
  Image = 11,
  Contract = 12,
  Invoice = 13,
  Report = 14,
  Presentation = 15,
  Archive = 16,
  Video = 17,
  Audio = 18,

  Other = 99
}

export enum FileStatus {
  Temporary = 0,
  Permanent = 1,
  Deleted = 2
}

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'storage/api/files';

  /**
   * Upload a file
   */
  uploadFile(file: File, metadata?: { description?: string; reference?: string; fileType?: FileType; ownerId?: string; makePermanent?: boolean }): Observable<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata?.description) {
      formData.append('description', metadata.description);
    }
    if (metadata?.reference) {
      formData.append('reference', metadata.reference);
    }
    if (metadata?.fileType !== undefined) {
      formData.append('fileType', metadata.fileType.toString());
    }
    if (metadata?.ownerId) {
      formData.append('ownerId', metadata.ownerId);
    }
    if (metadata?.makePermanent !== undefined) {
      formData.append('makePermanent', metadata.makePermanent.toString());
    }

    return this.httpService.post<UploadFileResponse>(this.apiPath, formData);
  }

  /**
   * Get file content by ID
   */
  getFileContent(fileId: string): Observable<FileContentResult> {
    return this.httpService.get<FileContentResult>(`${this.apiPath}/${fileId}`);
  }

  /**
   * Delete a file by ID
   */
  deleteFile(fileId: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${fileId}`);
  }

  /**
   * Make a file permanent
   */
  makeFilePermanent(fileId: string): Observable<MakePermanentResponse> {
    return this.httpService.post<MakePermanentResponse>(`${this.apiPath}/${fileId}/make-permanent`, {});
  }

  /**
   * Get files by user ID
   */
  getFilesByUserId(userId: string, fileType?: string): Observable<StoredFileDto[]> {
    const url = fileType 
      ? `${this.apiPath}/user?userId=${userId}?fileType=${encodeURIComponent(fileType)}`
      : `${this.apiPath}/user?userId=${userId}`;
    return this.httpService.get<StoredFileDto[]>(url);
  }

  /**
   * Get file by reference
   */
  getFileByReference(reference: string): Observable<StoredFileDto[]> {
    return this.httpService.get<StoredFileDto[]>(`${this.apiPath}/reference/${reference}`);
  }

  /**
   * Download file as blob
   */
  downloadFile(fileId: string): Observable<Blob> {
    return this.httpService.getFile(`api/files/${fileId}`);
  }
}
