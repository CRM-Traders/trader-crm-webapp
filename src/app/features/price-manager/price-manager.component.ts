import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  Client,
  PriceManagerService,
  Order,
  ReopenOrderRequest,
} from './services/price-manager.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap, of, interval, debounceTime, distinctUntilChanged } from 'rxjs';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { AlertService } from '../../core/services/alert.service';
import { ModalService } from '../../shared/services/modals/modal.service';
import { AuthService } from '../../core/services/auth.service';
import { BulkOrderModalComponent } from './components/bulk-order-modal/bulk-order-modal.component';
import { OrderEditModalComponent } from './components/order-edit-modal/order-edit-modal.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TradingViewChartComponent } from '../../shared/components/trading-view-chart/trading-view-chart.component';
import { HttpErrorResponse } from '@angular/common/http';

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
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();
  private ordersSearchSubject$ = new Subject<string>();

  activeClients = signal<Client[]>([]);
  orders = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searching = signal(false);

  // Pagination properties
  currentPage = signal(0);
  pageSize = signal(20);
  totalCount = signal(0);
  searchTerm = signal<string>('');
  searchInput = '';

  // Orders pagination properties
  ordersCurrentPage = signal(0);
  ordersPageSize = signal(50);
  ordersTotalCount = signal(0);
  ordersSearchTerm = signal<string>('');
  ordersSearchInput = '';
  ordersStatus = signal<string | null>(null);

  // Tab management
  activeTab = signal<'clients' | 'orders'>(this.getInitialTab());

  // Client selection state
  selectedClients = signal<Set<string>>(new Set());
  selectAll = signal(false);

  // Track orders being cancelled, reopened, or closed
  cancellingOrderIds = signal<Set<string>>(new Set());
  reopeningOrderIds = signal<Set<string>>(new Set());
  closingOrderIds = signal<Set<string>>(new Set());

  // Track if a modal is open to pause background refresh
  isModalOpen = signal<boolean>(false);

  // Check if user has any of the required permissions for Actions column
  hasAnyActionPermission = computed(() => {
    return (
      this.authService.hasPermission(181) || // Trading order edit
      this.authService.hasPermission(183) // Trading order close
    );
  });

  private getInitialTab(): 'clients' | 'orders' {
    const savedTab = localStorage.getItem('priceManagerActiveTab');
    return (savedTab === 'orders' || savedTab === 'clients') ? savedTab : 'clients';
  }

  setActiveTab(tab: 'clients' | 'orders'): void {
    this.activeTab.set(tab);
    localStorage.setItem('priceManagerActiveTab', tab);
    if (tab === 'orders') {
      this.loadOrders();
    }
  }

  viewClientDetails(client: Client): void {
    this.router.navigate(['/manager', client.userId], {
      queryParams: { name: client.fullName },
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.startOrdersPolling();
    this.setupSearchDebounce();
    
    // Load orders if the active tab is 'orders'
    if (this.activeTab() === 'orders') {
      this.loadOrders();
    }
  }

  private setupSearchDebounce(): void {
    // Debounce client search input
    this.searchSubject$
      .pipe(
        debounceTime(800), // Wait 800ms after user stops typing
        distinctUntilChanged(), // Only emit if value is different from previous
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.searchTerm.set(searchTerm);
        this.currentPage.set(0);
        this.loadInitialData();
      });

    // Debounce orders search input
    this.ordersSearchSubject$
      .pipe(
        debounceTime(800), // Wait 800ms after user stops typing
        distinctUntilChanged(), // Only emit if value is different from previous
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm: string) => {
        this.ordersSearchTerm.set(searchTerm);
        this.ordersCurrentPage.set(0);
        this.loadOrders();
      });
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
          // Reset selection when data changes
          this.selectedClients.set(new Set());
          this.selectAll.set(false);
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
    this.searchSubject$.next(trimmedValue);
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
    this.isModalOpen.set(true);

    const modalRef = this.modalService.open(
      BulkOrderModalComponent,
      {
        size: 'full',
        centered: true,
      },
      {
        clients: this.activeClients(),
        title: 'Create Bulk Order',
      }
    );

    modalRef.result.then(
      (result: any) => {
        this.isModalOpen.set(false);
        window.location.reload();
      },
      () => {
        // Modal dismissed
        this.isModalOpen.set(false);
      }
    );
  }

  openNewOrderModal(): void {
    this.isModalOpen.set(true);

    const modalRef = this.modalService.open(
      BulkOrderModalComponent,
      {
        size: 'full',
        centered: true,
      },
      {
        clients: this.activeClients(),
        title: 'Create New Order',
      }
    );

    modalRef.result.then(
      (result: any) => {
        this.isModalOpen.set(false);
        window.location.reload();
      },
      () => {
        // Modal dismissed
        this.isModalOpen.set(false);
      }
    );
  }

  copyExternalId(externalId: string): void {
    if (!externalId) {
      this.alertService.error('No external ID to copy');
      return;
    }

    navigator.clipboard
      .writeText(externalId)
      .then(() => {
        this.alertService.success(
          `External ID "${externalId}" copied to clipboard`
        );
      })
      .catch((err) => {
        console.error('Failed to copy external ID:', err);
        this.alertService.error('Failed to copy external ID to clipboard');
      });
  }

  // Client selection methods
  toggleClientSelection(externalId: string): void {
    const currentSelection = new Set(this.selectedClients());
    if (currentSelection.has(externalId)) {
      currentSelection.delete(externalId);
    } else {
      currentSelection.add(externalId);
    }
    this.selectedClients.set(currentSelection);
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll()) {
      // Deselect all
      this.selectedClients.set(new Set());
      this.selectAll.set(false);
    } else {
      // Select all visible clients
      const allExternalIds = this.activeClients().map(
        (client) => client.externalId
      );
      this.selectedClients.set(new Set(allExternalIds));
      this.selectAll.set(true);
    }
  }

  private updateSelectAllState(): void {
    const visibleExternalIds = this.activeClients().map(
      (client) => client.externalId
    );
    const selectedCount = this.selectedClients().size;
    const visibleCount = visibleExternalIds.length;

    this.selectAll.set(selectedCount === visibleCount && visibleCount > 0);
  }

  isClientSelected(externalId: string): boolean {
    return this.selectedClients().has(externalId);
  }

  copySelectedExternalIds(): void {
    const selectedIds = Array.from(this.selectedClients());

    if (selectedIds.length === 0) {
      this.alertService.error('No clients selected');
      return;
    }

    const externalIds = selectedIds.map((id) => {
      const client = this.activeClients().find((c) => c.externalId === id);
      return client?.externalId || id;
    });

    const commaSeparatedIds = externalIds.join(', ');

    navigator.clipboard
      .writeText(commaSeparatedIds)
      .then(() => {
        this.alertService.success(
          `${selectedIds.length} external ID(s) copied to clipboard`
        );
      })
      .catch((err) => {
        console.error('Failed to copy external IDs:', err);
        this.alertService.error('Failed to copy external IDs to clipboard');
      });
  }

  getSelectedCount(): number {
    return this.selectedClients().size;
  }

  clearSelection(): void {
    this.selectedClients.set(new Set());
    this.selectAll.set(false);
  }

  // Orders methods
  private loadOrders(silent: boolean = false) {
    if (!silent) {
      this.loading.set(true);
    }

    this.service
      .getOrdersList(
        this.ordersSearchTerm() || null,
        this.ordersCurrentPage(),
        this.ordersPageSize(),
        this.ordersStatus()
      )
      .pipe(
        tap((response: any) => {
          let orders: any[] = [];
          if (response?.items && Array.isArray(response.items)) {
            orders = response.items;
            this.ordersTotalCount.set(response.totalCount || 0);
          } else {
            orders = [];
            this.ordersTotalCount.set(0);
          }

          this.orders.set(orders);
        }),
        catchError((err: any) => {
          console.error('Error loading orders:', err);
          if (!silent) {
            let errorMessage =
              'Failed to load orders. Please check your connection and try again.';
            if (err?.error?.error) {
              errorMessage = err.error.error;
            } else if (err?.message) {
              errorMessage = err.message;
            }
            this.alertService.error(errorMessage);
          }
          this.orders.set([]);
          this.ordersTotalCount.set(0);
          return [];
        }),
        finalize(() => {
          if (!silent) {
            this.loading.set(false);
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onOrdersSearchInput(): void {
    const trimmedValue = this.ordersSearchInput?.trim() || '';
    this.ordersSearchSubject$.next(trimmedValue);
  }

  onOrdersPageSizeChange(newSize: number): void {
    this.ordersPageSize.set(newSize);
    this.ordersCurrentPage.set(0);
    this.loadOrders();
  }

  goToOrdersPage(page: number): void {
    if (page >= 0 && page < this.getOrdersTotalPages()) {
      this.ordersCurrentPage.set(page);
      this.loadOrders();
    }
  }

  nextOrdersPage(): void {
    if (this.ordersCurrentPage() < this.getOrdersTotalPages() - 1) {
      this.ordersCurrentPage.set(this.ordersCurrentPage() + 1);
      this.loadOrders();
    }
  }

  previousOrdersPage(): void {
    if (this.ordersCurrentPage() > 0) {
      this.ordersCurrentPage.set(this.ordersCurrentPage() - 1);
      this.loadOrders();
    }
  }

  getOrdersTotalPages(): number {
    return Math.ceil(this.ordersTotalCount() / this.ordersPageSize());
  }

  getOrdersPageNumbers(): number[] {
    const totalPages = this.getOrdersTotalPages();
    const current = this.ordersCurrentPage();
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

  getOrdersEndItem(): number {
    return Math.min(
      (this.ordersCurrentPage() + 1) * this.ordersPageSize(),
      this.ordersTotalCount()
    );
  }

  getStatusLabel(status: any): string {
    if (typeof status === 'string') {
      return status;
    }

    switch (status) {
      case 1:
        return 'Active';
      case 2:
        return 'Partially Filled';
      case 3:
        return 'Filled';
      case 4:
        return 'Cancelled';
      case 5:
        return 'Rejected';
      case 6:
        return 'Liquidated';
      default:
        return 'Unknown';
    }
  }

  getOrderTypeLabel(orderType: number): string {
    switch (orderType) {
      case 0:
        return 'Market';
      case 1:
        return 'Limit';
      case 2:
        return 'Stop';
      case 3:
        return 'Stop Limit';
      case 4:
        return 'Take Profit';
      case 5:
        return 'Take Profit Limit';
      default:
        return 'Unknown';
    }
  }

  getStatusClasses(status: any): string {
    if (typeof status === 'string') {
      switch (status.toLowerCase()) {
        case 'active':
          return 'bg-blue-100 text-blue-800';
        case 'filled':
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'cancelled':
        case 'canceled':
          return 'bg-gray-100 text-gray-800';
        case 'rejected':
          return 'bg-red-100 text-red-800';
        case 'liquidated':
          return 'bg-orange-100 text-orange-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }

    switch (status) {
      case 1:
        return 'bg-blue-100 text-blue-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-green-100 text-green-800';
      case 4:
        return 'bg-gray-100 text-gray-800';
      case 5:
        return 'bg-red-100 text-red-800';
      case 6:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid Date';
    }
  }

  copyOrderId(orderId: string): void {
    if (!orderId) {
      this.alertService.error('No order ID to copy');
      return;
    }

    navigator.clipboard
      .writeText(orderId)
      .then(() => {
        this.alertService.success(`Order ID "${orderId}" copied to clipboard`);
      })
      .catch((err) => {
        console.error('Failed to copy order ID:', err);
        this.alertService.error('Failed to copy order ID to clipboard');
      });
  }

  copyUserId(userId: string): void {
    if (!userId) {
      this.alertService.error('No user ID to copy');
      return;
    }

    navigator.clipboard
      .writeText(userId)
      .then(() => {
        this.alertService.success(`User ID "${userId}" copied to clipboard`);
      })
      .catch((err) => {
        console.error('Failed to copy user ID:', err);
        this.alertService.error('Failed to copy user ID to clipboard');
      });
  }

  // Order action methods
  openOrderEditModal(order: Order): void {
    this.isModalOpen.set(true);

    const modalRef = this.modalService.open(
      OrderEditModalComponent,
      {
        size: 'full',
        centered: true,
        closable: true,
      },
      {
        orderId: order.id,
      }
    );

    modalRef.result.then(
      (result) => {
        this.isModalOpen.set(false);
        if (result) {
          this.loadOrders();
        }
      },
      () => {
        // Modal dismissed
        this.isModalOpen.set(false);
      }
    );
  }

  reOrder(order: Order, event: Event): void {
    event.stopPropagation();

    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      {
        size: 'sm',
        centered: true,
        closable: true,
      },
      {
        title: 'Re-Open Order',
        message: `Are you sure you want to re-open this ${this.getOrderSideLabel(
          order.side
        )} order for ${order.tradingPairSymbol}?`,
        type: 'info',
        confirmText: 'Re-Open Order',
        cancelText: 'Cancel',
        details: `Order ID: ${order.id}\nSymbol: ${
          order.tradingPairSymbol
        }\nType: ${this.getOrderTypeLabel(
          order.orderType
        )}\nSide: ${this.getOrderSideLabel(order.side)}\nPrice: $${
          order.price
        }\nQuantity: ${order.quantity}\nStatus: ${this.getStatusLabel(
          order.status
        )}`,
      }
    );

    modalRef.result.then(
      (confirmed) => {
        if (confirmed) {
          this.performReOrder(order);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  private performReOrder(order: Order): void {
    this.service
      .reorderOrder(order.id)
      .pipe(
        tap(() => {
          this.alertService.success('Order re-ordered successfully');
          this.loadOrders();
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Error re-ordering order:', err);
          let errorMessage = 'Failed to re-order order';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => {})
      )
      .subscribe();
  }

  cancelOrder(order: Order, event: Event): void {
    event.stopPropagation();

    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      {
        size: 'sm',
        centered: true,
        closable: true,
      },
      {
        title: 'Cancel Order',
        message: `Are you sure you want to cancel this ${this.getOrderSideLabel(
          order.side
        )} order for ${order.tradingPairSymbol}?`,
        type: 'warning',
        confirmText: 'Cancel Order',
        cancelText: 'Keep Order',
        details: `Order ID: ${order.id}\nSymbol: ${
          order.tradingPairSymbol
        }\nType: ${this.getOrderTypeLabel(
          order.orderType
        )}\nSide: ${this.getOrderSideLabel(order.side)}\nPrice: $${
          order.price
        }\nQuantity: ${order.quantity}`,
      }
    );

    modalRef.result.then(
      (confirmed) => {
        if (confirmed) {
          this.performCancelOrder(order);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  private performCancelOrder(order: Order): void {
    // Add order ID to cancelling set
    const cancellingIds = new Set(this.cancellingOrderIds());
    cancellingIds.add(order.id);
    this.cancellingOrderIds.set(cancellingIds);

    this.service
      .cancleOrder(order.id)
      .pipe(
        tap(() => {
          this.alertService.success('Order cancelled successfully');
          this.loadOrders();
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Error cancelling order:', err);
          let errorMessage = 'Failed to cancel order';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => {
          // Remove order ID from cancelling set
          const cancellingIds = new Set(this.cancellingOrderIds());
          cancellingIds.delete(order.id);
          this.cancellingOrderIds.set(cancellingIds);
        })
      )
      .subscribe();
  }

  closeOrder(order: Order, event: Event): void {
    event.stopPropagation();

    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      {
        size: 'sm',
        centered: true,
        closable: true,
      },
      {
        title: 'Close Order',
        message: `Are you sure you want to close this ${this.getOrderSideLabel(
          order.side
        )} order for ${order.tradingPairSymbol}?`,
        type: 'warning',
        confirmText: 'Close Order',
        cancelText: 'Keep Order',
        details: `Order ID: ${order.id}\nSymbol: ${
          order.tradingPairSymbol
        }\nType: ${this.getOrderTypeLabel(
          order.orderType
        )}\nSide: ${this.getOrderSideLabel(order.side)}\nPrice: $${
          order.price
        }\nQuantity: ${order.quantity}`,
      }
    );

    modalRef.result.then(
      (confirmed) => {
        if (confirmed) {
          this.performCloseOrder(order);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  private performCloseOrder(order: Order): void {
    // Add order ID to closing set
    const closingIds = new Set(this.closingOrderIds());
    closingIds.add(order.id);
    this.closingOrderIds.set(closingIds);

    this.service
      .closeOrder(order.id)
      .pipe(
        tap(() => {
          this.alertService.success('Order closed successfully');
          this.loadOrders();
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Error closing order:', err);
          let errorMessage = 'Failed to close order';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => {
          // Remove order ID from closing set
          const closingIds = new Set(this.closingOrderIds());
          closingIds.delete(order.id);
          this.closingOrderIds.set(closingIds);
        })
      )
      .subscribe();
  }

  getOrderSideLabel(side: number): string {
    return side === 1 ? 'Buy' : 'Sell';
  }

  isCancellingOrder(orderId: string): boolean {
    return this.cancellingOrderIds().has(orderId);
  }

  isReopeningOrder(orderId: string): boolean {
    return this.reopeningOrderIds().has(orderId);
  }

  isClosingOrder(orderId: string): boolean {
    return this.closingOrderIds().has(orderId);
  }

  private startOrdersPolling(): void {
    interval(3000) // Poll every 3 seconds
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Only poll when orders tab is active and not currently loading and no modal is open
        if (this.activeTab() === 'orders' && !this.loading() && !this.isModalOpen()) {
          this.loadOrders(true); // Silent refresh
        }
      });
  }
}
