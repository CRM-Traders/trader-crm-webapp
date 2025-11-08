import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { PriceManagerService } from '../../services/price-manager.service';
import { AlertService } from '../../../../core/services/alert.service';
import { TradingViewChartComponent } from '../../../../shared/components/trading-view-chart/trading-view-chart.component';

export interface QuickOrderData {
  userId: string;
  userFullName: string;
}

@Component({
  selector: 'app-quick-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TradingViewChartComponent],
  templateUrl: './quick-order-modal.component.html',
  styleUrls: ['./quick-order-modal.component.scss'],
})
export class QuickOrderModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() data!: QuickOrderData;
  @ViewChild(TradingViewChartComponent)
  tradingViewChart!: TradingViewChartComponent;

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  activeTab = signal<'newOrder' | 'smartPL'>('smartPL');

  symbol = signal<string>('');
  side = signal<number>(1);
  volume = signal<number | null>(0.01);
  leverage = signal<number>(1);

  stopLoss = signal<number | null>(null);
  takeProfit = signal<number | null>(null);
  openPrice = signal<number | null>(null);
  closePrice = signal<number | null>(null);
  autoPrice = signal<boolean>(false);
  sellPL = signal<number | null>(null);
  buyPL = signal<number | null>(null);
  sellRequiredMargin = signal<number | null>(null);
  buyRequiredMargin = signal<number | null>(null);
  comment = signal<string>('');
  updatingPrice = signal<boolean>(false);
  profitLoss = signal<number | null>(null);
  calculatingFromProfit = signal<boolean>(false);

  smartPLSide = signal<number>(1);
  targetProfit = signal<number | null>(null);
  smartPLLeverage = signal<number>(1);
  commission = signal<number | null>(null);
  swap = signal<number | null>(null);
  closeImmediately = signal<boolean>(false);
  calculatingFromVolume = signal<boolean>(false);

  closeInterval = signal<boolean>(false);
  autoOpenPrice = signal<boolean>(false);
  autoClosePrice = signal<boolean>(false);

  submitting = signal<boolean>(false);
  submitSide = signal<number | null>(null);

  loadingBalance = signal<boolean>(false);
  userBalance = signal<any[]>([]);

  lastPrice = signal<number | null>(null);
  bidPrice = signal<number | null>(null);
  askPrice = signal<number | null>(null);

  currentSymbol = signal<string>('');

  sideOptions = [
    { value: 1, label: 'Buy', class: 'text-green-600 dark:text-green-400' },
    { value: 2, label: 'Sell', class: 'text-red-600 dark:text-red-400' },
  ];

  amount = signal<number | null>(null);
  paymentCurrency = signal<'USD' | 'EUR' | 'GBP'>('USD');
  calculatingFromAmount = signal<boolean>(false);

  useAmount = signal<boolean>(true);
  useVolume = signal<boolean>(true);
  useTakeProfit = signal<boolean>(true);
  useLeverage = signal<boolean>(true);
  useOpenPrice = signal<boolean>(false);
  useClosePrice = signal<boolean>(false);

  private amountCalcTimer: any = null;
  private suppressCalc = false;
  private profitCalcTimer: any = null;
  private volumeCalcTimer: any = null;
  private pnlRefreshInterval: any = null;

  ngOnInit(): void {
    if (this.data?.userId) {
      this.fetchUserBalance();
    }
    this.startPnLRefresh();
  }

  fetchUserBalance(): void {
    this.loadingBalance.set(true);
    this.priceManagerService
      .getUserBalanceWithoutCurrency(this.data.userId)
      .pipe(
        tap((response: any) => {
          if (response?.balances && response.balances.length > 0) {
            const balances: any[] = Array.isArray(response.balances)
              ? response.balances
              : [];

            const validBalances = balances.filter(
              (b) =>
                b &&
                typeof b.currency === 'string' &&
                typeof b.totalAvailable === 'number'
            );

            if (validBalances.length > 0) {
              const highestBalance = validBalances.reduce((max, current) =>
                current.totalAvailable > max.totalAvailable ? current : max
              );

              this.userBalance.set([highestBalance]);
            } else {
              this.userBalance.set([]);
            }
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

  switchTab(tab: 'newOrder' | 'smartPL'): void {
    this.activeTab.set(tab);
  }

  onChartEvent(event: any): void {
    try {
      if (!event) return;
      const json = JSON.parse(event);
      if (json.name === 'quoteUpdate' && json.data) {
        const data = json.data as any;

        const previousSymbol = this.currentSymbol();

        if (data.original_name) {
          this.currentSymbol.set(data.original_name);

          if (this.activeTab() === 'newOrder') {
            this.symbol.set(data.original_name);
          }

          if (
            previousSymbol !== data.original_name &&
            typeof data.last_price === 'number'
          ) {
            this.openPrice.set(data.last_price);
          }
        }

        if (typeof data.last_price === 'number') {
          this.lastPrice.set(data.last_price);

          if (
            this.autoPrice() ||
            this.autoOpenPrice() ||
            !this.openPrice() ||
            (typeof this.openPrice() === 'number' && this.openPrice()! <= 0)
          ) {
            this.openPrice.set(data.last_price);
          }
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

  onAmountInput(value: any): void {
    this.amount.set(value ? +value : null);
    this.triggerAmountBasedCalc();
  }

  onPaymentCurrencyChange(value: string): void {
    this.paymentCurrency.set((value as 'USD' | 'EUR' | 'GBP') ?? 'USD');
    if (this.amount()) this.triggerAmountBasedCalc();
  }

  private triggerAmountBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useAmount()) return;
    if (!this.currentSymbol() || !this.amount() || !this.paymentCurrency())
      return;

    const isSmart = this.activeTab() === 'smartPL';

    const requestBody = {
      symbol: this.currentSymbol(),
      paymentCurrency: this.paymentCurrency(),
      amount: this.amount()!,
      side: isSmart ? this.smartPLSide() : this.side(),
      leverage: isSmart ? this.smartPLLeverage() : this.leverage(),
      targetProfit: null as number | null,
    };

    if (this.amountCalcTimer) clearTimeout(this.amountCalcTimer);
    this.calculatingFromAmount.set(true);

    this.amountCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromAmount(requestBody)
        .pipe(
          tap((resp: any) => {
            if (isSmart) {
              this.applySmartPLCalculationResponse(resp, 'profit');
            } else {
              this.applyNewOrderCalculationResponse(resp);
            }
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

  onTargetProfitInput(value: any): void {
    this.targetProfit.set(value ? +value : null);
    this.triggerProfitBasedCalc();
  }

  onTargetProfitInputNewOrder(value: any): void {
    this.targetProfit.set(value ? +value : null);
    this.triggerProfitBasedCalcNewOrder();
  }

  private triggerProfitBasedCalcNewOrder(): void {
    if (this.suppressCalc) return;
    if (!this.currentSymbol() || !this.targetProfit()) {
      return;
    }

    const requestBody = {
      userIds: [this.data.userId],
      symbol: this.currentSymbol(),
      targetProfit: this.targetProfit()!,
      side: this.side(),
      volume: this.volume(),
      leverage: this.leverage(),
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.calculatingFromProfit.set(true);

    this.profitCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromProfitBulk(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applyNewOrderCalculationResponse(resp);
          }),
          catchError((err) => {
            console.error('Error calculating from profit:', err);
            const errorMsg =
              err?.error?.error ||
              err?.error?.message ||
              err?.message ||
              'Failed to calculate from profit';
            this.alertService.error(errorMsg);

            return [];
          }),
          finalize(() => this.calculatingFromProfit.set(false))
        )
        .subscribe();
    }, 300);
  }

  private applyNewOrderCalculationResponse(resp: any): void {
    if (!resp || typeof resp !== 'object') return;

    this.suppressCalc = true;
    try {
      if (typeof resp.volume === 'number') {
        this.volume.set(resp.volume);
      }

      if (typeof resp.entryPrice === 'number') {
        this.openPrice.set(resp.entryPrice);
      }

      if (typeof resp.profitLoss === 'number') {
        this.profitLoss.set(resp.profitLoss);
      }

      if (this.side() === 1) {
        if (typeof resp.buyOpenPrice === 'number') {
          this.openPrice.set(resp.buyOpenPrice);
        }
        if (typeof resp.requiredMargin === 'number') {
          this.buyRequiredMargin.set(resp.requiredMargin);
        }
        if (typeof resp.expectedProfit === 'number') {
          this.buyPL.set(resp.expectedProfit);
        }
      } else {
        if (typeof resp.sellOpenPrice === 'number') {
          this.openPrice.set(resp.sellOpenPrice);
        }
        if (typeof resp.requiredMargin === 'number') {
          this.sellRequiredMargin.set(resp.requiredMargin);
        }
        if (typeof resp.expectedProfit === 'number') {
          this.sellPL.set(resp.expectedProfit);
        }
      }
    } finally {
      setTimeout(() => (this.suppressCalc = false), 0);
    }
  }

  onVolumeInput(value: any): void {
    this.volume.set(value ? +value : null);
    if (this.activeTab() === 'smartPL' && this.useVolume()) {
      this.triggerVolumeBasedCalc();
    }
  }

  onOpenPriceInput(value: any): void {
    this.openPrice.set(value ? +value : null);
    if (this.activeTab() === 'smartPL' && this.useVolume()) {
      this.triggerVolumeBasedCalc();
    }
  }

  onClosePriceInput(value: any): void {
    this.closePrice.set(value ? +value : null);
    if (this.activeTab() === 'smartPL' && this.useVolume()) {
      this.triggerVolumeBasedCalc();
    }
  }

  onLeverageChange(value: any): void {
    this.leverage.set(value ? +value : 1);
    if (this.useLeverage()) {
      this.triggerProfitBasedCalcNewOrder();
    }
  }

  onSmartPLLeverageChange(value: any): void {
    this.smartPLLeverage.set(value ? +value : 1);
    this.recalculateSmartPL('leverage');
  }

  onSmartPLSideChange(side: number): void {
    this.smartPLSide.set(side);
    this.recalculateSmartPL('side');
  }

  private recalculateSmartPL(source: 'symbol' | 'side' | 'leverage'): void {
    if (this.volume() && this.hasEntryExitPrices()) {
      this.triggerVolumeBasedCalc();
    } else if (this.targetProfit()) {
      this.triggerProfitBasedCalc();
    }
  }

  private triggerProfitBasedCalc(): void {
    if (this.suppressCalc) return;

    if (!this.currentSymbol() || !this.targetProfit()) {
      return;
    }

    const requestBody = {
      userIds: [this.data.userId],
      symbol: this.currentSymbol(),
      targetProfit: this.targetProfit()!,
      side: this.smartPLSide(),
      leverage: this.smartPLLeverage(),
      volume: this.volume(),
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.calculatingFromProfit.set(true);
    this.profitCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromProfitBulk(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applySmartPLCalculationResponse(resp, 'profit');
          }),
          catchError(() => []),
          finalize(() => this.calculatingFromProfit.set(false))
        )
        .subscribe();
    }, 300);
  }

  private triggerVolumeBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useVolume()) return;

    if (!this.currentSymbol() || !this.volume()) {
      return;
    }

    const requestBody = {
      symbol: this.currentSymbol(),
      volume: this.volume()!,
      side: this.smartPLSide(),
      entryPrice: this.openPrice(),
      exitPrice: this.closePrice(),
      leverage: this.smartPLLeverage(),
      tradingAccountId: null,
      targetProfit: this.targetProfit(),
    };

    if (this.volumeCalcTimer) clearTimeout(this.volumeCalcTimer);
    this.calculatingFromVolume.set(true);

    this.volumeCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromVolume(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applySmartPLCalculationResponse(resp, 'volume');
          }),
          catchError((err) => {
            console.error('Error calculating from volume:', err);
            this.alertService.error(err.error.error);
            return [];
          }),
          finalize(() => this.calculatingFromVolume.set(false))
        )
        .subscribe();
    }, 300);
  }

  private hasEntryExitPrices(): boolean {
    return !!(this.openPrice() && this.closePrice());
  }

  private applySmartPLCalculationResponse(
    resp: any,
    source: 'profit' | 'volume'
  ): void {
    if (!resp || typeof resp !== 'object') return;

    this.suppressCalc = true;
    try {
      if (typeof resp.volume === 'number') {
        this.volume.set(resp.volume);
      }

      if (typeof resp.expectedProfit === 'number') {
        this.targetProfit.set(resp.expectedProfit);
      }

      if (typeof resp.profitLoss === 'number') {
        this.profitLoss.set(resp.profitLoss);
      }

      if (typeof resp.entryPrice === 'number') {
        this.openPrice.set(resp.entryPrice);
      }
      if (typeof resp.closePrice === 'number') {
        this.closePrice.set(resp.closePrice);
      }

      if (typeof resp.requiredMargin === 'number') {
        this.buyRequiredMargin.set(resp.requiredMargin);
        this.sellRequiredMargin.set(resp.requiredMargin);
      }

      if (typeof resp.commission === 'number') {
        this.commission.set(resp.commission);
      }
      if (typeof resp.swap === 'number') {
        this.swap.set(resp.swap);
      }
    } finally {
      setTimeout(() => (this.suppressCalc = false), 0);
    }
  }

  updatePrice(): void {
    if (!this.lastPrice()) {
      this.alertService.error('No price data available from chart');
      return;
    }

    this.openPrice.set(this.lastPrice()!);
  }

  updateClosePrice(): void {
    if (!this.lastPrice()) {
      this.alertService.error('No price data available from chart');
      return;
    }

    this.closePrice.set(this.lastPrice()!);
  }

  isFormValid(): boolean {
    if (this.activeTab() === 'newOrder') {
      return !!(
        this.currentSymbol() &&
        this.volume() &&
        this.openPrice() &&
        this.volume()! > 0 &&
        this.openPrice()! > 0
      );
    } else {
      return !!(this.currentSymbol() && this.volume());
    }
  }

  ngOnDestroy(): void {
    this.stopPnLRefresh();
    this.modalRef.close(true);

    this.destroy$.next();
    this.destroy$.complete();
  }

  private startPnLRefresh(): void {
    this.stopPnLRefresh();
    this.pnlRefreshInterval = setInterval(() => {
      this.refreshPnL();
    }, 3000);
  }

  private stopPnLRefresh(): void {
    if (this.pnlRefreshInterval) {
      clearInterval(this.pnlRefreshInterval);
      this.pnlRefreshInterval = null;
    }
  }

  private refreshPnL(): void {
    const symbol = this.currentSymbol();
    const volume = this.volume();
    const openPrice = this.openPrice();
    const leverage =
      this.activeTab() === 'newOrder'
        ? this.leverage()
        : this.smartPLLeverage();
    const side =
      this.activeTab() === 'newOrder' ? this.side() : this.smartPLSide();
    const closePrice =
      this.activeTab() === 'newOrder' ? null : this.closePrice();

    if (
      !symbol ||
      !volume ||
      !openPrice ||
      !leverage ||
      volume <= 0 ||
      openPrice <= 0
    ) {
      return;
    }

    const requestBody = {
      userIds: [this.data.userId],
      symbol: symbol,
      side: side,
      volume: volume,
      openPrice: openPrice,
      closePrice: closePrice,
      leverage: leverage,
      amount: this.amount(),
      paymentCurrency: this.paymentCurrency(),
    };

    this.priceManagerService
      .calculatePnLBulk(requestBody)
      .pipe(
        tap((resp: any) => {
          if (resp && typeof resp === 'object') {
            if (typeof resp.profitLoss === 'number') {
              this.profitLoss.set(resp.profitLoss);
            }
            if (typeof resp.closePrice === 'number') {
              this.closePrice.set(resp.closePrice);
            }

            if (typeof resp.margin === 'number') {
              if (side === 1) {
                this.buyRequiredMargin.set(resp.margin);
              } else {
                this.sellRequiredMargin.set(resp.margin);
              }
            }
            if (typeof resp.profitLoss === 'number') {
              if (side === 1) {
                this.buyPL.set(resp.profitLoss);
              } else {
                this.sellPL.set(resp.profitLoss);
              }
            }
          }
        }),
        catchError((err) => {
          console.error('Error refreshing PnL:', err);
          return [];
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onSubmit(side: number): void {
    this.submitSide.set(side);

    if (this.activeTab() === 'newOrder') {
      this.side.set(side);
      this.submitNewOrder();
    } else {
      this.smartPLSide.set(side);
      this.submitSmartPL();
    }
  }

  submitNewOrder(): void {
    if (!this.data?.userId) {
      this.alertService.error('User ID is required');
      return;
    }

    if (!this.currentSymbol()) {
      this.alertService.error('Please wait for symbol data from chart');
      return;
    }
    if (!this.volume() || this.volume()! <= 0) {
      this.alertService.error('Please enter a valid volume');
      return;
    }
    if (!this.openPrice() || this.openPrice()! <= 0) {
      this.alertService.error('Please enter a valid open price');
      return;
    }
    if (this.leverage() < 1) {
      this.alertService.error('Leverage must be at least 1');
      return;
    }

    this.submitting.set(true);

    const requestBody: any = {
      loginIds: [this.data.userId],
      symbol: this.currentSymbol(),
      side: this.side(),
      volume: this.useVolume() ? this.volume()! : undefined,
      openPrice: this.openPrice()!,
      leverage: this.useLeverage() ? this.leverage() : undefined,
      stopLoss: this.stopLoss(),
      takeProfit: this.takeProfit(),
      targetProfit: this.targetProfit(),
      autoPrice: this.autoPrice(),
      sellPL: this.sellPL(),
      buyPL: this.buyPL(),
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      comment: this.comment(),
      closeImmediately: false,
      paymentCurrency: this.paymentCurrency(),
      amount: this.useAmount() ? this.amount() : undefined,
    };

    this.priceManagerService
      .createBulkOrder(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.side() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(`${sideLabel} order created successfully`);
          this.fetchUserBalance();
        }),
        catchError((err: any) => {
          console.error('Error creating order:', err);
          let errorMessage = 'Failed to create order. Please try again.';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        }),
        finalize(() => {
          this.submitting.set(false);
          this.submitSide.set(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  submitSmartPL(): void {
    if (!this.data?.userId) {
      this.alertService.error('User ID is required');
      return;
    }

    if (!this.currentSymbol()) {
      this.alertService.error('Please wait for symbol data from chart');
      return;
    }

    if (!this.volume() || this.volume()! <= 0) {
      this.alertService.error('Please enter a valid volume');
      return;
    }

    if (!this.openPrice() || this.openPrice()! <= 0) {
      this.alertService.error('Please enter a valid open price');
      return;
    }
    if (!this.closePrice() || this.closePrice()! <= 0) {
      this.alertService.error('Please enter a valid close price');
      return;
    }

    this.submitting.set(true);

    const requestBody: any = {
      loginIds: [this.data.userId],
      symbol: this.currentSymbol(),
      side: this.smartPLSide(),
      closeInterval: this.closeInterval(),
      volume: this.useVolume() ? this.volume()! : undefined,
      targetProfit: this.targetProfit()!,
      openPrice: this.openPrice()!,
      closePrice: this.closePrice()!,
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      autoOpenPrice: this.autoOpenPrice(),
      autoClosePrice: this.autoClosePrice(),
      closeImmediately: true,
      paymentCurrency: this.paymentCurrency(),
      amount: this.useAmount() ? this.amount() : undefined,
      leverage: this.smartPLLeverage(),
    };

    this.priceManagerService
      .createOrderWithSmartPL(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.smartPLSide() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(
            `${sideLabel} order with Smart P/L created successfully`
          );
          this.fetchUserBalance();
        }),
        catchError((err: any) => {
          console.error('Error creating order:', err);
          let errorMessage = 'Failed to create order. Please try again.';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        }),
        finalize(() => {
          this.submitting.set(false);
          this.submitSide.set(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onCancel(): void {
    this.modalRef.dismiss();
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
}
