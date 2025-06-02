// src/app/core/services/kyc.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import {
  KycFilterParams,
  KycProcessResponse,
  KycProcess,
  KycReviewRequest,
  KycStatus,
} from '../../models/kyc/kyc.model';
import { FileType } from '../../../core/models/storage.model';

@Injectable({
  providedIn: 'root',
})
export class KycService {
  private readonly http = inject(HttpService);
  private readonly baseEndpoint = 'storage/api/kyc';

  private currentFilterSubject = new BehaviorSubject<KycFilterParams>({
    sortBy: 'lastActivityTime',
    sortDescending: true,
    pageNumber: 1,
    pageSize: 20,
  });

  currentFilter$ = this.currentFilterSubject.asObservable();

  // Cache for the processes list
  private processesSubject = new BehaviorSubject<KycProcessResponse | null>(
    null
  );
  processes$ = this.processesSubject.asObservable();

  getProcesses(params?: KycFilterParams): Observable<KycProcessResponse> {
    const filter = { ...this.currentFilterSubject.value, ...params };
    this.currentFilterSubject.next(filter);

    let httpParams = new HttpParams();

    if (filter.status !== undefined) {
      httpParams = httpParams.set('status', filter.status.toString());
    }

    if (filter.userId) {
      httpParams = httpParams.set('userId', filter.userId);
    }

    if (filter.searchTerm) {
      httpParams = httpParams.set('searchTerm', filter.searchTerm);
    }

    if (filter.sortBy) {
      httpParams = httpParams.set('sortBy', filter.sortBy);
    }

    if (filter.sortDescending !== undefined) {
      httpParams = httpParams.set(
        'sortDescending',
        filter.sortDescending.toString()
      );
    }

    if (filter.pageNumber) {
      httpParams = httpParams.set('pageNumber', filter.pageNumber.toString());
    }

    if (filter.pageSize) {
      httpParams = httpParams.set('pageSize', filter.pageSize.toString());
    }

    return this.http
      .get<KycProcessResponse>(`${this.baseEndpoint}/processes`, httpParams)
      .pipe(tap((response) => this.processesSubject.next(response)));
  }

  getProcessById(id: string): Observable<KycProcess> {
    return this.http.get<KycProcess>(`${this.baseEndpoint}/process/${id}`);
  }

  getProcessHistory(id: string): Observable<KycProcess[]> {
    return this.http.get<KycProcess[]>(`${this.baseEndpoint}/${id}/history`);
  }

  reviewProcess(review: KycReviewRequest): Observable<KycProcess> {
    return this.http.post<KycProcess>(
      `${this.baseEndpoint}/${review.processId}/review`,
      {
        status: review.status,
        comment: review.comment,
      }
    );
  }

  updateProcessStatus(id: string, status: KycStatus): Observable<KycProcess> {
    return this.http.patch<KycProcess>(`${this.baseEndpoint}/${id}/status`, {
      status,
    });
  }

  refreshCurrentList(): void {
    this.getProcesses(this.currentFilterSubject.value).subscribe();
  }

  getStatusLabel(status: KycStatus): string {
    const labels: Record<KycStatus, string> = {
      [KycStatus.New]: 'New',
      [KycStatus.PartiallyCompleted]: 'Partially Completed',
      [KycStatus.DocumentsUploaded]: 'Documents Uploaded',
      [KycStatus.UnderReview]: 'Under Review',
      [KycStatus.Verified]: 'Verified',
      [KycStatus.Rejected]: 'Rejected',
    };

    return labels[status] || 'Unknown';
  }

  getStatusColor(status: KycStatus): string {
    const colors: Record<KycStatus, string> = {
      [KycStatus.New]: 'blue',
      [KycStatus.PartiallyCompleted]: 'yellow',
      [KycStatus.DocumentsUploaded]: 'orange',
      [KycStatus.UnderReview]: 'purple',
      [KycStatus.Verified]: 'green',
      [KycStatus.Rejected]: 'red',
    };

    return colors[status] || 'gray';
  }

  getStatusIcon(status: KycStatus): string {
    const icons: Record<KycStatus, string> = {
      [KycStatus.New]: 'file-plus',
      [KycStatus.PartiallyCompleted]: 'clock',
      [KycStatus.DocumentsUploaded]: 'file-check',
      [KycStatus.UnderReview]: 'eye',
      [KycStatus.Verified]: 'check-circle',
      [KycStatus.Rejected]: 'x-circle',
    };

    return icons[status] || 'file';
  }

  calculateCompletionPercentage(process: KycProcess): number {
    const requiredDocs = 4; // ID Front, ID Back, Passport, Face Photo
    let completedDocs = 0;

    if (process.hasIdFront) completedDocs++;
    if (process.hasIdBack) completedDocs++;
    if (process.hasPassport) completedDocs++;
    if (process.hasFacePhoto) completedDocs++;

    return Math.round((completedDocs / requiredDocs) * 100);
  }

  createProcess(): Observable<CreateKycProcessResponse> {
    return this.http.post<CreateKycProcessResponse>(
      `${this.baseEndpoint}/process`,
      {}
    );
  }

  uploadKycFile(request: {
    kycProcessIdOrToken: string;
    fileType: FileType;
    file: File;
  }): Observable<UploadKycFileResponse> {
    const formData = new FormData();
    formData.append('KycProcessIdOrToken', request.kycProcessIdOrToken);
    formData.append('FileType', request.fileType.toString());
    formData.append('File', request.file);

    // Using HttpClient directly for FormData
    return this.http['_http'].post<UploadKycFileResponse>(
      `${this.http['_apiUrl']}/${this.baseEndpoint}/upload`,
      formData
    );
  }

  getQrCode(idOrToken: string): Observable<QrCodeResponse> {
    return this.http.get<QrCodeResponse>(
      `${this.baseEndpoint}/qr/${idOrToken}`
    );
  }
}

// Additional interfaces needed for the service
export interface CreateKycProcessResponse {
  kycProcessId: string;
  sessionToken: string;
  continuationUrl: string;
  qrCodeUrl: string;
}

export interface UploadKycFileResponse {
  fileId: string;
  kycProcessId: string;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  status: number;
}

export interface QrCodeResponse {
  kycProcessId: string;
  sessionToken: string;
  continuationUrl: string;
}
