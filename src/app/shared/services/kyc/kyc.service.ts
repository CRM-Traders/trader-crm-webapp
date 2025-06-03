// src/app/core/services/kyc.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpService } from '../../../core/services/http.service';
import {
  KycFilterParams,
  KycProcessResponse,
  KycProcessDetail,
  KycReviewRequest,
  KycStatus,
  KycProcessListItem,
} from '../../models/kyc/kyc.model';
import { FileType } from '../../../core/models/storage.model';

@Injectable({
  providedIn: 'root',
})
export class KycService {
  private readonly http = inject(HttpService);
  private readonly baseEndpoint = 'identity/api/kyc';

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

  getProcessById(id: string): Observable<KycProcessDetail> {
    return this.http.get<KycProcessDetail>(
      `${this.baseEndpoint}/process/${id}`
    );
  }

  getProcessHistory(id: string): Observable<KycProcessDetail[]> {
    return this.http.get<KycProcessDetail[]>(
      `${this.baseEndpoint}/${id}/history`
    );
  }

  reviewProcess(review: KycReviewRequest): Observable<KycProcessDetail> {
    return this.http.post<KycProcessDetail>(
      `${this.baseEndpoint}/${review.processId}/review`,
      {
        status: review.status,
        comment: review.comment,
      }
    );
  }

  updateProcessStatus(
    id: string,
    status: KycStatus
  ): Observable<KycProcessDetail> {
    return this.http.patch<KycProcessDetail>(
      `${this.baseEndpoint}/${id}/status`,
      {
        status,
      }
    );
  }

  refreshCurrentList(): void {
    this.getProcesses(this.currentFilterSubject.value).subscribe();
  }

  getStatusLabel(status: KycStatus): string {
    const labels: Record<KycStatus, string> = {
      [KycStatus.NotStarted]: 'New',
      [KycStatus.InProgress]: 'Partially Completed',
      [KycStatus.DocumentsUploaded]: 'Documents Uploaded',
      [KycStatus.UnderReview]: 'Under Review',
      [KycStatus.Verified]: 'Verified',
      [KycStatus.Rejected]: 'Rejected',
    };

    return labels[status] || 'Unknown';
  }

  getStatusColor(status: KycStatus): string {
    const colors: Record<KycStatus, string> = {
      [KycStatus.NotStarted]: 'blue',
      [KycStatus.InProgress]: 'yellow',
      [KycStatus.DocumentsUploaded]: 'orange',
      [KycStatus.UnderReview]: 'purple',
      [KycStatus.Verified]: 'green',
      [KycStatus.Rejected]: 'red',
    };

    return colors[status] || 'gray';
  }

  getStatusIcon(status: KycStatus): string {
    const icons: Record<KycStatus, string> = {
      [KycStatus.NotStarted]: 'file-plus',
      [KycStatus.InProgress]: 'clock',
      [KycStatus.DocumentsUploaded]: 'file-check',
      [KycStatus.UnderReview]: 'eye',
      [KycStatus.Verified]: 'check-circle',
      [KycStatus.Rejected]: 'x-circle',
    };

    return icons[status] || 'file';
  }

  calculateCompletionPercentage(
    process: KycProcessDetail | KycProcessListItem
  ): number {
    const requiredDocs = 4; // ID Front, ID Back, Passport, Face Photo
    let completedDocs = 0;
    const proc = process as KycProcessDetail;
    if (proc.hasFrontNationalId) completedDocs++;
    if (proc.hasBackNationalId) completedDocs++;
    if (proc.hasPassport) completedDocs++;
    if (proc.hasFacePhoto) completedDocs++;

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
  documentId: string;
  kycProcessId: string;
  documentType: FileType;
  fileName: string;
  fileSize: number;
  status: number;
}

export interface QrCodeResponse {
  kycProcessId: string;
  sessionToken: string;
  continuationUrl: string;
}
