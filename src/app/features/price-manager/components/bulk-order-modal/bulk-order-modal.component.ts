import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  PriceManagerService,
  Client,
} from '../../services/price-manager.service';
import { AlertService } from '../../../../core/services/alert.service';
import { TradingViewChartComponent } from '../../../../shared/components/trading-view-chart/trading-view-chart.component';

export interface BulkOrderData {
  clients: Client[];
}

@Component({
  selector: 'app-bulk-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TradingViewChartComponent],
  templateUrl: './bulk-order-modal.component.html',
  styleUrls: ['./bulk-order-modal.component.scss'],
  providers: [TradingViewChartComponent],
})
export class BulkOrderModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() data?: BulkOrderData;
  @Input() title: string = 'Create Bulk Order';
  @ViewChild(TradingViewChartComponent)
  tradingViewChart!: TradingViewChartComponent;

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  // LocalStorage key for saving login IDs
  private readonly LOGIN_IDS_STORAGE_KEY = 'bulk_order_login_ids';

  activeTab = signal<'newOrder' | 'smartPL'>('smartPL');

  loginIdsInput = signal<string>('');
  symbol = signal<string>('');
  side = signal<number>(1);
  volume = signal<number | null>(0.01);
  leverage = signal<number>(1);

  stopLoss = signal<number | null>(null);
  takeProfit = signal<number | null>(null);
  openPrice = signal<number | null>(null);
  closePrice = signal<number | null>(null); // Unified close price for both buy and sell
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
  accountBalance = signal<number | null>(null);
  smartPLLeverage = signal<number>(1);
  commission = signal<number | null>(null);
  swap = signal<number | null>(null);
  closeImmediately = signal<boolean>(false);
  calculatingFromVolume = signal<boolean>(false);

  openTime = signal<string>('');
  closeHours = signal<number | null>(null);
  closeMinutes = signal<number | null>(null);
  closeSeconds = signal<number | null>(null);
  closeInterval = signal<boolean>(false);
  autoOpenPrice = signal<boolean>(false);
  autoClosePrice = signal<boolean>(false);

  submitting = signal<boolean>(false);
  submitSide = signal<number | null>(null);
  uploadingClients = signal<boolean>(false);
  fetchedClients = signal<Client[]>([]);

  lastPrice = signal<number | null>(null);
  bidPrice = signal<number | null>(null);
  askPrice = signal<number | null>(null);

  currentSymbol = signal<string>('');

  sideOptions = [
    { value: 1, label: 'Buy', class: 'text-green-600 dark:text-green-400' },
    { value: 2, label: 'Sell', class: 'text-red-600 dark:text-red-400' },
  ];

  // --- NEW: signals (put near other signals) ---
  amount = signal<number | null>(null);
  paymentCurrency = signal<'USD' | 'EUR' | 'GBP'>('USD');
  calculatingFromAmount = signal<boolean>(false);

  // --- Checkbox states for controlling calculations ---
  useAmount = signal<boolean>(true);
  useVolume = signal<boolean>(true);
  useTakeProfit = signal<boolean>(true);
  useExpectedPL = signal<boolean>(true);
  useLeverage = signal<boolean>(true);

  // --- NEW: computed signal to check if clients are valid ---
  hasValidClients = computed(() => this.fetchedClients().length > 0);

  // --- NEW: timer holder (put near other timers) ---
  private amountCalcTimer: any = null;

  private suppressCalc = false;
  private profitCalcTimer: any = null;
  private volumeCalcTimer: any = null;
  private pnlRefreshInterval: any = null;

  ngOnInit(): void {
    // this.loadSavedLoginIds();
    this.startPnLRefresh();
  }

  /**
   * Load saved login IDs from localStorage and auto-trigger upload
   */
  private loadSavedLoginIds(): void {
    try {
      const savedLoginIds = localStorage.getItem(this.LOGIN_IDS_STORAGE_KEY);
      if (savedLoginIds && savedLoginIds.trim()) {
        this.loginIdsInput.set(savedLoginIds);

        // Auto-trigger upload after a short delay to ensure component is ready
        setTimeout(() => {
          this.onUploadClients();
        }, 500);
      }
    } catch (error) {
      console.error('Error loading saved login IDs:', error);
    }
  }

  /**
   * Save login IDs to localStorage
   */
  private saveLoginIdsToStorage(): void {
    try {
      const loginIds = this.loginIdsInput().trim();
      if (loginIds) {
        localStorage.setItem(this.LOGIN_IDS_STORAGE_KEY, loginIds);
      } else {
        // Remove from storage if empty
        localStorage.removeItem(this.LOGIN_IDS_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving login IDs:', error);
    }
  }

  // --- NEW: handlers ---
  onAmountInput(value: any): void {
    this.amount.set(value ? +value : null);
    this.triggerAmountBasedCalc();
  }

  onPaymentCurrencyChange(value: string): void {
    this.paymentCurrency.set((value as 'USD' | 'EUR' | 'GBP') ?? 'USD');
    // Recalculate if we have an amount already
    if (this.amount()) this.triggerAmountBasedCalc();
  }

  // --- NEW: unified amount-based calculation ---
  private triggerAmountBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useAmount()) return;
    if (!this.hasValidClients()) return; // NEW: Check for valid clients
    if (!this.currentSymbol() || !this.amount() || !this.paymentCurrency())
      return;

    const isSmart = this.activeTab() === 'smartPL';

    const requestBody = {
      symbol: this.currentSymbol(), // e.g. "BINANCE:BTCUSDT" from chart
      paymentCurrency: this.paymentCurrency(), // "USD" | "EUR" | "GBP"
      amount: this.amount()!, // number
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
              // Reuse your existing applier to populate prices, volume, margin, PL, etc.
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

          // Auto-set open price when symbol changes for both tabs
          if (
            previousSymbol !== data.original_name &&
            typeof data.last_price === 'number'
          ) {
            this.openPrice.set(data.last_price);
          }
        }

        if (typeof data.last_price === 'number') {
          this.lastPrice.set(data.last_price);

          // Update if auto is on OR if price is empty/invalid
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

  private formatSymbolForTradingView(symbol: string): string {
    if (symbol.length >= 6 && symbol.endsWith('USDT')) {
      return `BINANCE:${symbol}`;
    }
    if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol)) {
      return `FX:${symbol}`;
    }
    return `NASDAQ:${symbol}`;
  }

  onTakeProfitInput(value: any): void {
    this.takeProfit.set(value ? +value : null);
    if (this.useTakeProfit()) {
      this.triggerProfitBasedCalcNewOrder();
    }
  }

  private triggerProfitBasedCalcNewOrder(): void {
    if (this.suppressCalc) return;
    if (!this.useTakeProfit()) return;
    if (!this.hasValidClients()) return; // NEW: Check for valid clients
    if (!this.currentSymbol() || !this.takeProfit()) {
      return;
    }

    const requestBody = {
      userIds: this.fetchedClients().map((c) => c.userId), // NEW: Use bulk API
      symbol: this.currentSymbol(),
      targetProfit: this.takeProfit()!,
      side: this.side(),
      volume: this.volume(), // Empty string as per your API
      leverage: this.leverage(),
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.calculatingFromProfit.set(true);

    this.profitCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromProfitBulk(requestBody) // NEW: Use bulk method
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
      // Apply volume
      if (typeof resp.volume === 'number') {
        this.volume.set(resp.volume);
      }

      // Apply entry price (open price)
      if (typeof resp.entryPrice === 'number') {
        this.openPrice.set(resp.entryPrice);
      }

      if (typeof resp.profitLoss === 'number') {
        this.profitLoss.set(resp.profitLoss);
      }

      // Apply side-specific prices
      if (this.side() === 1) {
        // Buy
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
        // Sell
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

  onAccountBalanceInput(value: any): void {
    this.accountBalance.set(value ? +value : null);
    if (this.activeTab() === 'newOrder') {
      this.triggerProfitBasedCalcNewOrder();
    } else {
      this.recalculateSmartPL('accountBalance');
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
    if (this.useLeverage()) {
      this.recalculateSmartPL('leverage');
    }
  }

  onSmartPLSideChange(side: number): void {
    this.smartPLSide.set(side);
    this.recalculateSmartPL('side');
  }

  onExpectedPLInput(value: any): void {
    this.targetProfit.set(value ? +value : null);
    if (this.useExpectedPL()) {
      this.triggerProfitBasedCalc();
    }
  }

  private recalculateSmartPL(
    source: 'symbol' | 'side' | 'accountBalance' | 'leverage'
  ): void {
    if (this.volume() && this.hasEntryExitPrices()) {
      this.triggerVolumeBasedCalc();
    } else if (this.targetProfit()) {
      this.triggerProfitBasedCalc();
    }
  }

  private triggerProfitBasedCalc(): void {
    if (this.suppressCalc) return;
    if (!this.useExpectedPL()) return;
    if (!this.hasValidClients()) return; // NEW: Check for valid clients

    if (!this.currentSymbol() || !this.targetProfit()) {
      return;
    }

    const requestBody = {
      userIds: this.fetchedClients().map((c) => c.userId), // NEW: Use bulk API
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
        .calculateFromProfitBulk(requestBody) // NEW: Use bulk method
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
    if (!this.hasValidClients()) return; // NEW: Check for valid clients

    if (!this.currentSymbol() || !this.volume()) {
      return;
    }

    const requestBody = {
      symbol: this.currentSymbol(),
      volume: this.volume()!,
      side: this.smartPLSide(),
      entryPrice: this.openPrice(), // Simplified
      exitPrice: this.closePrice(), // Simplified
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

  private getEntryExitPrices(): {
    entryPrice: number | null;
    exitPrice: number | null;
  } {
    return {
      entryPrice: this.openPrice(),
      exitPrice: this.closePrice(),
    };
  }

  private setEntryExitPrices(
    entryPrice?: number | null,
    exitPrice?: number | null
  ): void {
    if (entryPrice == null && exitPrice == null) return;
    if (entryPrice != null) this.openPrice.set(entryPrice);
    if (exitPrice != null) this.closePrice.set(exitPrice);
  }

  private applySmartPLCalculationResponse(
    resp: any,
    source: 'profit' | 'volume'
  ): void {
    if (!resp || typeof resp !== 'object') return;

    this.suppressCalc = true;
    try {
      // Apply volume
      if (typeof resp.volume === 'number') {
        this.volume.set(resp.volume);
      }

      // Apply expected profit
      if (typeof resp.expectedProfit === 'number') {
        this.targetProfit.set(resp.expectedProfit);
      }

      if (typeof resp.profitLoss === 'number') {
        this.profitLoss.set(resp.profitLoss);
      }

      // Apply prices - simplified to use entryPrice and exitPrice from API
      if (typeof resp.entryPrice === 'number') {
        this.openPrice.set(resp.entryPrice);
      }
      if (typeof resp.exitPrice === 'number') {
        this.closePrice.set(resp.exitPrice);
      }

      // Apply margins
      if (typeof resp.requiredMargin === 'number') {
        this.buyRequiredMargin.set(resp.requiredMargin);
        this.sellRequiredMargin.set(resp.requiredMargin);
      }

      // Apply commission and swap
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
    // NEW: First check if clients are uploaded
    if (!this.hasValidClients()) {
      return false;
    }

    if (this.activeTab() === 'newOrder') {
      return !!(
        this.loginIdsInput() &&
        this.currentSymbol() &&
        this.volume() &&
        this.openPrice() &&
        this.volume()! > 0 &&
        this.openPrice()! > 0
      );
    } else {
      // smartPL
      return !!(this.loginIdsInput() && this.currentSymbol() && this.volume());
    }
  }

  ngOnDestroy(): void {
    this.stopPnLRefresh();
    this.modalRef.close(true);

    this.destroy$.next();
    this.destroy$.complete();
  }

  private startPnLRefresh(): void {
    this.stopPnLRefresh(); // Clear any existing interval
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
    // NEW: Check if we have valid clients
    if (!this.hasValidClients()) {
      return;
    }

    // Only refresh if we have all required data
    const symbol = this.currentSymbol();
    const volume = this.volume();
    const openPrice = this.openPrice(); // Simplified
    const leverage =
      this.activeTab() === 'newOrder'
        ? this.leverage()
        : this.smartPLLeverage();
    const side =
      this.activeTab() === 'newOrder' ? this.side() : this.smartPLSide();
    const closePrice =
      this.activeTab() === 'newOrder' ? null : this.closePrice(); // Simplified

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
      userIds: this.fetchedClients().map((c) => c.userId), // NEW: Use bulk API
      symbol: symbol,
      side: side,
      volume: volume,
      openPrice: openPrice,
      closePrice: closePrice,
      leverage: leverage,
    };

    this.priceManagerService
      .calculatePnLBulk(requestBody) // NEW: Use bulk method
      .pipe(
        tap((resp: any) => {
          if (resp && typeof resp === 'object') {
            if (typeof resp.profitLoss === 'number') {
              this.profitLoss.set(resp.profitLoss);
            }
            // Update only margin and profitLoss
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
          // Silently fail in background refresh
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
    const loginIdsString = this.loginIdsInput().trim();
    if (!loginIdsString) {
      this.alertService.error('Please enter at least one login ID');
      return;
    }

    const loginIds = loginIdsString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (loginIds.length === 0) {
      this.alertService.error('Please enter at least one valid login ID');
      return;
    }

    // NEW: Check if clients are uploaded
    if (!this.hasValidClients()) {
      this.alertService.error('Please upload clients first');
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
      loginIds: this.fetchedClients().map((x) => x.userId),
      symbol: this.currentSymbol(),
      side: this.side(),
      volume: this.useVolume() ? this.volume()! : undefined,
      openPrice: this.openPrice()!,
      leverage: this.useLeverage() ? this.leverage() : undefined,
      stopLoss: this.stopLoss(),
      takeProfit: this.useTakeProfit() ? this.takeProfit() : undefined,
      autoPrice: this.autoPrice(),
      sellPL: this.sellPL(),
      buyPL: this.buyPL(),
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      comment: this.comment(),
      closeImmediately: false, // Added this
      paymentCurrency: this.paymentCurrency(),
      amount: this.useAmount() ? this.amount() : undefined,
    };

    this.priceManagerService
      .createBulkOrder(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.side() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(
            `${sideLabel} bulk order created successfully for ${loginIds.length} client(s)`
          );
          // this.modalRef.close(true);
        }),
        catchError((err: any) => {
          console.error('Error creating bulk order:', err);
          let errorMessage = 'Failed to create bulk order. Please try again.';
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
    const loginIdsString = this.loginIdsInput().trim();
    if (!loginIdsString) {
      this.alertService.error('Please enter at least one login ID');
      return;
    }

    const loginIds = loginIdsString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (loginIds.length === 0) {
      this.alertService.error('Please enter at least one valid login ID');
      return;
    }

    // NEW: Check if clients are uploaded
    if (!this.hasValidClients()) {
      this.alertService.error('Please upload clients first');
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

    // Simplified validation - just check openPrice and closePrice
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
      loginIds: this.fetchedClients().map((x) => x.userId),
      symbol: this.currentSymbol(),
      side: this.smartPLSide(),
      closeInterval: this.closeInterval(),
      volume: this.useVolume() ? this.volume()! : undefined,
      targetProfit: this.useExpectedPL() ? this.targetProfit()! : undefined,
      openPrice: this.openPrice()!, // Simplified
      closePrice: this.closePrice()!, // Simplified
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      autoOpenPrice: this.autoOpenPrice(),
      autoClosePrice: this.autoClosePrice(),
      closeImmediately: true,
      paymentCurrency: this.paymentCurrency(),
      amount: this.useAmount() ? this.amount() : undefined,
      leverage: this.useLeverage() ? this.smartPLLeverage() : undefined,
    };

    this.priceManagerService
      .createOrderWithSmartPL(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.smartPLSide() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(
            `${sideLabel} bulk order with Smart P/L created successfully for ${loginIds.length} client(s)`
          );
          // this.modalRef.close(true);
        }),
        catchError((err: any) => {
          console.error('Error creating bulk order:', err);
          let errorMessage = 'Failed to create bulk order. Please try again.';
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

  removeDuplicates(): void {
    const loginIdsString = this.loginIdsInput().trim();
    if (!loginIdsString) {
      this.alertService.error('Please enter login IDs first');
      return;
    }

    // Split by comma, trim, and filter out empty strings
    const loginIds = loginIdsString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (loginIds.length === 0) {
      this.alertService.error('No valid login IDs found');
      return;
    }

    // Remove duplicates using Set
    const uniqueLoginIds = Array.from(new Set(loginIds));

    // Check if there were duplicates
    const duplicatesRemoved = loginIds.length - uniqueLoginIds.length;

    // Update the input with unique IDs
    this.loginIdsInput.set(uniqueLoginIds.join(', '));

    // Save to localStorage after removing duplicates
    this.saveLoginIdsToStorage();

    if (duplicatesRemoved > 0) {
      this.alertService.success(
        `Removed ${duplicatesRemoved} duplicate ID(s). ${uniqueLoginIds.length} unique ID(s) remaining.`
      );
    } else {
      this.alertService.info('No duplicates found');
    }
  }

  onUploadClients(): void {
    const loginIdsString = this.loginIdsInput().trim();
    if (!loginIdsString) {
      this.alertService.error('Please enter at least one login ID');
      return;
    }

    // Save to localStorage before uploading
    this.saveLoginIdsToStorage();

    this.uploadingClients.set(true);
    this.fetchedClients.set([]);

    this.priceManagerService
      .getActiveClients(loginIdsString, 0, 1000)
      .pipe(
        tap((response: any) => {
          const clients = response?.data || response?.items || [];
          this.fetchedClients.set(clients);

          if (clients.length === 0) {
            this.alertService.warning(
              'No clients found for the provided login IDs'
            );
          } else {
            this.alertService.success(
              `Successfully fetched ${clients.length} client(s)`
            );
          }
        }),
        catchError((err: any) => {
          console.error('Error fetching clients:', err);
          let errorMessage = 'Failed to fetch clients. Please try again.';
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
        finalize(() => this.uploadingClients.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}
