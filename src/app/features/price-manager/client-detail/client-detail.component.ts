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

  client = signal<Client | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  selectedTab = signal<'orders' | 'transactions'>('orders');

  openOrders = signal<Order[]>([]);
  transactions = signal<Transaction[]>([]);
  ordersLoading = signal(false);
  transactionsLoading = signal(false);
  updatingOrderIds = signal<Set<string>>(new Set());
  orderPriceUpdates: { [orderId: string]: number } = {};

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
  }

  ngAfterViewInit(): void {
    setTimeout(() => {}, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  updateOrderPrice(orderId: string, newPrice: number): void {
    if (!newPrice || newPrice <= 0) {
      return;
    }

    const currentUpdating = new Set(this.updatingOrderIds());
    currentUpdating.add(orderId);
    this.updatingOrderIds.set(currentUpdating);

    this.service
      .updateOrderPrice(orderId, newPrice)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err: any) => {
          console.error('Error updating order price:', err);
          let errorMessage = 'Failed to update order price. Please try again.';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return of(void 0);
        }),
        finalize(() => {
          const updatedUpdating = new Set(this.updatingOrderIds());
          updatedUpdating.delete(orderId);
          this.updatingOrderIds.set(updatedUpdating);
        })
      )
      .subscribe(() => {
        this.loadOpenOrders()
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            delete this.orderPriceUpdates[orderId];
          });
      });
  }

  cancaleOrder(orderId: string): void {
    const order = this.openOrders().find((o) => o.id === orderId);
    if (!order) {
      this.alertService.error('Order not found');
      return;
    }

    const modalRef = this.modalService.open(
      OrderCloseModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        order: order,
      }
    );

    modalRef.result.then(
      (result: { useCustomPrice: boolean; price: number | null }) => {
        if (result) {
          this.executeCloseOrder(orderId, result.price);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  private executeCloseOrder(orderId: string, price: number | null): void {
    const currentUpdating = new Set(this.updatingOrderIds());
    currentUpdating.add(orderId);
    this.updatingOrderIds.set(currentUpdating);

    this.service
      .closeOrder(orderId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err: any) => {
          console.error('Error closing order:', err);
          let errorMessage = 'Failed to close order. Please try again.';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return of(void 0);
        }),
        finalize(() => {
          const updatedUpdating = new Set(this.updatingOrderIds());
          updatedUpdating.delete(orderId);
          this.updatingOrderIds.set(updatedUpdating);
        })
      )
      .subscribe(() => {
        this.alertService.success('Order closed successfully');
        this.loadOpenOrders().pipe(takeUntil(this.destroy$)).subscribe();
      });
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

  goBack(): void {
    this.router.navigate(['/manager']);
  }

  private startOrderbookRefetch(): void {
    interval(4000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (
          this.client() &&
          !this.ordersLoading() &&
          !this.transactionsLoading()
        ) {
          this.loadCurrentDataType(true);
        }
      });
  }
}
