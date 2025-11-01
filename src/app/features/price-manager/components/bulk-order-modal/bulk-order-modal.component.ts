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
  accountBalance = signal<number | null>(null);
  buyOpenPrice = signal<number | null>(null);
  buyClosePrice = signal<number | null>(null);
  sellOpenPrice = signal<number | null>(null);
  sellClosePrice = signal<number | null>(null);
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
  autoSellPrice = signal<boolean>(false);
  autoBuyPrice = signal<boolean>(false);
  updatingSellPrice = signal<boolean>(false);
  updatingBuyPrice = signal<boolean>(false);

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

  private suppressCalc = false;
  private profitCalcTimer: any = null;
  private volumeCalcTimer: any = null;

  ngOnInit(): void {
    this.loadSavedLoginIds();
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
      tradingAccountId: null, // Empty string as per your API
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
            this.alertService.error(err.error.error);

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

    const requestBody = {
      symbol: this.currentSymbol(),
      volume: this.volume()!,
      side: this.smartPLSide(),
      entryPrice: entryPrice,
      exitPrice: exitPrice,
      leverage: this.smartPLLeverage(),
      tradingAccountId: null, // Empty string as per your API
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

  private setEntryExitPrices(
    entryPrice?: number | null,
    exitPrice?: number | null
  ): void {
    if (entryPrice == null && exitPrice == null) return;
    if (this.smartPLSide() === 1) {
      if (entryPrice != null) this.buyOpenPrice.set(entryPrice);
      if (exitPrice != null) this.buyClosePrice.set(exitPrice);
    } else {
      if (entryPrice != null) this.sellOpenPrice.set(entryPrice);
      if (exitPrice != null) this.sellClosePrice.set(exitPrice);
    }
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

      // Apply prices
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

  updateSellOpenPrice(): void {
    if (!this.currentSymbol() || !this.sellOpenPrice()) {
      this.alertService.error('Symbol and sell open price are required');
      return;
    }

    this.updatingSellPrice.set(true);

    const requestBody = {
      symbol: this.currentSymbol(),
      newPrice: this.sellOpenPrice()!,
      userId: null,
      updateGlobal: false,
    };

    this.priceManagerService
      .updatePrice(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success('Sell price updated successfully');
        }),
        catchError((err: any) => {
          console.error('Error updating sell price:', err);
          let errorMessage = 'Failed to update sell price. Please try again.';
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
        finalize(() => this.updatingSellPrice.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  updateBuyOpenPrice(): void {
    if (!this.currentSymbol()) {
      this.alertService.error('Symbol and buy open price are required');
      return;
    }

    this.buyOpenPrice.set(this.lastPrice());
  }

  isFormValid(): boolean {
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
      closeImmediately: false, // Added this
    };

    this.priceManagerService
      .createBulkOrder(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.side() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(
            `${sideLabel} bulk order created successfully for ${loginIds.length} client(s)`
          );
          this.modalRef.close(true);
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

    if (!this.currentSymbol()) {
      this.alertService.error('Please wait for symbol data from chart');
      return;
    }

    if (!this.volume() || this.volume()! <= 0) {
      this.alertService.error('Please enter a valid volume');
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
      loginIds: this.fetchedClients().map((x) => x.userId),
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
      autoSellPrice: this.autoSellPrice(),
      autoBuyPrice: this.autoBuyPrice(),
      closeImmediately: true,
    };

    this.priceManagerService
      .createOrderWithSmartPL(requestBody)
      .pipe(
        tap(() => {
          const sideLabel = this.smartPLSide() === 1 ? 'Buy' : 'Sell';
          this.alertService.success(
            `${sideLabel} bulk order with Smart P/L created successfully for ${loginIds.length} client(s)`
          );
          this.modalRef.close(true);
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
