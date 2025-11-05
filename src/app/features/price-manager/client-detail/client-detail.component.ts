import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Client,
  PriceManagerService,
  Order,
  Transaction,
  ReopenOrderRequest,
} from '../services/price-manager.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  takeUntil,
  interval,
  catchError,
  finalize,
  tap,
  Observable,
  of,
} from 'rxjs';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { ModalService } from '../../../shared/services/modals/modal.service';
import { TransactionEditModalComponent } from '../components/transaction-edit-modal/transaction-edit-modal.component';
import { OrderEditModalComponent } from '../components/order-edit-modal/order-edit-modal.component';
import { OrderCloseModalComponent } from '../components/order-close-modal/order-close-modal.component';
import { QuickOrderModalComponent } from '../components/quick-order-modal/quick-order-modal.component';
import { AdjustBalanceModalComponent } from '../components/adjust-balance-modal/adjust-balance-modal.component';
import { HiddenWithdrawalModalComponent } from '../components/hidden-withdrawal-modal/hidden-withdrawal-modal.component';
import { BulkLiquidateModalComponent } from '../components/bulk-liquidate-modal/bulk-liquidate-modal.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss'],
})
export class ClientDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PriceManagerService);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  loadingBalance = signal<boolean>(false);
  userBalance = signal<any[]>([]);

  client = signal<Client | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  selectedTab = signal<'orders' | 'transactions'>('orders');

  // Order status filter
  selectedOrderStatus = signal<number | null>(null);

  openOrders = signal<Order[]>([]);
  transactions = signal<Transaction[]>([]);
  ordersLoading = signal(false);
  transactionsLoading = signal(false);
  updatingOrderIds = signal<Set<string>>(new Set());
  orderPriceUpdates: { [orderId: string]: number } = {};

  // Track orders being cancelled, reopened, or closed
  cancellingOrderIds = signal<Set<string>>(new Set());
  reopeningOrderIds = signal<Set<string>>(new Set());
  closingOrderIds = signal<Set<string>>(new Set());

  // Filtered orders based on selected status
  filteredOrders = computed(() => {
    const orders = this.openOrders();
    const status = this.selectedOrderStatus();
    if (status === null) return orders;
    return orders.filter((order) => order.status === status);
  });

  // Check if user has any of the required permissions for Actions column
  hasAnyActionPermission = computed(() => {
    return (
      this.authService.hasPermission(181) || // Trading order edit
      this.authService.hasPermission(183) // Trading order close
    );
  });

  ngOnInit(): void {
    this.loadClientData();
    this.startOrderbookRefetch();

    if (this.client()?.userId) {
      this.fetchUserBalance();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {}, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchUserBalance(): void {
    if (!this.client()) return;

    this.loadingBalance.set(true);
    this.service
      .getUserBalanceWithoutCurrency(this.client()!.userId)
      .pipe(
        tap((response: any) => {
          if (response?.balances && response.balances.length > 0) {
            const balances: any[] = Array.isArray(response.balances)
              ? response.balances
              : [];

            // Filter balances where totalAvailable > 0
            const validBalances = balances.filter(
              (b) =>
                b &&
                typeof b.currency === 'string' &&
                typeof b.totalAvailable === 'number' &&
                b.totalAvailable > 0
            );

            this.userBalance.set(validBalances);
          } else {
            this.userBalance.set([]);
          }
        }),
        catchError((err) => {
          console.error('Error fetching balance:', err);
          return [];
        }),
        finalize(() => this.loadingBalance.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private loadClientData(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    const fullNameFromQuery =
      this.route.snapshot.queryParamMap.get('name') || '';
    if (!clientId) {
      this.alertService.error('Client ID not found');
      this.router.navigate(['/manager']);
      return;
    }

    this.loading.set(true);
    this.client.set({
      id: clientId,
      userId: clientId,
      fullName: fullNameFromQuery,
      externalId: clientId,
    });

    this.fetchUserBalance();

    this.loadCurrentDataType()
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: any) => {
          console.error('Error loading client data:', err);
          let errorMessage = 'Failed to load client data';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        })
      )
      .subscribe();
  }

  onTabChange(tab: 'orders' | 'transactions'): void {
    this.selectedTab.set(tab);
    this.loadCurrentDataType().pipe(takeUntil(this.destroy$)).subscribe();
  }

  // Method to change order status filter
  onOrderStatusChange(status: number | null): void {
    this.selectedOrderStatus.set(status);
  }

  private loadCurrentDataType(silent: boolean = false): Observable<void> {
    if (this.selectedTab() === 'orders') {
      return this.loadOpenOrders(silent);
    } else {
      return this.loadTransactions(silent);
    }
  }

  private loadOpenOrders(silent: boolean = false): Observable<void> {
    if (!this.client()) {
      this.openOrders.set([]);
      return of(void 0);
    }

    if (!silent) {
      this.ordersLoading.set(true);
    }

    return this.service.getOpenOrders(this.client()!.userId, 0, 50).pipe(
      tap((response: any) => {
        if (response?.orders) {
          const currentPriceUpdates = { ...this.orderPriceUpdates };
          const processedOrders = response.orders.map((order: Order) =>
            this.processOrder(order)
          );
          this.openOrders.set(processedOrders);

          this.orderPriceUpdates = {};
          processedOrders.forEach((order: Order) => {
            if (currentPriceUpdates[order.id] !== undefined) {
              this.orderPriceUpdates[order.id] = currentPriceUpdates[order.id];
            }
          });
        } else {
          this.openOrders.set([]);
          this.orderPriceUpdates = {};
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Error loading open orders:', err);
        if (!silent) {
          let errorMessage = 'Failed to load open orders';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
        }
        this.openOrders.set([]);
        return of(void 0);
      }),
      finalize(() => {
        if (!silent) {
          this.ordersLoading.set(false);
        }
      })
    );
  }

  private processOrder(order: Order): Order {
    order.remainingQuantity = order.quantity - order.filledQuantity;
    order.currentPrice = order.price;

    const priceDiff = order.currentPrice - order.price;
    const side = this.getOrderSide(order.side);
    const multiplier = side === 'Buy' ? 1 : -1;

    order.unrealizedPnL =
      priceDiff * order.filledQuantity * multiplier * order.leverage;
    order.unrealizedPnLPercent =
      order.price > 0 ? (priceDiff / order.price) * 100 * multiplier : 0;

    order.orderTypeLabel = this.getOrderType(order.orderType);
    order.sideLabel = side;
    order.statusLabel = this.getOrderStatus(order.status);

    return order;
  }

  getOrderType(type: number): string {
    const types: { [key: number]: string } = {
      1: 'Market',
      2: 'Limit',
      3: 'Stop',
      4: 'Stop Limit',
      5: 'Trailing Stop',
      6: 'Take Profit',
      7: 'Take Profit Limit',
    };
    return types[type] || `Type ${type}`;
  }

  getOrderSide(side: number): 'Buy' | 'Sell' {
    return side === 1 ? 'Buy' : side === 2 ? 'Sell' : 'Buy';
  }

  getOrderStatus(status: number): string {
    const statuses: { [key: number]: string } = {
      1: 'Active',
      2: 'Partially Filled',
      3: 'Filled',
      4: 'Cancelled',
      5: 'Rejected',
      6: 'Liquidated',
    };
    return statuses[status] || `Status ${status}`;
  }

  private loadTransactions(silent: boolean = false): Observable<void> {
    if (!this.client()) {
      this.transactions.set([]);
      return of(void 0);
    }

    if (!silent) {
      this.transactionsLoading.set(true);
    }

    return this.service.getTransactions(this.client()!.userId, 0, 50).pipe(
      tap((response: any) => {
        if (response?.transactions && Array.isArray(response.transactions)) {
          this.transactions.set(response.transactions);
        } else if (response?.items && Array.isArray(response.items)) {
          this.transactions.set(response.items);
        } else if (response?.data && Array.isArray(response.data)) {
          this.transactions.set(response.data);
        } else if (Array.isArray(response)) {
          this.transactions.set(response);
        } else {
          this.transactions.set([]);
        }
      }),
      catchError((err: any) => {
        console.error('Error loading transactions:', err);
        if (!silent) {
          let errorMessage = 'Failed to load transactions';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
        }
        this.transactions.set([]);
        return of(void 0);
      }),
      finalize(() => {
        if (!silent) {
          this.transactionsLoading.set(false);
        }
      })
    );
  }

  refreshCurrentData(): void {
    this.loadCurrentDataType().pipe(takeUntil(this.destroy$)).subscribe();
  }

  countByStatus(status: number) {
    return this.openOrders().filter((o) => o.status === status).length;
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }

  trackByTransactionId(index: number, transaction: Transaction): string {
    return transaction.id;
  }

  getTransactionTypeLabel(type: number): string {
    const types: { [key: number]: string } = {
      0: 'Deposit',
      1: 'Withdrawal',
      2: 'Transfer',
      3: 'Trade',
      4: 'Fee',
      5: 'Commission',
      6: 'Bonus',
      7: 'Refund',
      8: 'Credit',
      9: 'Debit',
      10: 'Adjustment',
    };
    return types[type] || `Type ${type}`;
  }

  getTransactionTypeClass(type: number): string {
    if ([0, 6, 7, 8].includes(type)) {
      return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
    }
    if ([1, 9].includes(type)) {
      return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
    }
    if (type === 3) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
    }
    if ([4, 5].includes(type)) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }

  preventInvalidNumberInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+', '-'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key === '.') {
      const target = event.target as HTMLInputElement;
      if (target && target.value.includes('.')) {
        event.preventDefault();
      }
    }
  }

  formatOrderPrice(orderId: string): void {
    const value = this.orderPriceUpdates[orderId];
    if (value === undefined || value === null || isNaN(value as any)) {
      return;
    }
    let numeric = Number(value);
    if (!isFinite(numeric)) {
      return;
    }
    if (numeric < 0) {
      numeric = 0;
    }
    const fixed = Number(numeric.toFixed(8));
    this.orderPriceUpdates[orderId] = fixed;
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  }

  openTransactionEditModal(transaction: Transaction): void {
    const modalRef = this.modalService.open(
      TransactionEditModalComponent,
      {
        size: 'xl',
        centered: true,
        closable: true,
      },
      {
        transaction: transaction,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadTransactions().pipe(takeUntil(this.destroy$)).subscribe();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  openOrderEditModal(order: Order): void {
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
        if (result) {
          this.loadOpenOrders().pipe(takeUntil(this.destroy$)).subscribe();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  openQuickOrderModal(): void {
    if (!this.client()) {
      this.alertService.error('Client not found');
      return;
    }

    const modalRef = this.modalService.open(
      QuickOrderModalComponent,
      {
        size: 'full',
        centered: true,
        closable: true,
      },
      {
        data: {
          userId: this.client()!.userId,
          userFullName: this.client()!.fullName,
        },
      }
    );

    modalRef.result.then(
      (result) => {
        window.location.reload();
      },
      () => {
        // Modal dismissed
      }
    );
  }

  openAdjustBalanceModal(): void {
    if (!this.client()) {
      this.alertService.error('Client not found');
      return;
    }

    const modalRef = this.modalService.open(
      AdjustBalanceModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        data: {
          userId: this.client()!.userId,
          userFullName: this.client()!.fullName,
        },
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadCurrentDataType().pipe(takeUntil(this.destroy$)).subscribe();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  openHiddenWithdrawalModal(): void {
    if (!this.client()) {
      this.alertService.error('Client not found');
      return;
    }

    const modalRef = this.modalService.open(
      HiddenWithdrawalModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        data: {
          userId: this.client()!.userId,
          userFullName: this.client()!.fullName,
        },
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadCurrentDataType().pipe(takeUntil(this.destroy$)).subscribe();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  openBulkLiquidateModal(): void {
    if (!this.client()) {
      this.alertService.error('Client not found');
      return;
    }

    const modalRef = this.modalService.open(
      BulkLiquidateModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        data: {
          userId: this.client()!.userId,
          userFullName: this.client()!.fullName,
        },
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadCurrentDataType().pipe(takeUntil(this.destroy$)).subscribe();
        }
      },
      () => {
        // Modal dismissed
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
        message: `Are you sure you want to re-open this ${order.sideLabel} order for ${order.tradingPairSymbol}?`,
        type: 'info',
        confirmText: 'Re-Open Order',
        cancelText: 'Cancel',
        details: `Order ID: ${order.id}\nSymbol: ${order.tradingPairSymbol}\nType: ${order.orderTypeLabel}\nSide: ${order.sideLabel}\nPrice: $${order.price}\nQuantity: ${order.quantity}\nStatus: ${order.statusLabel}`,
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

  /**
   * Perform the actual order re-opening
   */
  private performReOrder(order: Order): void {
    this.service
      .reorderOrder(order.id)
      .pipe(
        tap(() => {
          this.alertService.success('Order re-ordered successfully');
          this.loadOpenOrders().pipe(takeUntil(this.destroy$)).subscribe();
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

  /**
   * Cancel an order
   */
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
        message: `Are you sure you want to cancel this ${order.sideLabel} order for ${order.tradingPairSymbol}?`,
        type: 'warning',
        confirmText: 'Cancel Order',
        cancelText: 'Keep Order',
        details: `Order ID: ${order.id}\nSymbol: ${order.tradingPairSymbol}\nType: ${order.orderTypeLabel}\nSide: ${order.sideLabel}\nPrice: $${order.price}\nQuantity: ${order.quantity}`,
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

  /**
   * Perform the actual order cancellation
   */
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
          this.loadOpenOrders().pipe(takeUntil(this.destroy$)).subscribe();
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

  /**
   * Re-open an order (for cancelled/closed orders)
   */
  reopenOrder(order: Order, event: Event): void {
    event.stopPropagation();

    // Get admin ID from auth service
    const adminId = this.authService.getUserId();
    if (!adminId) {
      this.alertService.error('Admin ID not found');
      return;
    }

    const modalRef = this.modalService.open(
      ConfirmationDialogComponent,
      {
        size: 'sm',
        centered: true,
        closable: true,
      },
      {
        title: 'Reopen Order',
        message: `Are you sure you want to reopen this ${order.sideLabel} order for ${order.tradingPairSymbol}?`,
        type: 'info',
        confirmText: 'Reopen Order',
        cancelText: 'Cancel',
        details: `Order ID: ${order.id}\nSymbol: ${order.tradingPairSymbol}\nType: ${order.orderTypeLabel}\nSide: ${order.sideLabel}\nPrice: $${order.price}\nQuantity: ${order.quantity}\nStatus: ${order.statusLabel}`,
      }
    );

    modalRef.result.then(
      (confirmed) => {
        if (confirmed) {
          this.performReopenOrder(order, adminId);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  /**
   * Perform the actual order reopening with additional prompts
   */
  private performReopenOrder(order: Order, adminId: string): void {
    // Prompt for reopening details
    const applyNewOutcome = confirm(
      'Do you want to apply a new outcome to this order?\n\nClick OK to apply new outcome, Cancel to reopen with original settings.'
    );

    let reopenData: ReopenOrderRequest;

    if (applyNewOutcome) {
      // Ask for new P&L and close price
      const newPnLStr = prompt('Enter new desired P&L:', '0');
      const newClosePriceStr = prompt(
        'Enter new close price:',
        order.price.toString()
      );
      const reason =
        prompt(
          'Enter reason for reopening with new outcome:',
          'Admin adjustment'
        ) || 'Admin adjustment';

      if (newPnLStr === null || newClosePriceStr === null) {
        return; // User cancelled
      }

      const newDesiredPnL = parseFloat(newPnLStr);
      const newClosePrice = parseFloat(newClosePriceStr);

      if (isNaN(newDesiredPnL) || isNaN(newClosePrice)) {
        this.alertService.error('Invalid P&L or close price value');
        return;
      }

      reopenData = {
        adminId,
        applyNewOutcome: true,
        newDesiredPnL,
        newClosePrice,
        reason,
      };
    } else {
      // Reopen with original settings
      const reason =
        prompt('Enter reason for reopening:', 'Admin reopened order') ||
        'Admin reopened order';

      reopenData = {
        adminId,
        applyNewOutcome: false,
        newDesiredPnL: 0,
        newClosePrice: order.price,
        reason,
      };
    }

    // Add order ID to reopening set
    const reopeningIds = new Set(this.reopeningOrderIds());
    reopeningIds.add(order.id);
    this.reopeningOrderIds.set(reopeningIds);

    this.service
      .reopenOrder(order.id, reopenData)
      .pipe(
        tap(() => {
          this.alertService.success('Order reopened successfully');
          this.loadOpenOrders().pipe(takeUntil(this.destroy$)).subscribe();
        }),
        catchError((err: HttpErrorResponse) => {
          console.error('Error reopening order:', err);
          let errorMessage = 'Failed to reopen order';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return of(null);
        }),
        finalize(() => {
          // Remove order ID from reopening set
          const reopeningIds = new Set(this.reopeningOrderIds());
          reopeningIds.delete(order.id);
          this.reopeningOrderIds.set(reopeningIds);
        })
      )
      .subscribe();
  }

  /**
   * Close an order
   */
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
        message: `Are you sure you want to close this ${order.sideLabel} order for ${order.tradingPairSymbol}?`,
        type: 'warning',
        confirmText: 'Close Order',
        cancelText: 'Keep Order',
        details: `Order ID: ${order.id}\nSymbol: ${order.tradingPairSymbol}\nType: ${order.orderTypeLabel}\nSide: ${order.sideLabel}\nPrice: $${order.price}\nQuantity: ${order.quantity}`,
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

  /**
   * Perform the actual order closing
   */
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
          this.loadOpenOrders().pipe(takeUntil(this.destroy$)).subscribe();
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

  /**
   * Check if an order can be cancelled (only active/partially filled orders)
   */
  canCancelOrder(order: Order): boolean {
    return order.status === 1 || order.status === 2; // Active or Partially Filled
  }

  /**
   * Check if an order can be closed (only active orders)
   */

  /**
   * Check if an order can be reopened (cancelled/rejected/liquidated orders)
   */
  canReopenOrder(order: Order): boolean {
    return order.status === 4 || order.status === 5 || order.status === 6; // Cancelled, Rejected, or Liquidated
  }

  /**
   * Check if order is being cancelled
   */
  isCancellingOrder(orderId: string): boolean {
    return this.cancellingOrderIds().has(orderId);
  }

  /**
   * Check if order is being reopened
   */
  isReopeningOrder(orderId: string): boolean {
    return this.reopeningOrderIds().has(orderId);
  }

  /**
   * Check if order is being closed
   */
  isClosingOrder(orderId: string): boolean {
    return this.closingOrderIds().has(orderId);
  }

  goBack(): void {
    this.router.navigate(['/manager']);
  }

  private startOrderbookRefetch(): void {
    interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (
          this.client() &&
          this.selectedTab() === 'orders' &&
          !this.ordersLoading()
        ) {
          this.loadOpenOrders(true).pipe(takeUntil(this.destroy$)).subscribe();
        }
      });
  }
}
