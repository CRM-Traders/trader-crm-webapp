import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Client, PriceManagerService } from './services/price-manager.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { BulkOrderModalComponent } from './components/bulk-order-modal/bulk-order-modal.component';
import { TradingViewChartComponent } from '../../shared/components/trading-view-chart/trading-view-chart.component';

@Component({
  selector: 'app-price-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './price-manager.component.html',
  styleUrls: ['./price-manager.component.scss'],
})
export class PriceManagerComponent implements OnInit, OnDestroy {
  private service = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  activeClients = signal<Client[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searching = signal(false);

  // Pagination properties
  currentPage = signal(0);
  pageSize = signal(20);
  totalCount = signal(0);
  searchTerm = signal<string>('');
  searchInput = '';

  viewClientDetails(client: Client): void {
    this.router.navigate(['/manager', client.userId], {
      queryParams: { name: client.fullName },
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loading.set(true);
    this.searching.set(true);

    this.loadActiveClients()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.searching.set(false);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private loadActiveClients() {
    return this.service
      .getActiveClients(
        this.searchTerm() || null,
        this.currentPage(),
        this.pageSize()
      )
      .pipe(
        tap((response: any) => {
          // Handle different response formats
          let clients: Client[] = [];
          if (response?.items && Array.isArray(response.items)) {
            clients = response.items;
            this.totalCount.set(response.totalCount || clients.length);
          } else if (response?.clients && Array.isArray(response.clients)) {
            clients = response.clients;
            this.totalCount.set(response.totalCount || clients.length);
          } else if (response?.data && Array.isArray(response.data)) {
            clients = response.data;
            this.totalCount.set(response.totalCount || clients.length);
          } else if (Array.isArray(response)) {
            clients = response;
            this.totalCount.set(clients.length);
          } else {
            throw new Error('Invalid response format for active clients');
          }

          this.activeClients.set(clients);
        }),
        catchError((err: any) => {
          console.error('Error loading active clients:', err);
          let errorMessage =
            'Failed to load clients. Please check your connection and try again.';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        })
      );
  }

  refreshData(): void {
    this.loading.set(true);

    this.loadActiveClients()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onSearchInput(): void {
    const trimmedValue = this.searchInput?.trim() || '';
    this.searchTerm.set(trimmedValue);
    this.currentPage.set(0);
    this.loadInitialData();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(0);
    this.loadInitialData();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.getTotalPages()) {
      this.currentPage.set(page);
      this.loadInitialData();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.getTotalPages() - 1) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadInitialData();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadInitialData();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize());
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current < 3) {
        for (let i = 0; i < 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages - 1);
      } else if (current > totalPages - 4) {
        pages.push(0);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 5; i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(0);
        pages.push(-1); // Ellipsis
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages - 1);
      }
    }

    return pages;
  }

  getEndItem(): number {
    return Math.min(
      (this.currentPage() + 1) * this.pageSize(),
      this.totalCount()
    );
  }

  openBulkOrderModal(): void {
    const modalRef = this.modalService.open(
      BulkOrderModalComponent,
      {
        size: 'full',
        centered: true,
      },
      {
        clients: this.activeClients(),
      }
    );

    modalRef.result.then((result: any) => {
      window.location.reload();
    });
  }
}
