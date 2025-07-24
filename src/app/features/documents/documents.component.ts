import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

import { HttpService } from '../../core/services/http.service';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { FilePreviewComponent, PreviewFile } from '../../shared/components/file-preview/file-preview.component';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';

// Client and File Models
export interface StoredFile {
  id: string;
  userId: string;
  fileName: string;
  fileExtension: string;
  contentType: string;
  fileSize: number;
  fileType: DocumentType;
  status: DocumentStatus;
  bucketName: string;
  kycProcessId: string | null;
  creationTime: string;
  fileUrl: string;
  reference: string | null;
  description: string | null;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  country: string;
  status: number;
  isProblematic: boolean;
  isBonusAbuser: boolean;
  affiliateId: string;
  affiliateName: string;
  userFullName: string;
  ftdTime: string | null;
  registrationDate: string;
  storedFiles: StoredFile[];
}

export interface ClientsResponse {
  items: Client[];
  totalCount: number;
}

export enum DocumentType {
  FrontNationalId = 1,
  BackNationalId = 2,
  Passport = 3,
  FacePhoto = 4,
  ProofOfAddress = 5,
  Other = 99,
}

export enum DocumentStatus {
  Temporary = 1,
  Permanent = 2,
  Processing = 3,
  Deleted = 4,
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FilePreviewComponent, HasPermissionDirective],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  private readonly httpService = inject(HttpService);
  private readonly alertService = inject(AlertService);

  // Search debouncing
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  // Signals for reactive state
  private readonly _clients = signal<Client[]>([]);
  private readonly _allClients = signal<Client[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _totalCount = signal<number>(0);
  private readonly _currentPage = signal<number>(1);
  private readonly _pageSize = signal<number>(20);
  private readonly _statusFilter = signal<DocumentStatus | null>(null);
  private readonly _searchQuery = signal<string>('');

  // Read-only computed properties
  readonly clients = this._clients.asReadonly();
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

  // Expose enums for template
  readonly DocumentStatus = DocumentStatus;
  readonly DocumentType = DocumentType;

  // File preview state
  showFilePreview = false;
  selectedFile: PreviewFile | null = null;

  ngOnInit(): void {
    // Setup search debouncing
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this._searchQuery.set(query);
        this._currentPage.set(1);
        this.filterAndPaginateClients();
      });

    this.loadClients();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  loadClients(): void {
    this._loading.set(true);

    this.httpService
      .get<ClientsResponse>('identity/api/kyc/get-clients-kyc')
      .subscribe({
        next: (response) => {
          this._allClients.set(response.items);
          this._totalCount.set(response.totalCount);
          this.filterAndPaginateClients();
          this._loading.set(false);
        },
        error: (error) => {
          this.alertService.error('Failed to load clients');
          this._loading.set(false);
        },
      });
  }

  filterAndPaginateClients(): void {
    let filteredClients = this._allClients();

    // Apply search filter
    if (this._searchQuery()) {
      const searchTerm = this._searchQuery().toLowerCase();
      filteredClients = filteredClients.filter(client => 
        client.userFullName.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        client.firstName.toLowerCase().includes(searchTerm) ||
        client.lastName.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (this._statusFilter()) {
      filteredClients = filteredClients.filter(client =>
        client.storedFiles.some(file => file.status === this._statusFilter())
      );
    }

    // Update total count for pagination
    this._totalCount.set(filteredClients.length);

    // Apply pagination
    const startIndex = (this._currentPage() - 1) * this._pageSize();
    const endIndex = startIndex + this._pageSize();
    const paginatedClients = filteredClients.slice(startIndex, endIndex);

    this._clients.set(paginatedClients);
  }

  onStatusFilterChange(status: DocumentStatus | null): void {
    this._statusFilter.set(status);
    this._currentPage.set(1);
    this.filterAndPaginateClients();
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  onPageChange(page: number): void {
    this._currentPage.set(page);
    this.filterAndPaginateClients();
  }

  getStatusLabel(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Temporary:
        return 'Temporary';
      case DocumentStatus.Permanent:
        return 'Permanent';
      case DocumentStatus.Processing:
        return 'Processing';
      default:
        return 'Unknown';
    }
  }

  getStatusColor(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Temporary:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case DocumentStatus.Permanent:
        return 'bg-green-100 text-green-800 border-green-300';
      case DocumentStatus.Processing:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  getDocumentTypeLabel(type: DocumentType): string {
    switch (type) {
      case DocumentType.FrontNationalId:
        return 'Front National ID';
      case DocumentType.BackNationalId:
        return 'Back National ID';
      case DocumentType.Passport:
        return 'Passport';
      case DocumentType.FacePhoto:
        return 'Face Photo';
      case DocumentType.ProofOfAddress:
        return 'Proof of Address';
      case DocumentType.Other:
        return 'Other';
      default:
        return 'Unknown';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  refreshDocuments(): void {
    this.loadClients();
  }

  calculatePages() {
    return Math.min(this.totalPages(), 5);
  }

  calculateShow() {
    return Math.min(this.currentPage() * this.pageSize(), this.totalCount());
  }

  showPreview(file: StoredFile): void {
    this.selectedFile = {
      id: file.id,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileSize: file.fileSize,
      contentType: file.contentType,
      createdAt: file.creationTime,
      fileExtension: file.fileExtension,
      isImage: file.contentType?.startsWith('image/') || false,
      isPdf: file.contentType === 'application/pdf' || false
    };
    this.showFilePreview = true;
  }

  closeFilePreview(): void {
    this.showFilePreview = false;
    this.selectedFile = null;
  }
}
