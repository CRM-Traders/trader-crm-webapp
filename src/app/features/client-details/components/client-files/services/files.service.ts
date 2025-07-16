import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';

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

  Other = 99,
}

export enum FileStatus {
  Temporary = 1,
  Permanent = 2,
  Processing = 3,
  Deleted = 4,
}

@Injectable({
  providedIn: 'root',
})
export class FilesService {
  private httpService = inject(HttpService);
  private readonly apiPath = 'storage/api/files';

  uploadFile(
    file: File,
    metadata?: {
      description?: string;
      reference?: string;
      fileType?: FileType;
      ownerId?: string;
      makePermanent?: boolean;
    }
  ): Observable<UploadFileResponse> {
    if (!file || file.size === 0) {
      throw new Error('File is empty or invalid');
    }

    const formData = new FormData();
    formData.append('file', file);

    formData.append('description', metadata?.description || '');

    formData.append('reference', metadata?.reference || '');

    if (metadata?.fileType !== undefined && metadata?.fileType !== null) {
      formData.append('fileType', metadata.fileType.toString());
    }
    if (metadata?.ownerId) {
      formData.append('ownerId', metadata.ownerId);
    }
    if (metadata?.makePermanent !== undefined) {
      formData.append('makePermanent', metadata.makePermanent.toString());
    }

    return this.httpService.postForm<UploadFileResponse>(
      this.apiPath,
      formData
    );
  }

  getFileContent(fileId: string): Observable<FileContentResult> {
    return this.httpService.get<FileContentResult>(`${this.apiPath}/${fileId}`);
  }

  deleteFile(fileId: string): Observable<void> {
    return this.httpService.delete<void>(`${this.apiPath}/${fileId}`);
  }

  makeFilePermanent(fileId: string): Observable<MakePermanentResponse> {
    return this.httpService.post<MakePermanentResponse>(
      `${this.apiPath}/${fileId}/make-permanent`,
      {}
    );
  }

  getFilesByUserId(
    userId: string,
    fileType?: string
  ): Observable<StoredFileDto[]> {
    const url = fileType
      ? `${this.apiPath}/user?userId=${userId}?fileType=${encodeURIComponent(
          fileType
        )}`
      : `${this.apiPath}/user?userId=${userId}`;
    return this.httpService.get<StoredFileDto[]>(url);
  }

  getFileByReference(reference: string): Observable<StoredFileDto[]> {
    return this.httpService.get<StoredFileDto[]>(
      `${this.apiPath}/reference/${reference}`
    );
  }

  downloadFile(fileId: string): Observable<Blob> {
    return this.httpService.getFile(`api/files/${fileId}`);
  }
}
