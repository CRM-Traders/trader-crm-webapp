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
  volume = signal<number | null>(null);
  leverage = signal<number>(1);

  stopLoss = signal<number | null>(null);
  takeProfit = signal<number | null>(null);
  openPrice = signal<number | null>(null);
  autoPrice = signal<boolean>(false);
  sellPL = signal<number | null>(null);
  buyPL = signal<number | null>(null);
  sellRequiredMargin = signal<number | null>(null);
  buyRequiredMargin = signal<number | null>(null);
  comment = signal<string>('');
  updatingPrice = signal<boolean>(false);
  calculatingFromProfit = signal<boolean>(false);

  smartPLSide = signal<number>(1);
  targetProfit = signal<number | null>(null);
  buyOpenPrice = signal<number | null>(null);
  buyClosePrice = signal<number | null>(null);
  sellOpenPrice = signal<number | null>(null);
  sellClosePrice = signal<number | null>(null);
  smartPLLeverage = signal<number>(1);
  closeImmediately = signal<boolean>(false);
  calculatingFromVolume = signal<boolean>(false);

  closeInterval = signal<boolean>(false);
  updatingSellPrice = signal<boolean>(false);
  updatingBuyPrice = signal<boolean>(false);

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

  private suppressCalc = false;
  private profitCalcTimer: any = null;
  private volumeCalcTimer: any = null;

  ngOnInit(): void {
    if (this.data?.userId) {
      this.fetchUserBalance();
    }
  }

  fetchUserBalance(): void {
    this.loadingBalance.set(true);
    this.priceManagerService
      .getUserBalanceWithoutCurrency(this.data.userId)
      .pipe(
        tap((response: any) => {
          // Filter balances where totalAvailable > 0
          if (response?.balances && response.balances.length > 0) {
            const availableBalances = response.balances.filter(
              (balance: any) => balance.totalAvailable > 0
            );
            this.userBalance.set(availableBalances);
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

        // Track previous symbol to detect changes
        const previousSymbol = this.currentSymbol();

        if (data.original_name) {
          this.currentSymbol.set(data.original_name);

          if (this.activeTab() === 'newOrder') {
            this.symbol.set(data.original_name);

            // Update price on symbol change
            if (
              previousSymbol !== data.original_name &&
              typeof data.last_price === 'number'
            ) {
              this.openPrice.set(data.last_price);
            }
          }
        }

        if (typeof data.last_price === 'number') {
          this.lastPrice.set(data.last_price);

          if (this.activeTab() === 'newOrder') {
            // Update if auto is on OR if price is empty/invalid
            if (
              this.autoPrice() ||
              !this.openPrice() ||
              (typeof this.openPrice() === 'number' && this.openPrice()! <= 0)
            ) {
              this.openPrice.set(data.last_price);
            }
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

  onTakeProfitInput(value: any): void {
    this.takeProfit.set(value ? +value : null);
    this.triggerProfitBasedCalcNewOrder();
  }

  private triggerProfitBasedCalcNewOrder(): void {
    if (this.suppressCalc) return;

    if (!this.currentSymbol() || !this.takeProfit()) {
      return;
    }

    const requestBody = {
      symbol: this.currentSymbol(),
      targetProfit: this.takeProfit()!,
      side: this.side(),
      leverage: this.leverage(),
      tradingAccountId: null,
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.calculatingFromProfit.set(true);

    this.profitCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromProfit(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applyNewOrderCalculationResponse(resp);
          }),
          catchError((err) => {
            console.error('Error calculating from profit:', err);
            this.alertService.error('Failed to calculate from profit');
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
    if (this.activeTab() === 'smartPL') {
      this.triggerVolumeBasedCalc();
    }
  }

  onBuyOpenPriceInput(value: any): void {
    this.buyOpenPrice.set(value ? +value : null);
    this.triggerVolumeBasedCalc();
  }

  onBuyClosePriceInput(value: any): void {
    this.buyClosePrice.set(value ? +value : null);
    this.triggerVolumeBasedCalc();
  }

  onSellOpenPriceInput(value: any): void {
    this.sellOpenPrice.set(value ? +value : null);
    this.triggerVolumeBasedCalc();
  }

  onLeverageChange(value: any): void {
    this.leverage.set(value ? +value : 1);
    this.triggerProfitBasedCalcNewOrder();
  }

  onSmartPLLeverageChange(value: any): void {
    this.smartPLLeverage.set(value ? +value : 1);
    this.recalculateSmartPL('leverage');
  }

  onSellClosePriceInput(value: any): void {
    this.sellClosePrice.set(value ? +value : null);
    this.triggerVolumeBasedCalc();
  }

  onSmartPLSideChange(side: number): void {
    this.smartPLSide.set(side);
    this.recalculateSmartPL('side');
  }

  onExpectedPLInput(value: any): void {
    this.targetProfit.set(value ? +value : null);
    this.triggerProfitBasedCalc();
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
      symbol: this.currentSymbol(),
      targetProfit: this.targetProfit()!,
      side: this.smartPLSide(),
      leverage: this.smartPLLeverage(),
      tradingAccountId: null,
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.calculatingFromProfit.set(true);

    this.profitCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromProfit(requestBody)
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

    if (!this.currentSymbol() || !this.volume()) {
      return;
    }

    const { entryPrice, exitPrice } = this.getEntryExitPrices();

    if (entryPrice == null || exitPrice == null) {
      return;
    }

    const requestBody = {
      symbol: this.currentSymbol(),
      volume: this.volume()!,
      side: this.smartPLSide(),
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      leverage: this.smartPLLeverage(),
      tradingAccountId: null,
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
            this.alertService.error('Failed to calculate from volume');
            return [];
          }),
          finalize(() => this.calculatingFromVolume.set(false))
        )
        .subscribe();
    }, 300);
  }

  private hasEntryExitPrices(): boolean {
    if (this.smartPLSide() === 1) {
      return !!(this.buyOpenPrice() && this.buyClosePrice());
    } else {
      return !!(this.sellOpenPrice() && this.sellClosePrice());
    }
  }

  private getEntryExitPrices(): {
    entryPrice: number | null;
    exitPrice: number | null;
  } {
    if (this.smartPLSide() === 1) {
      return {
        entryPrice: this.buyOpenPrice(),
        exitPrice: this.buyClosePrice(),
      };
    }
    return {
      entryPrice: this.sellOpenPrice(),
      exitPrice: this.sellClosePrice(),
    };
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

      if (typeof resp.buyOpenPrice === 'number') {
        this.buyOpenPrice.set(resp.buyOpenPrice);
      }
      if (typeof resp.buyClosePrice === 'number') {
        this.buyClosePrice.set(resp.buyClosePrice);
      }
      if (typeof resp.sellOpenPrice === 'number') {
        this.sellOpenPrice.set(resp.sellOpenPrice);
      }
      if (typeof resp.sellClosePrice === 'number') {
        this.sellClosePrice.set(resp.sellClosePrice);
      }

      if (typeof resp.requiredMargin === 'number') {
        this.buyRequiredMargin.set(resp.requiredMargin);
        this.sellRequiredMargin.set(resp.requiredMargin);
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

  updateBuyOpenPrice(): void {
    if (!this.currentSymbol()) {
      this.alertService.error('Symbol is required');
      return;
    }

    this.buyOpenPrice.set(this.lastPrice());
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
      // smartPL
      return !!(this.currentSymbol() && this.volume());
    }
  }

  ngOnDestroy(): void {
    this.modalRef.close(true);
    this.destroy$.next();
    this.destroy$.complete();
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
      volume: this.volume()!,
      openPrice: this.openPrice()!,
      leverage: this.leverage(),
      stopLoss: this.stopLoss(),
      takeProfit: this.takeProfit(),
      autoPrice: this.autoPrice(),
      sellPL: this.sellPL(),
      buyPL: this.buyPL(),
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      comment: this.comment(),
      closeImmediately: false,
    };

    this.priceManagerService
      .createBulkOrder(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.side() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(`${sideLabel} order created successfully`);
          this.modalRef.close(true);
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
    if (!this.targetProfit()) {
      this.alertService.error('Please enter a valid expected P/L');
      return;
    }

    if (this.smartPLSide() == 2) {
      if (!this.sellOpenPrice() || this.sellOpenPrice()! <= 0) {
        this.alertService.error('Please enter a valid sell open price');
        return;
      }
      if (!this.sellClosePrice() || this.sellClosePrice()! <= 0) {
        this.alertService.error('Please enter a valid sell close price');
        return;
      }
    } else {
      if (!this.buyOpenPrice() || this.buyOpenPrice()! <= 0) {
        this.alertService.error('Please enter a valid buy open price');
        return;
      }
      if (!this.buyClosePrice() || this.buyClosePrice()! <= 0) {
        this.alertService.error('Please enter a valid buy close price');
        return;
      }
    }

    this.submitting.set(true);

    const requestBody: any = {
      loginIds: [this.data.userId],
      symbol: this.currentSymbol(),
      side: this.smartPLSide(),
      closeInterval: this.closeInterval(),
      volume: this.volume()!,
      expectedPL: this.targetProfit()!,
      sellOpenPrice: this.sellOpenPrice()!,
      sellClosePrice: this.sellClosePrice()!,
      buyOpenPrice: this.buyOpenPrice()!,
      buyClosePrice: this.buyClosePrice()!,
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      closeImmediately: true,
    };

    this.priceManagerService
      .createOrderWithSmartPL(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.smartPLSide() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(
            `${sideLabel} order with Smart P/L created successfully`
          );
          this.modalRef.close(true);
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
