import { Component, inject, Input, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  PriceManagerService,
  Order,
  OrderUpdateRequest,
  ReopenOrderRequest,
} from '../../services/price-manager.service';
import { TradingViewChartComponent } from '../../../../shared/components/trading-view-chart/trading-view-chart.component';

@Component({
  selector: 'app-order-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TradingViewChartComponent],
  templateUrl: './order-edit-modal.component.html',
  styleUrls: ['./order-edit-modal.component.scss'],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class OrderEditModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() orderId!: string;
  @Input() order?: Order;
  @ViewChild(TradingViewChartComponent) tradingViewChart!: TradingViewChartComponent;

  private service = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  editForm!: FormGroup;
  reopenForm!: FormGroup;
  isEditing = true; // Start in edit mode by default
  loading = false;
  loadingData = false;
  originalValues: any = {};
  orderData: any | null = null;
  showReopenModal = false;

  // Chart related properties
  currentSymbol = signal<string>('');
  lastPrice = signal<number | null>(null);

  sideOptions = [
    { value: 1, label: 'Buy', class: 'text-green-600 dark:text-green-400' },
    { value: 2, label: 'Sell', class: 'text-red-600 dark:text-red-400' },
  ];

  statusOptions = [
    { value: 1, label: 'Active' },
    { value: 2, label: 'Partially Filled' },
    { value: 3, label: 'Filled' },
    { value: 4, label: 'Cancelled' },
    { value: 5, label: 'Rejected' },
    { value: 6, label: 'Liquidated' },
  ];

  orderTypeOptions = [
    { value: 1, label: 'Market' },
    { value: 2, label: 'Limit' },
    { value: 3, label: 'Buy Limit' },
    { value: 4, label: 'Buy Stop' },
    { value: 5, label: 'Sell Stop' },
    { value: 6, label: 'Sell Limit' },
  ];

  constructor() {
    this.editForm = this.fb.group({
      symbol: [''],
      orderType: [null],
      side: [null],
      openPrice: [null, [Validators.min(0)]],
      volume: [null, [Validators.min(0.00000001)]],
      filledQuantity: [null, [Validators.min(0)]],
      status: [null],
      leverage: [1, [Validators.min(1)]],
      stopLoss: [null, [Validators.min(0)]],
      takeProfit: [null, [Validators.min(0)]],
      clientOrderId: [''],
      orderCreatedAt: [null],
      orderModifiedAt: [null],
      createPosition: [true],
      closePrice: [null, [Validators.min(0)]],
      isClosed: [null],
      realizedPnL: [null],
      unrealizedPnL: [null],
      positionOpenTime: [null],
      positionCloseTime: [null],
      commission: [null],
      swap: [null],
      paymentCurrency: [''],
      reason: [''],
    });

    this.reopenForm = this.fb.group({
      applyNewOutcome: [true],
      newDesiredPnL: [null, [Validators.required]],
      newClosePrice: [null, [Validators.required, Validators.min(0)]],
      reason: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    if (this.order) {
      this.orderData = this.normalizeOrder(this.order as any);
      this.populateForm();
    } else if (this.orderId) {
      this.fetchOrderData();
    }
  }

  fetchOrderData(): void {
    this.loadingData = true;

    this.service
      .getOrder(this.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const raw = response.order || response;
          this.orderData = this.normalizeOrder(raw);
          this.populateForm();
          this.loadingData = false;
        },
        error: (error) => {
          console.error('Error fetching order:', error);

          let errorMessage = 'Failed to load order details';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.alertService.error(errorMessage);
          this.loadingData = false;
          this.modalRef.dismiss();
        },
      });
  }

  populateForm(): void {
    if (!this.orderData) return;

    const metadata = this.orderData.metadata || {};
    const symbol = this.orderData.symbol || this.orderData.tradingPairSymbol || '';

    // Set current symbol for chart
    this.currentSymbol.set(symbol);

    this.editForm.patchValue({
      symbol: symbol,
      orderType: this.orderData.orderType,
      side: this.orderData.side,
      openPrice: this.orderData.openPrice ?? this.orderData.price,
      volume: this.orderData.volume ?? this.orderData.quantity,
      filledQuantity: this.orderData.filledQuantity,
      status: this.orderData.status,
      leverage: this.orderData.leverage || 1,
      stopLoss: this.orderData.stopLoss ?? this.orderData.stopPrice ?? null,
      takeProfit:
        this.orderData.takeProfit ??
        metadata.TargetProfit ??
        metadata.ExpectedProfit ??
        null,
      clientOrderId: this.orderData.clientOrderId || '',
      orderCreatedAt: this.orderData.orderCreatedAt ?? this.orderData.createdAt,
      orderModifiedAt: this.orderData.orderModifiedAt ?? this.orderData.lastModifiedAt,
      createPosition: this.orderData.createPosition ?? true,
      closePrice: this.orderData.closePrice,
      isClosed: this.orderData.isClosed,
      realizedPnL: this.orderData.realizedPnL,
      unrealizedPnL: this.orderData.unrealizedPnL,
      positionOpenTime: this.formatDateTimeForInput(this.orderData.positionOpenTime),
      positionCloseTime: this.formatDateTimeForInput(this.orderData.positionCloseTime),
      commission: this.orderData.commission,
      swap: this.orderData.swap ?? this.orderData.swaps,
      paymentCurrency: this.orderData.paymentCurrency || '',
      reason: this.orderData.reason || '',
    });

    this.editForm.enable();
    // Ensure symbol and orderType are always disabled
    this.editForm.get('symbol')?.disable();
    this.editForm.get('orderType')?.disable();
    this.originalValues = this.editForm.value;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalizeOrder(raw: any): any {
    if (!raw) return raw;

    const normalized: any = {
      // Core identifiers
      id: raw.id ?? raw.orderId,
      orderId: raw.orderId ?? raw.id,
      tradingAccountId: raw.tradingAccountId,
      userId: raw.userId,

      // Instrument
      tradingPairSymbol: raw.tradingPairSymbol ?? raw.symbol,
      symbol: raw.symbol ?? raw.tradingPairSymbol,

      // Type and side
      orderType: raw.orderType,
      side: raw.side,

      // Pricing and quantities
      price: raw.price ?? raw.openPrice,
      openPrice: raw.openPrice ?? raw.price,
      closePrice: raw.closePrice ?? null,
      volume: raw.volume ?? raw.quantity,
      quantity: raw.quantity ?? raw.volume,
      filledQuantity: raw.filledQuantity ?? 0,
      remainingQuantity: raw.remainingQuantity ?? null,

      // Status and leverage
      status: raw.status,
      leverage: raw.leverage ?? 1,

      // Risk params
      stopLoss: raw.stopLoss ?? raw.stopPrice ?? null,
      stopPrice: raw.stopPrice ?? raw.stopLoss ?? null,
      takeProfit: raw.takeProfit ?? null,

      // Client linkage
      clientOrderId: raw.clientOrderId ?? null,
      positionId: raw.positionId ?? null,

      // Dates
      createdAt: raw.createdAt ?? raw.orderCreatedAt ?? null,
      lastModifiedAt: raw.lastModifiedAt ?? raw.orderModifiedAt ?? null,
      positionOpenTime: raw.positionOpenTime ?? null,
      positionCloseTime: raw.positionCloseTime ?? null,

      // Financials
      requiredMargin: raw.requiredMargin ?? null,
      positionMargin: raw.positionMargin ?? null,
      realizedPnL: raw.realizedPnL ?? null,
      unrealizedPnL: raw.unrealizedPnL ?? null,
      commission: raw.commission ?? null,
      swaps: raw.swap ?? raw.swaps ?? null,
      paymentCurrency: raw.paymentCurrency ?? null,

      // Flags
      isClosed: raw.isClosed ?? false,
      createPosition: raw.createPosition ?? null,

      // Misc
      reason: raw.reason ?? null,
      metadata: raw.metadata ?? {},
      comment: raw.comment ?? null,
    };

    return normalized;
  }

  getOrderTypeLabel(orderType: number | null | undefined): string {
    if (orderType === null || orderType === undefined) return 'Unknown';
    const map: { [k: number]: string } = {
      1: 'Market',
      2: 'Limit',
      3: 'Buy Limit',
      4: 'Buy Stop',
      5: 'Sell Stop',
      6: 'Sell Limit',
    };
    return map[orderType] ?? `Type ${orderType}`;
  }

  getOrderSide(side: number): string {
    return side === 1 ? 'Buy' : side === 2 ? 'Sell' : 'Unknown';
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

  getBuyPL(): number | null {
    const metadata = this.orderData?.metadata || {};
    if (this.orderData?.side === 1) {
      return metadata.ExpectedProfit || metadata.TargetProfit || null;
    }
    return null;
  }

  getSellPL(): number | null {
    const metadata = this.orderData?.metadata || {};
    if (this.orderData?.side === 2) {
      return metadata.ExpectedProfit || metadata.TargetProfit || null;
    }
    return null;
  }

  getRequiredMargin(): number | null {
    const metadata = this.orderData?.metadata || {};
    return this.orderData?.requiredMargin || metadata.RequiredMargin || null;
  }

  onChartEvent(event: any): void {
    try {
      if (!event) return;
      // Event is already parsed from the trading view chart component
      if (event.name === 'quoteUpdate' && event.data) {
        const data = event.data as any;

        if (data.original_name) {
          this.currentSymbol.set(data.original_name);
        }

        if (typeof data.last_price === 'number') {
          this.lastPrice.set(data.last_price);
        }
      }
    } catch (error) {
      console.error('Error parsing chart event:', error);
    }
  }

  startEdit(): void {
    this.isEditing = true;
    this.originalValues = this.editForm.value;
    this.editForm.enable();
    // Keep symbol and orderType disabled even in edit mode
    this.editForm.get('symbol')?.disable();
    this.editForm.get('orderType')?.disable();
  }

  cancelEdit(): void {
    // Close the modal directly instead of going to read mode
    this.modalRef.dismiss();
  }

  saveOrder(): void {
    if (this.editForm.invalid || this.loading || !this.orderData) {
      return;
    }

    this.loading = true;
    // Use getRawValue() to include disabled fields (symbol and orderType)
    const formValue = this.editForm.getRawValue();

    const updateData: OrderUpdateRequest = {
      symbol: formValue.symbol,
      orderType: formValue.orderType,
      side: formValue.side,
      openPrice: formValue.openPrice,
      volume: formValue.volume,
      filledQuantity: formValue.filledQuantity,
      status: Number(formValue.status),
      leverage: formValue.leverage,
      stopLoss: formValue.stopLoss,
      takeProfit: formValue.takeProfit,
      clientOrderId: formValue.clientOrderId,
      orderCreatedAt: formValue.orderCreatedAt,
      orderModifiedAt: formValue.orderModifiedAt,
      createPosition: formValue.createPosition,
      closePrice: formValue.closePrice,
      isClosed: formValue.isClosed,
      realizedPnL: formValue.realizedPnL,
      unrealizedPnL: formValue.unrealizedPnL,
      positionOpenTime: this.formatDateTimeForAPI(formValue.positionOpenTime),
      positionCloseTime: this.formatDateTimeForAPI(formValue.positionCloseTime),
      commission: formValue.commission,
      swap: formValue.swap,
      paymentCurrency: formValue.paymentCurrency,
      reason: formValue.reason,
    };

    this.service
      .updateOrder(this.orderData.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order updated successfully');
          this.loading = false;
          // Keep in edit mode after saving
          this.isEditing = true;
          this.editForm.enable();
          // Keep symbol and orderType disabled
          this.editForm.get('symbol')?.disable();
          this.editForm.get('orderType')?.disable();

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }

          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error updating order:', error);

          let errorMessage = 'Failed to update order';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.alertService.error(errorMessage);
          this.loading = false;
        },
      });
  }

  closeOrder(): void {
    if (this.loading || !this.orderData) {
      return;
    }

    if (!confirm('Are you sure you want to close this order?')) {
      return;
    }

    this.loading = true;

    this.service
      .closeOrder(this.orderData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order cancelled successfully');
          this.loading = false;

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }

          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error cancelling order:', error);

          let errorMessage = 'Failed to cancel order';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.alertService.error(errorMessage);
          this.loading = false;
        },
      });
  }

  onClose(): void {
    if (
      this.isEditing &&
      !confirm('You have unsaved changes. Are you sure you want to close?')
    ) {
      return;
    }
    this.modalRef.dismiss();
  }

  isOrderClosed(): boolean {
    if (!this.orderData) return false;
    // Status 3 = Filled, 4 = Cancelled, 5 = Rejected, 6 = Liquidated
    return (
      this.orderData.status === 3 ||
      this.orderData.status === 4 ||
      this.orderData.status === 5 ||
      this.orderData.status === 6
    );
  }

  openReopenModal(): void {
    this.showReopenModal = true;
    if (this.orderData) {
      const metadata = this.orderData.metadata || {};
      this.reopenForm.patchValue({
        newDesiredPnL: metadata.ExpectedProfit || metadata.TargetProfit || 0,
        newClosePrice: this.orderData.price || 0,
      });
    }
  }

  closeReopenModal(): void {
    this.showReopenModal = false;
    this.reopenForm.reset({
      applyNewOutcome: true,
    });
  }

  reopenOrder(): void {
    if (this.reopenForm.invalid || this.loading || !this.orderData) {
      return;
    }

    this.loading = true;
    const adminId = this.authService.getUserId();

    if (!adminId) {
      this.alertService.error('Unable to get admin ID. Please log in again.');
      this.loading = false;
      return;
    }

    const reopenData: ReopenOrderRequest = {
      adminId,
      ...this.reopenForm.value,
    };

    this.service
      .reopenOrder(this.orderData.id, reopenData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order reopened successfully');
          this.loading = false;
          this.showReopenModal = false;
          this.reopenForm.reset({
            applyNewOutcome: true,
          });

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }

          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error reopening order:', error);

          let errorMessage = 'Failed to reopen order';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.alertService.error(errorMessage);
          this.loading = false;
        },
      });
  }

  preventInvalidNumberInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+'];
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

  private formatDateTimeForInput(dateTime: string | null | undefined): string | null {
    if (!dateTime) return null;
    
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return null;
      
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return null;
    }
  }

  private formatDateTimeForAPI(dateTimeString: string | null): string | null {
    if (!dateTimeString) return null;
    
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return null;
      
      // Return ISO string for API
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting datetime for API:', error);
      return null;
    }
  }
}
