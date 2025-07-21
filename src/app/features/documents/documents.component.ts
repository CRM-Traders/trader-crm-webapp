import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { HttpService } from '../../core/services/http.service';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';

// KYC Models
export interface KycProcess {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  status: KycStatus;
  sessionToken: string;
  createdAt: string;
  lastActivityTime: string;
  verificationComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  hasFrontIdDocument: boolean;
  hasBackIdDocument: boolean;
  hasPassport: boolean;
  hasFacePhoto: boolean;
  isDocumentationComplete: boolean;
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  lastApprovedDate: string | null;
  history: KycHistory[];
}

export interface KycHistory {
  id: string;
  status: KycStatus;
  createdAt: string;
  reviewedAt: string | null;
  verificationComment: string | null;
  isCurrent: boolean;
}

export interface KycProcessResponse {
  items: KycProcess[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

export enum KycStatus {
  NotStarted = 0,
  InProgress = 1,
  DocumentsUploaded = 2,
  UnderReview = 3,
  Verified = 4,
  Rejected = 5,
}

export enum KycDocumentType {
  FrontNationalId = 1,
  BackNationalId = 2,
  Passport = 3,
  FacePhoto = 4,
  ProofOfAddress = 5,
  Other = 99,
}

export enum KycDocumentStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Deleted = 3,
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent implements OnInit {
  private readonly httpService = inject(HttpService);
  private readonly alertService = inject(AlertService);

  // Signals for reactive state
  private readonly _processes = signal<KycProcess[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _totalCount = signal<number>(0);
  private readonly _currentPage = signal<number>(1);
  private readonly _pageSize = signal<number>(20);
  private readonly _statusFilter = signal<KycStatus | null>(null);
  private readonly _searchQuery = signal<string>('');

  // Read-only computed properties
  readonly processes = this._processes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();

  // Computed properties
  readonly totalPages = computed(() =>
    Math.ceil(this._totalCount() / this._pageSize())
  );
  readonly hasNextPage = computed(
    () => this._currentPage() < this.totalPages()
  );
  readonly hasPreviousPage = computed(() => this._currentPage() > 1);

  // Expose enum for template
  readonly KycStatus = KycStatus;

  ngOnInit(): void {
    this.loadProcesses();
  }

  loadProcesses(): void {
    this._loading.set(true);

    let params = new HttpParams()
      .set('pageNumber', this._currentPage().toString())
      .set('pageSize', this._pageSize().toString());

    if (this._statusFilter()) {
      params = params.set('statuses', this._statusFilter()!.toString());
    }

    if (this._searchQuery()) {
      params = params.set('searchQuery', this._searchQuery());
    }

    this.httpService
      .get<KycProcessResponse>('identity/api/kyc/get-clients-kyc', params)
      .subscribe({
        next: (response) => {
          this._processes.set(response.items);
          this._totalCount.set(response.totalCount);
          this._loading.set(false);
        },
        error: (error) => {
          this.alertService.error('Failed to load KYC processes');
          this._loading.set(false);
        },
      });
  }

  onStatusFilterChange(status: KycStatus | null): void {
    this._statusFilter.set(status);
    this._currentPage.set(1);
    this.loadProcesses();
  }

  onSearchChange(query: string): void {
    this._searchQuery.set(query);
    this._currentPage.set(1);
    this.loadProcesses();
  }

  onPageChange(page: number): void {
    this._currentPage.set(page);
    this.loadProcesses();
  }

  getStatusLabel(status: KycStatus): string {
    switch (status) {
      case KycStatus.NotStarted:
        return 'Not Started';
      case KycStatus.InProgress:
        return 'In Progress';
      case KycStatus.DocumentsUploaded:
        return 'Documents Uploaded';
      case KycStatus.UnderReview:
        return 'Under Review';
      case KycStatus.Verified:
        return 'Verified';
      case KycStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getStatusColor(status: KycStatus): string {
    switch (status) {
      case KycStatus.NotStarted:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case KycStatus.InProgress:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case KycStatus.DocumentsUploaded:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case KycStatus.UnderReview:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case KycStatus.Verified:
        return 'bg-green-100 text-green-800 border-green-300';
      case KycStatus.Rejected:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getCompletionPercentage(process: KycProcess): number {
    const requiredDocs = 4; // frontId, backId, passport, facePhoto
    let completed = 0;

    if (process.hasFrontIdDocument) completed++;
    if (process.hasBackIdDocument) completed++;
    if (process.hasPassport) completed++;
    if (process.hasFacePhoto) completed++;

    return Math.round((completed / requiredDocs) * 100);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  refreshProcesses(): void {
    this.loadProcesses();
  }

  calculatePages() {
    return Math.min(this.totalPages(), 5);
  }

  calculateShow() {
    return Math.min(this.currentPage() * this.pageSize(), this.totalCount());
  }
}
