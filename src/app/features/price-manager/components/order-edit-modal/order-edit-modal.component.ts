import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
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
  @ViewChild(TradingViewChartComponent)
  tradingViewChart!: TradingViewChartComponent;

  private service = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  editForm!: FormGroup;
  reopenForm!: FormGroup;
  isEditing = true;
  loading = false;
  loadingData = false;
  originalValues: any = {};
  orderData: any | null = null;
  showReopenModal = false;

  // Chart related properties
  currentSymbol = signal<string>('');
  lastPrice = signal<number | null>(null);
  bidPrice = signal<number | null>(null);
  askPrice = signal<number | null>(null);

  // Helper method to extract symbol from format like "BINANCE:BTCUSDT"
  getChartSymbol(): string {
    if (!this.orderData?.symbol) {
      return 'BTCUSDT';
    }
    const symbol = this.orderData.symbol;
    // Split by colon and return the second part, or the whole symbol if no colon
    return symbol.includes(':') ? symbol.split(':')[1] : symbol;
  }

  // Calculation toggles and states
  useAmount = signal<boolean>(false);
  useVolume = signal<boolean>(true);
  useTargetProfit = signal<boolean>(false);
  useLeverage = signal<boolean>(true);
  calculatingFromAmount = signal<boolean>(false);
  calculatingFromProfit = signal<boolean>(false);
  calculatingFromVolume = signal<boolean>(false);
  profitCalcSource = signal<'target' | 'leverage' | null>(null);

  private suppressCalc = false;
  private amountCalcTimer: any = null;
  private profitCalcTimer: any = null;
  private volumeCalcTimer: any = null;
  private pnlRefreshInterval: any = null;

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
      targetProfit: [null],
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
      paymentCurrency: ['USD'],
      amount: [null, [Validators.min(0)]],
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
    this.startPnLRefresh();
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
    const symbol =
      this.orderData.symbol || this.orderData.tradingPairSymbol || '';

    this.currentSymbol.set(symbol);

    // Check if amount exists in order data
    const hasAmount =
      this.orderData.amount != null && this.orderData.amount > 0;
    if (hasAmount) {
      this.useAmount.set(true);
    }

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
      targetProfit: this.orderData.realizedPnL ?? null,
      clientOrderId: this.orderData.clientOrderId || '',
      orderCreatedAt: this.orderData.orderCreatedAt ?? this.orderData.createdAt,
      orderModifiedAt:
        this.orderData.orderModifiedAt ?? this.orderData.lastModifiedAt,
      createPosition: this.orderData.createPosition ?? true,
      closePrice: this.orderData.closePrice,
      isClosed: this.orderData.isClosed,
      realizedPnL: this.orderData.realizedPnL,
      unrealizedPnL: this.orderData.unrealizedPnL,
      positionOpenTime: this.formatDateTimeForInput(
        this.orderData.positionOpenTime
      ),
      positionCloseTime: this.formatDateTimeForInput(
        this.orderData.positionCloseTime
      ),
      commission: this.orderData.commission,
      swap: this.orderData.swap ?? this.orderData.swaps,
      paymentCurrency: this.orderData.paymentCurrency || 'USD',
      amount: this.orderData.amount || null,
      reason: this.orderData.reason || '',
    });

    this.editForm.enable();
    this.editForm.get('symbol')?.disable();
    this.editForm.get('orderType')?.disable();
    this.originalValues = this.editForm.value;
  }

  ngOnDestroy(): void {
    this.stopPnLRefresh();
    if (this.amountCalcTimer) clearTimeout(this.amountCalcTimer);
    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    if (this.volumeCalcTimer) clearTimeout(this.volumeCalcTimer);
    // Ensure the parent can detect closure and refresh, mirroring quick-order behavior
    this.modalRef.close(true);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private normalizeOrder(raw: any): any {
    if (!raw) return raw;

    const normalized: any = {
      id: raw.id ?? raw.orderId,
      orderId: raw.orderId ?? raw.id,
      tradingAccountId: raw.tradingAccountId,
      userId: raw.userId,
      tradingPairSymbol: raw.tradingPairSymbol ?? raw.symbol,
      symbol: raw.symbol ?? raw.tradingPairSymbol,
      orderType: raw.orderType,
      side: raw.side,
      price: raw.price ?? raw.openPrice,
      openPrice: raw.openPrice ?? raw.price,
      closePrice: raw.closePrice ?? null,
      volume: raw.volume ?? raw.quantity,
      quantity: raw.quantity ?? raw.volume,
      filledQuantity: raw.filledQuantity ?? 0,
      remainingQuantity: raw.remainingQuantity ?? null,
      status: raw.status,
      leverage: raw.leverage ?? 1,
      stopLoss: raw.stopLoss ?? raw.stopPrice ?? null,
      stopPrice: raw.stopPrice ?? raw.stopLoss ?? null,
      takeProfit: raw.takeProfit ?? null,
      clientOrderId: raw.clientOrderId ?? null,
      positionId: raw.positionId ?? null,
      createdAt: raw.createdAt ?? raw.orderCreatedAt ?? null,
      lastModifiedAt: raw.lastModifiedAt ?? raw.orderModifiedAt ?? null,
      positionOpenTime: raw.positionOpenTime ?? null,
      positionCloseTime: raw.positionCloseTime ?? null,
      requiredMargin: raw.requiredMargin ?? null,
      positionMargin: raw.positionMargin ?? null,
      realizedPnL: raw.realizedPnL ?? null,
      unrealizedPnL: raw.unrealizedPnL ?? null,
      commission: raw.commission ?? null,
      swaps: raw.swap ?? raw.swaps ?? null,
      paymentCurrency: raw.paymentCurrency ?? 'USD',
      amount: raw.amount ?? null,
      isClosed: raw.isClosed ?? false,
      createPosition: raw.createPosition ?? null,
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

  onChartEvent(event: any): void {
    try {
      if (!event) return;
      const json = JSON.parse(event);
      if (json.name === 'quoteUpdate' && json.data) {
        const data = json.data as any;
        
        if (data.original_name) {
          this.currentSymbol.set(data.original_name);
        }

        if (typeof data.last_price === 'number') {
          this.lastPrice.set(data.last_price);
        }

        if (typeof data.bid === 'number') {
          this.bidPrice.set(data.bid);
        }
        if (typeof data.ask === 'number') {
          this.askPrice.set(data.ask);
        }
      }
    } catch {}
  }

  // ========= Amount-based calculation (same as quick-order) =========
  onAmountInput(value: any): void {
    const num = value ? +value : null;
    this.editForm.get('amount')?.setValue(num, { emitEvent: false });
    this.triggerAmountBasedCalc();
  }

  onPaymentCurrencyChange(value: string): void {
    this.editForm
      .get('paymentCurrency')
      ?.setValue(value || 'USD', { emitEvent: false });
    if (this.editForm.get('amount')?.value) {
      this.triggerAmountBasedCalc();
    }
  }

  private triggerAmountBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useAmount()) return;

    const symbol = this.currentSymbol();
    const amount = this.editForm.get('amount')?.value;
    const paymentCurrency = this.editForm.get('paymentCurrency')?.value;
    const side = this.editForm.get('side')?.value;
    const leverage = this.editForm.get('leverage')?.value || 1;

    if (!symbol || !amount || !paymentCurrency || !side) return;

    const requestBody = {
      symbol,
      paymentCurrency,
      amount,
      side,
      leverage,
      targetProfit: null,
    };

    if (this.amountCalcTimer) clearTimeout(this.amountCalcTimer);
    this.calculatingFromAmount.set(true);

    this.amountCalcTimer = setTimeout(() => {
      this.service
        .calculateFromAmount(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applyCalculationResponse(resp);
          }),
          catchError((err) => {
            console.error('Error calculating from amount:', err);
            const msg =
              err?.error?.error ||
              err?.error?.message ||
              err?.message ||
              'Failed to calculate from amount';
            this.alertService.error(msg);
            return [];
          }),
          finalize(() => this.calculatingFromAmount.set(false))
        )
        .subscribe();
    }, 300);
  }

  // ========= Profit-based calculation (same as quick-order with bulk) =========
  onTargetProfitInput(value: any): void {
    const num = parseFloat(value);
    if (!isFinite(num)) return;
    if (this.useTargetProfit()) {
      this.profitCalcSource.set('target');
      this.triggerProfitBasedCalc();
    }
  }

  private triggerProfitBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useTargetProfit()) return;

    const symbol = this.currentSymbol();
    const targetProfit = this.editForm.get('targetProfit')?.value;
    const side = this.editForm.get('side')?.value;
    const leverage = this.editForm.get('leverage')?.value || 1;
    const volume = this.editForm.get('volume')?.value || 0.01;

    if (!symbol || targetProfit == null || !side || !this.orderData?.userId)
      return;

    const requestBody = {
      userIds: [this.orderData.userId],
      symbol,
      targetProfit,
      side,
      leverage,
      volume,
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.calculatingFromProfit.set(true);

    this.profitCalcTimer = setTimeout(() => {
      this.service
        .calculateFromProfitBulk(requestBody)
        .pipe(
          tap((resp: any) => this.applyCalculationResponse(resp)),
          catchError((err) => {
            const msg =
              err?.error?.error ||
              err?.message ||
              'Failed to calculate from profit';
            this.alertService.error(msg);
            return [];
          }),
          finalize(() => this.calculatingFromProfit.set(false))
        )
        .subscribe();
    }, 300);
  }

  // ========= Volume-based calculation (same as quick-order) =========
  onVolumeInput(value: any): void {
    const num = parseFloat(value);
    if (!isFinite(num)) return;
    if (this.useVolume()) this.triggerVolumeBasedCalc();
  }

  onOpenPriceInput(value: any): void {
    const num = parseFloat(value);
    if (!isFinite(num)) return;
    if (this.useVolume() && this.editForm.get('volume')?.value)
      this.triggerVolumeBasedCalc();
  }

  onClosePriceInput(value: any): void {
    const num = parseFloat(value);
    if (!isFinite(num)) return;
    if (this.useVolume() && this.editForm.get('volume')?.value)
      this.triggerVolumeBasedCalc();
  }

  private triggerVolumeBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useVolume()) return;

    const symbol = this.currentSymbol();
    const volume = this.editForm.get('volume')?.value;
    const side = this.editForm.get('side')?.value;
    const leverage = this.useLeverage()
      ? this.editForm.get('leverage')?.value || 1
      : null;
    const entryPrice = this.editForm.get('openPrice')?.value;
    const exitPrice = this.editForm.get('closePrice')?.value;
    const targetProfit = this.editForm.get('targetProfit')?.value;

    if (!symbol || !volume || !side) return;

    const requestBody = {
      symbol,
      volume,
      side,
      entryPrice,
      exitPrice,
      leverage,
      tradingAccountId: null,
      targetProfit,
    };

    if (this.volumeCalcTimer) clearTimeout(this.volumeCalcTimer);
    this.calculatingFromVolume.set(true);

    this.volumeCalcTimer = setTimeout(() => {
      this.service
        .calculateFromVolume(requestBody)
        .pipe(
          tap((resp: any) => this.applyCalculationResponse(resp)),
          catchError((err) => {
            const msg =
              err?.error?.error ||
              err?.message ||
              'Failed to calculate from volume';
            this.alertService.error(msg);
            return [];
          }),
          finalize(() => this.calculatingFromVolume.set(false))
        )
        .subscribe();
    }, 300);
  }

  onLeverageChange(value: any): void {
    const val = value ? +value : 1;
    this.editForm.get('leverage')?.setValue(val, { emitEvent: false });
    if (this.useLeverage()) {
      if (this.useTargetProfit() && this.editForm.get('targetProfit')?.value) {
        this.profitCalcSource.set('leverage');
        this.triggerProfitBasedCalc();
      } else if (this.useVolume() && this.editForm.get('volume')?.value) {
        this.triggerVolumeBasedCalc();
      }
    }
  }

  private applyCalculationResponse(resp: any): void {
    if (!resp || typeof resp !== 'object') return;

    this.suppressCalc = true;
    try {
      if (typeof resp.volume === 'number') {
        this.editForm
          .get('volume')
          ?.setValue(resp.volume, { emitEvent: false });
      }
      if (typeof resp.entryPrice === 'number') {
        this.editForm
          .get('openPrice')
          ?.setValue(resp.entryPrice, { emitEvent: false });
      }
      if (typeof resp.buyOpenPrice === 'number') {
        this.editForm
          .get('openPrice')
          ?.setValue(resp.buyOpenPrice, { emitEvent: false });
      }
      if (typeof resp.sellOpenPrice === 'number') {
        this.editForm
          .get('openPrice')
          ?.setValue(resp.sellOpenPrice, { emitEvent: false });
      }
      if (typeof resp.closePrice === 'number') {
        this.editForm
          .get('closePrice')
          ?.setValue(resp.closePrice, { emitEvent: false });
      }
      // if (typeof resp.expectedProfit === 'number') {
      //   this.editForm
      //     .get('takeProfit')
      //     ?.setValue(resp.expectedProfit, { emitEvent: false });
      // }
      if (typeof resp.profitLoss === 'number') {
        this.editForm
          .get('realizedPnL')
          ?.setValue(resp.profitLoss, { emitEvent: false });
        if (this.orderData) {
          this.orderData.realizedPnL = resp.profitLoss;
        }
      }
      if (typeof resp.requiredMargin === 'number') {
        if (this.orderData) {
          this.orderData.positionMargin = resp.requiredMargin;
        }
      }
      if (typeof resp.margin === 'number') {
        if (this.orderData) {
          this.orderData.positionMargin = resp.margin;
        }
      }
      if (typeof resp.commission === 'number') {
        this.editForm
          .get('commission')
          ?.setValue(resp.commission, { emitEvent: false });
      }
      if (typeof resp.swap === 'number') {
        this.editForm.get('swap')?.setValue(resp.swap, { emitEvent: false });
      }
    } finally {
      setTimeout(() => (this.suppressCalc = false), 0);
    }
  }

  // ========= P/L Refresh (using bulk like quick-order) =========
  private startPnLRefresh(): void {
    this.stopPnLRefresh();
    this.pnlRefreshInterval = setInterval(() => this.refreshPnL(), 3000);
  }

  private stopPnLRefresh(): void {
    if (this.pnlRefreshInterval) {
      clearInterval(this.pnlRefreshInterval);
      this.pnlRefreshInterval = null;
    }
  }

  private refreshPnL(): void {
    const symbol = this.currentSymbol();
    const side = this.editForm.get('side')?.value;
    const volume = this.editForm.get('volume')?.value;
    const openPrice = this.editForm.get('openPrice')?.value;
    const leverage = this.editForm.get('leverage')?.value || 1;
    const closePrice = this.editForm.get('closePrice')?.value;
    const amount = this.editForm.get('amount')?.value;
    const paymentCurrency = this.editForm.get('paymentCurrency')?.value;
    const targetProfit = this.editForm.get('targetProfit')?.value;

    if (
      !symbol ||
      !side ||
      !volume ||
      !openPrice ||
      volume <= 0 ||
      openPrice <= 0 ||
      !this.orderData?.userId
    ) {
      return;
    }

    const requestBody = {
      userIds: [this.orderData.userId],
      symbol,
      side,
      volume,
      openPrice,
      closePrice,
      leverage,
      amount,
      paymentCurrency,
      targetProfit,
    };

    this.service
      .calculatePnLBulk(requestBody)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp && typeof resp === 'object') {
            if (typeof resp.margin === 'number' && this.orderData) {
              this.orderData.positionMargin = resp.margin;
            }
            if (typeof resp.profitLoss === 'number') {
              this.editForm
                .get('realizedPnL')
                ?.setValue(resp.profitLoss, { emitEvent: false });
              if (this.orderData) {
                this.orderData.realizedPnL = resp.profitLoss;
              }
            }
            if (typeof resp.closePrice === 'number') {
              this.editForm
                .get('closePrice')
                ?.setValue(resp.closePrice, { emitEvent: false });
            }
          }
        },
        error: () => {},
      });
  }

  startEdit(): void {
    this.isEditing = true;
    this.originalValues = this.editForm.value;
    this.editForm.enable();
    this.editForm.get('symbol')?.disable();
    this.editForm.get('orderType')?.disable();
  }

  cancelEdit(): void {
    this.modalRef.dismiss();
  }

  saveOrder(): void {
    if (this.editForm.invalid || this.loading || !this.orderData) {
      return;
    }

    this.loading = true;
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
      targetProfit: formValue.targetProfit,
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
      amount: formValue.amount,
      reason: formValue.reason,
    };

    this.service
      .updateOrder(this.orderData.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order updated successfully');
          this.loading = false;
          this.isEditing = true;
          this.editForm.enable();
          this.editForm.get('symbol')?.disable();
          this.editForm.get('orderType')?.disable();

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }
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

  updatePrice(): void {
    if (!this.lastPrice()) {
      this.alertService.error('No price data available from chart');
      return;
    }
    this.editForm.get('openPrice')?.setValue(this.lastPrice()!);
  }

  updateClosePrice(): void {
    if (!this.lastPrice()) {
      this.alertService.error('No price data available from chart');
      return;
    }
    this.editForm.get('closePrice')?.setValue(this.lastPrice()!);
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

  private formatDateTimeForInput(
    dateTime: string | null | undefined
  ): string | null {
    if (!dateTime) return null;

    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return null;

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
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting datetime for API:', error);
      return null;
    }
  }
}
