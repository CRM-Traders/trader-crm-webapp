// src/app/features/documents/documents.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KycDetailModalComponent } from './components/kyc-detail-modal/kyc-detail-modal.component';
import { debounceTime, Subject } from 'rxjs';
import {
  KycProcessDetail,
  KycProcessResponse,
  KycStatus,
  KycFilterParams,
  KycProcessListItem,
} from '../../shared/models/kyc/kyc.model';
import { KycService } from '../../shared/services/kyc/kyc.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, KycDetailModalComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <div class="px-6 py-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              KYC Documents
            </h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage and review user verification documents
            </p>
          </div>
          <button
            (click)="refreshData()"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              class="w-5 h-5"
              [ngClass]="{ 'animate-spin': loading() }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            Refresh
          </button>
        </div>

        <!-- Filters and Search -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700"
        >
          <div class="flex flex-wrap gap-4 mb-4">
            <!-- Search -->
            <div class="relative flex-1 min-w-[300px]">
              <svg
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
              <input
                type="text"
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange()"
                placeholder="Search by name, email, or user ID..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>

            <!-- Status Filter -->
            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option [value]="null">All Statuses</option>
              @for (status of statusOptions; track status.value) {
              <option [value]="status.value">{{ status.label }}</option>
              }
            </select>

            <!-- Sort -->
            <select
              [(ngModel)]="sortBy"
              (ngModelChange)="onFilterChange()"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="lastActivityTime">Last Activity</option>
              <option value="createdAt">Created Date</option>
              <option value="status">Status</option>
            </select>

            <!-- Sort Direction -->
            <button
              (click)="toggleSortDirection()"
              class="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              [title]="sortDescending ? 'Newest First' : 'Oldest First'"
            >
              @if (sortDescending) {
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                ></path>
              </svg>
              } @else {
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                ></path>
              </svg>
              }
            </button>
          </div>

          <!-- Status Summary -->
          @if (processResponse()) {
          <div class="flex flex-wrap gap-2">
            @for (status of statusSummary; track status.label) {
            <div
              class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
              [ngClass]="{
                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                  status.color === 'blue',
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                  status.color === 'yellow',
                'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200':
                  status.color === 'orange',
                'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200':
                  status.color === 'purple',
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                  status.color === 'green',
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                  status.color === 'red'
              }"
            >
              <span class="font-bold">{{ status.count }}</span>
              <span>{{ status.label }}</span>
            </div>
            }
          </div>
          }
        </div>

        <!-- Content -->
        <div class="min-h-[400px]">
          @if (loading()) {
          <div class="flex flex-col items-center justify-center h-64">
            <div
              class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"
            ></div>
            <p class="text-gray-600 dark:text-gray-400">
              Loading KYC processes...
            </p>
          </div>
          } @else if (error()) {
          <div class="flex flex-col items-center justify-center h-64">
            <svg
              class="w-16 h-16 text-red-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              Failed to load KYC processes
            </p>
            <p class="text-gray-600 dark:text-gray-400 mt-1">{{ error() }}</p>
            <button
              (click)="loadData()"
              class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
          } @else if (processes().length === 0) {
          <div class="flex flex-col items-center justify-center h-64">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              No KYC processes found
            </p>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              @if (searchTerm || selectedStatus) { Try adjusting your filters }
              @else { No verification processes have been submitted yet }
            </p>
          </div>
          } @else {
          <!-- Process Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (process of processes(); track process.id) {
            <div
              class="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
              (click)="openDetail(process)"
            >
              <!-- Card Header -->
              <div
                class="p-4 flex justify-between items-start border-b border-gray-200 dark:border-gray-700"
              >
                <div class="flex gap-3">
                  <div
                    class="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold"
                  >
                    {{ getInitials(process.userFullName) }}
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900 dark:text-white">
                      {{ process.userFullName || 'Unknown User' }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ process.userEmail || 'No email' }}
                    </p>
                  </div>
                </div>
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="{
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                      kycService.getStatusColor(process.status) === 'blue',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                      kycService.getStatusColor(process.status) === 'yellow',
                    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200':
                      kycService.getStatusColor(process.status) === 'orange',
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200':
                      kycService.getStatusColor(process.status) === 'purple',
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                      kycService.getStatusColor(process.status) === 'green',
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                      kycService.getStatusColor(process.status) === 'red'
                  }"
                >
                  {{ kycService.getStatusLabel(process.status) }}
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <div
                  class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2"
                >
                  <span>Document Completion</span>
                  <span
                    >{{
                      kycService.calculateCompletionPercentage(process)
                    }}%</span
                  >
                </div>
                <div
                  class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-blue-600 transition-all duration-300"
                    [style.width.%]="
                      kycService.calculateCompletionPercentage(process)
                    "
                  ></div>
                </div>
              </div>

              <!-- Document Status -->
              <div
                class="grid grid-cols-2 gap-2 p-4 border-b border-gray-200 dark:border-gray-700"
              >
                <div
                  class="flex items-center gap-2 text-sm"
                  [ngClass]="{
                    'text-green-600 dark:text-green-400':
                      process.hasFrontIdDocument,
                    'text-gray-600 dark:text-gray-400':
                      !process.hasBackIdDocument
                  }"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    ></path>
                  </svg>
                  <span>ID Front</span>
                </div>
                <div
                  class="flex items-center gap-2 text-sm"
                  [ngClass]="{
                    'text-green-600 dark:text-green-400':
                      process.hasFrontIdDocument,
                    'text-gray-600 dark:text-gray-400':
                      !process.hasBackIdDocument
                  }"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    ></path>
                  </svg>
                  <span>ID Back</span>
                </div>
                <div
                  class="flex items-center gap-2 text-sm"
                  [ngClass]="{
                    'text-green-600 dark:text-green-400': process.hasPassport,
                    'text-gray-600 dark:text-gray-400': !process.hasPassport
                  }"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    ></path>
                  </svg>
                  <span>Passport</span>
                </div>
                <div
                  class="flex items-center gap-2 text-sm"
                  [ngClass]="{
                    'text-green-600 dark:text-green-400': process.hasFacePhoto,
                    'text-gray-600 dark:text-gray-400': !process.hasFacePhoto
                  }"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  <span>Face Photo</span>
                </div>
              </div>

              <!-- Card Footer -->
              <div
                class="flex justify-around p-4 border-b border-gray-200 dark:border-gray-700"
              >
                <div class="text-center">
                  <span class="block text-xs text-gray-600 dark:text-gray-400"
                    >Submissions</span
                  >
                  <span
                    class="block text-lg font-semibold text-gray-900 dark:text-white"
                    >{{ process.totalSubmissions }}</span
                  >
                </div>
                <div class="text-center">
                  <span class="block text-xs text-gray-600 dark:text-gray-400"
                    >Approved</span
                  >
                  <span class="block text-lg font-semibold text-green-600">{{
                    process.approvedCount
                  }}</span>
                </div>
                <div class="text-center">
                  <span class="block text-xs text-gray-600 dark:text-gray-400"
                    >Rejected</span
                  >
                  <span class="block text-lg font-semibold text-red-600">{{
                    process.rejectedCount
                  }}</span>
                </div>
              </div>

              <!-- Last Activity -->
              <div
                class="flex items-center gap-2 px-4 py-3 text-xs text-gray-600 dark:text-gray-400"
              >
                <svg
                  class="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span
                  >Last activity:
                  {{ formatRelativeTime(process.lastActivityTime) }}</span
                >
              </div>
            </div>
            }
          </div>

          <!-- Pagination -->
          @if (processResponse() && processResponse()!.totalPages > 1) {
          <div class="flex justify-center items-center gap-4 mt-6">
            <button
              (click)="goToPage(currentPage - 1)"
              [disabled]="currentPage === 1"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div class="text-sm text-gray-600 dark:text-gray-400">
              Page {{ currentPage }} of {{ processResponse()!.totalPages }}
            </div>

            <button
              (click)="goToPage(currentPage + 1)"
              [disabled]="currentPage === processResponse()!.totalPages"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
          } }
        </div>

        <!-- Detail Modal -->
        @if (selectedProcess()) {
        <app-kyc-detail-modal
          [process]="selectedProcess()!"
          [onClose]="closeDetail.bind(this)"
          [onUpdate]="refreshData.bind(this)"
        >
        </app-kyc-detail-modal>
        }
      </div>
    </div>
  `,
})
export class DocumentsComponent implements OnInit {
  protected kycService = inject(KycService);

  // State
  loading = signal(false);
  error = signal<string | null>(null);
  processes = signal<KycProcessListItem[]>([]);
  processResponse = signal<KycProcessResponse | null>(null);
  selectedProcess = signal<KycProcessListItem | null>(null);

  // Filters
  searchTerm = '';
  selectedStatus: KycStatus | null = null;
  sortBy: 'lastActivityTime' | 'createdAt' | 'status' = 'lastActivityTime';
  sortDescending = true;
  currentPage = 1;
  pageSize = 12;

  // Search debounce
  private searchSubject = new Subject<string>();

  statusOptions = [
    { value: KycStatus.NotStarted, label: 'New' },
    { value: KycStatus.InProgress, label: 'Partially Completed' },
    { value: KycStatus.DocumentsUploaded, label: 'Documents Uploaded' },
    { value: KycStatus.UnderReview, label: 'Under Review' },
    { value: KycStatus.Verified, label: 'Verified' },
    { value: KycStatus.Rejected, label: 'Rejected' },
  ];

  get statusSummary() {
    const response = this.processResponse();
    if (!response) return [];

    return this.statusOptions.map((option) => ({
      label: option.label,
      count: response.statusCounts[option.value.toString()] || 0,
      color: this.kycService.getStatusColor(option.value),
    }));
  }

  ngOnInit(): void {
    // Setup search debounce
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.currentPage = 1;
      this.loadData();
    });

    // Load initial data
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: KycFilterParams = {
      searchTerm: this.searchTerm || undefined,
      status: this.selectedStatus || undefined,
      sortBy: this.sortBy,
      sortDescending: this.sortDescending,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
    };

    this.kycService.getProcesses(params).subscribe({
      next: (response) => {
        this.processResponse.set(response);
        this.processes.set(response.items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load KYC processes. Please try again.');
        this.loading.set(false);
      },
    });
  }

  refreshData(): void {
    this.loadData();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  toggleSortDirection(): void {
    this.sortDescending = !this.sortDescending;
    this.loadData();
  }

  goToPage(page: number): void {
    const response = this.processResponse();
    if (!response || page < 1 || page > response.totalPages) return;

    this.currentPage = page;
    this.loadData();
  }

  openDetail(process: KycProcessListItem): void {
    this.selectedProcess.set(process);
  }

  closeDetail(): void {
    this.selectedProcess.set(null);
  }

  getInitials(name: string | null): string {
    if (!name) return '?';

    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60)
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }
}
