import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  PriceManagerService,
  Client,
  BulkOrderRequest,
} from '../../services/price-manager.service';
import { AlertService } from '../../../../core/services/alert.service';
import {
  TradingSymbolsService,
  TradingSymbol,
} from '../../services/trading-symbols.service';
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
  @ViewChild(TradingViewChartComponent)
  tradingViewChart!: TradingViewChartComponent;
  @ViewChild('symbolDropdownRoot') symbolDropdownRoot?: ElementRef<HTMLElement>;
  @ViewChild('smartPLSymbolDropdownRoot')
  smartPLSymbolDropdownRoot?: ElementRef<HTMLElement>;

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private symbolsService = inject(TradingSymbolsService);
  private destroy$ = new Subject<void>();

  // Tab state
  activeTab = signal<'newOrder' | 'smartPL'>('newOrder');

  // Form fields - New Order
  loginIdsInput = signal<string>('');
  symbol = signal<string>('');
  side = signal<number>(1); // Default to Buy
  volume = signal<number | null>(null);
  leverage = signal<number>(1);
  
  // New fields for updated order form
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

  // Form fields - Smart P/L (volume is shared with New Order form)
  smartPLSymbol = signal<string>('');
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
  
  // New Smart P/L fields
  openTime = signal<string>('');
  closeHours = signal<number | null>(null);
  closeMinutes = signal<number | null>(null);
  closeSeconds = signal<number | null>(null);
  closeInterval = signal<boolean>(false);
  expectedPL = signal<number | null>(null);
  autoSellPrice = signal<boolean>(false);
  autoBuyPrice = signal<boolean>(false);
  updatingSellPrice = signal<boolean>(false);
  updatingBuyPrice = signal<boolean>(false);

  submitting = signal<boolean>(false);
  uploadingClients = signal<boolean>(false);
  fetchedClients = signal<Client[]>([]);

  // Live prices from TradingView
  lastPrice = signal<number | null>(null);
  bidPrice = signal<number | null>(null);
  askPrice = signal<number | null>(null);

  // Symbols
  loadingSymbols = signal<boolean>(false);
  tradingSymbols = signal<TradingSymbol[]>([]);
  filteredSymbols = signal<TradingSymbol[]>([]);
  symbolSearchTerm = signal<string>('');
  showSymbolDropdown = signal<boolean>(false);

  smartPLSymbolSearchTerm = signal<string>('');
  filteredSmartPLSymbols = signal<TradingSymbol[]>([]);
  showSmartPLSymbolDropdown = signal<boolean>(false);

  // Available options
  sideOptions = [
    { value: 1, label: 'Buy', class: 'text-green-600 dark:text-green-400' },
    { value: 2, label: 'Sell', class: 'text-red-600 dark:text-red-400' },
  ];

  // Internal control to prevent feedback loops and throttle requests
  private suppressCalc = false;
  private profitCalcTimer: any = null;
  private volumeCalcTimer: any = null;

  ngOnInit(): void {
    // Fetch available trading symbols
    this.loadTradingSymbols();
  }

  loadTradingSymbols(): void {
    this.loadingSymbols.set(true);

    this.symbolsService
      .getTradingSymbols()
      .pipe(
        tap((symbols: TradingSymbol[]) => {
          this.tradingSymbols.set(symbols || []);
          this.filteredSymbols.set(symbols || []);
          this.filteredSmartPLSymbols.set(symbols || []);
        }),
        catchError((err: any) => {
          console.error('Error loading trading symbols:', err);
          this.alertService.error('Failed to load trading symbols');
          return [];
        }),
        finalize(() => this.loadingSymbols.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  switchTab(tab: 'newOrder' | 'smartPL'): void {
    this.activeTab.set(tab);
  }

  onSymbolSearch(searchTerm: string): void {
    this.symbolSearchTerm.set(searchTerm);

    if (!searchTerm || searchTerm.trim().length === 0) {
      this.filteredSymbols.set(this.tradingSymbols());
      return;
    }

    const normalizedSearch = searchTerm.toUpperCase().trim();
    const filtered = this.tradingSymbols().filter(
      (symbol) =>
        symbol.symbol.toUpperCase().includes(normalizedSearch) ||
        symbol.baseAsset.toUpperCase().includes(normalizedSearch) ||
        symbol.quoteAsset.toUpperCase().includes(normalizedSearch)
    );

    this.filteredSymbols.set(filtered);
  }

  onSymbolChange(symbolValue: string): void {
    this.symbol.set(symbolValue);

    // Update chart symbol if TradingView component is available
    if (this.tradingViewChart && symbolValue) {
      const tradingViewSymbol = this.formatSymbolForTradingView(symbolValue);
      this.tradingViewChart.updateSymbol(tradingViewSymbol);
    }
  }

  toggleSymbolDropdown(): void {
    this.showSymbolDropdown.update((value) => !value);
    if (!this.showSymbolDropdown()) {
      this.symbolSearchTerm.set('');
      this.filteredSymbols.set(this.tradingSymbols());
    }
  }

  onSymbolBlur(): void {
    setTimeout(() => {
      this.showSymbolDropdown.set(false);
      this.symbolSearchTerm.set('');
      this.filteredSymbols.set(this.tradingSymbols());
    }, 200);
  }

  selectSymbol(symbol: TradingSymbol): void {
    this.symbol.set(symbol.symbol);
    this.symbolSearchTerm.set('');
    this.filteredSymbols.set(this.tradingSymbols());
    this.showSymbolDropdown.set(false);

    if (this.tradingViewChart) {
      const tradingViewSymbol = this.formatSymbolForTradingView(symbol.symbol);
      this.tradingViewChart.updateSymbol(tradingViewSymbol);
    }
  }

  onSmartPLSymbolSearch(searchTerm: string): void {
    this.smartPLSymbolSearchTerm.set(searchTerm);

    if (!searchTerm || searchTerm.trim().length === 0) {
      this.filteredSmartPLSymbols.set(this.tradingSymbols());
      return;
    }

    const normalizedSearch = searchTerm.toUpperCase().trim();
    const filtered = this.tradingSymbols().filter(
      (symbol) =>
        symbol.symbol.toUpperCase().includes(normalizedSearch) ||
        symbol.baseAsset.toUpperCase().includes(normalizedSearch) ||
        symbol.quoteAsset.toUpperCase().includes(normalizedSearch)
    );

    this.filteredSmartPLSymbols.set(filtered);
  }

  toggleSmartPLSymbolDropdown(): void {
    this.showSmartPLSymbolDropdown.update((value) => !value);
    if (!this.showSmartPLSymbolDropdown()) {
      this.smartPLSymbolSearchTerm.set('');
      this.filteredSmartPLSymbols.set(this.tradingSymbols());
    }
  }

  selectSmartPLSymbol(symbol: TradingSymbol): void {
    this.smartPLSymbol.set(symbol.symbol);
    this.smartPLSymbolSearchTerm.set('');
    this.filteredSmartPLSymbols.set(this.tradingSymbols());
    this.showSmartPLSymbolDropdown.set(false);

    if (this.tradingViewChart) {
      const tradingViewSymbol = this.formatSymbolForTradingView(symbol.symbol);
      this.tradingViewChart.updateSymbol(tradingViewSymbol);
    }

    // Recalculate when symbol changes via dropdown
    this.recalculateSmartPL('symbol');
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) return;

    // Close main symbol dropdown when clicking outside
    if (this.showSymbolDropdown()) {
      const rootEl = this.symbolDropdownRoot?.nativeElement;
      if (rootEl && !rootEl.contains(target)) {
        this.showSymbolDropdown.set(false);
        this.symbolSearchTerm.set('');
        this.filteredSymbols.set(this.tradingSymbols());
      }
    }

    // Close Smart P/L symbol dropdown when clicking outside
    if (this.showSmartPLSymbolDropdown()) {
      const rootEl = this.smartPLSymbolDropdownRoot?.nativeElement;
      if (rootEl && !rootEl.contains(target)) {
        this.showSmartPLSymbolDropdown.set(false);
        this.smartPLSymbolSearchTerm.set('');
        this.filteredSmartPLSymbols.set(this.tradingSymbols());
      }
    }
  }

  // Handle events emitted by the TradingView chart
  onChartEvent(event: any): void {
    try {
      if (!event) return;
      if (event.name === 'quoteUpdate' && event.data) {
        const data = event.data as any;

        const currentShort = this.symbol() || this.smartPLSymbol();
        const matchesSymbol =
          !currentShort ||
          data?.short_name === currentShort ||
          data?.original_name?.includes(currentShort);

        if (!matchesSymbol) {
          return;
        }

        if (typeof data.last_price === 'number') {
          this.lastPrice.set(data.last_price);
          if (
            this.activeTab() === 'newOrder' &&
            (!this.openPrice() || (typeof this.openPrice() === 'number' && this.openPrice()! <= 0))
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
    } catch {
      // ignore parse/shape errors
    }
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

  // ================= Smart P/L Live Calculations =================
  onVolumeInput(value: any): void {
    this.volume.set(value ? +value : null);
    this.triggerVolumeBasedCalc();
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

  onSellClosePriceInput(value: any): void {
    this.sellClosePrice.set(value ? +value : null);
    this.triggerVolumeBasedCalc();
  }

  onSmartPLSideChange(side: number): void {
    this.smartPLSide.set(side);
    this.recalculateSmartPL('side');
  }

  private recalculateSmartPL(source: 'symbol' | 'side' | 'accountBalance' | 'leverage'): void {
    if (this.volume() && this.hasEntryExitPrices()) {
      this.triggerVolumeBasedCalc();
    } else if (this.targetProfit()) {
      this.triggerProfitBasedCalc();
    }
  }

  private triggerProfitBasedCalc(): void {
    if (this.suppressCalc) return;

    if (!this.smartPLSymbol() || !this.targetProfit() || !this.accountBalance()) {
      return;
    }

    const requestBody = {
      symbol: this.smartPLSymbol(),
      targetProfit: this.targetProfit()!,
      accountBalance: this.accountBalance()!,
      side: this.smartPLSide(),
      leverage: this.smartPLLeverage(),
      tradingAccountId: '',
    };

    if (this.profitCalcTimer) clearTimeout(this.profitCalcTimer);
    this.profitCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromProfit(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applySmartPLCalculationResponse(resp, 'profit');
          }),
          catchError(() => [])
        )
        .subscribe();
    }, 300);
  }

  private triggerVolumeBasedCalc(): void {
    if (this.suppressCalc) return;

    if (!this.smartPLSymbol() || !this.volume()) {
      return;
    }

    const { entryPrice, exitPrice } = this.getEntryExitPrices();
    if (entryPrice == null || exitPrice == null) {
      return;
    }

    const requestBody = {
      symbol: this.smartPLSymbol(),
      volume: this.volume()!,
      accountBalance: this.accountBalance()!,
      side: this.smartPLSide(),
      entryPrice: entryPrice!,
      exitPrice: exitPrice!,
      leverage: this.smartPLLeverage(),
      tradingAccountId: '',
    };

    if (this.volumeCalcTimer) clearTimeout(this.volumeCalcTimer);
    this.volumeCalcTimer = setTimeout(() => {
      this.priceManagerService
        .calculateFromVolume(requestBody)
        .pipe(
          tap((resp: any) => {
            this.applySmartPLCalculationResponse(resp, 'volume');
          }),
          catchError(() => [])
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

  private getEntryExitPrices(): { entryPrice: number | null; exitPrice: number | null } {
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

  private setEntryExitPrices(entryPrice?: number | null, exitPrice?: number | null): void {
    if (entryPrice == null && exitPrice == null) return;
    if (this.smartPLSide() === 1) {
      if (entryPrice != null) this.buyOpenPrice.set(entryPrice);
      if (exitPrice != null) this.buyClosePrice.set(exitPrice);
    } else {
      if (entryPrice != null) this.sellOpenPrice.set(entryPrice);
      if (exitPrice != null) this.sellClosePrice.set(exitPrice);
    }
  }

  private applySmartPLCalculationResponse(resp: any, source: 'profit' | 'volume'): void {
    if (!resp || typeof resp !== 'object') return;
    this.suppressCalc = true;
    try {
      if (typeof resp.volume === 'number') {
        this.volume.set(resp.volume);
      }
      if (typeof resp.targetProfit === 'number') {
        this.targetProfit.set(resp.targetProfit);
      }
      const entry = typeof resp.entryPrice === 'number' ? resp.entryPrice : null;
      const exit = typeof resp.exitPrice === 'number' ? resp.exitPrice : null;
      this.setEntryExitPrices(entry, exit);
    } finally {
      setTimeout(() => (this.suppressCalc = false), 0);
    }
  }

  updatePrice(): void {
    if (!this.symbol() || !this.openPrice()) {
      this.alertService.error('Symbol and open price are required');
      return;
    }

    this.updatingPrice.set(true);

    const requestBody = {
      symbol: this.symbol(),
      newPrice: this.openPrice()!,
      userId: null,
      updateGlobal: false,
    };

    this.priceManagerService
      .updatePrice(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success('Price updated successfully');
        }),
        catchError((err: any) => {
          console.error('Error updating price:', err);
          let errorMessage = 'Failed to update price. Please try again.';
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
        finalize(() => this.updatingPrice.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  updateSellOpenPrice(): void {
    if (!this.smartPLSymbol() || !this.sellOpenPrice()) {
      this.alertService.error('Symbol and sell open price are required');
      return;
    }

    this.updatingSellPrice.set(true);

    const requestBody = {
      symbol: this.smartPLSymbol(),
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
    if (!this.smartPLSymbol() || !this.buyOpenPrice()) {
      this.alertService.error('Symbol and buy open price are required');
      return;
    }

    this.updatingBuyPrice.set(true);

    const requestBody = {
      symbol: this.smartPLSymbol(),
      newPrice: this.buyOpenPrice()!,
      userId: null,
      updateGlobal: false,
    };

    this.priceManagerService
      .updatePrice(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success('Buy price updated successfully');
        }),
        catchError((err: any) => {
          console.error('Error updating buy price:', err);
          let errorMessage = 'Failed to update buy price. Please try again.';
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
        finalize(() => this.updatingBuyPrice.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.activeTab() === 'newOrder') {
      this.submitNewOrder();
    } else {
      this.submitSmartPL();
    }
  }

  submitNewOrder(): void {
    // Parse login IDs from comma-separated string
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

    // Validate required fields
    if (!this.symbol()) {
      this.alertService.error('Please enter a symbol');
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
      loginIds: loginIds,
      symbol: this.symbol(),
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
    };

    this.priceManagerService
      .createBulkOrder(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success(
            `Bulk order created successfully for ${loginIds.length} client(s)`
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
        finalize(() => this.submitting.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  submitSmartPL(): void {
    // Parse login IDs from comma-separated string
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

    // Validate required fields
    if (!this.smartPLSymbol()) {
      this.alertService.error('Please enter a symbol');
      return;
    }
    if (!this.openTime()) {
      this.alertService.error('Please enter an open time');
      return;
    }
    if (!this.volume() || this.volume()! <= 0) {
      this.alertService.error('Please enter a valid volume');
      return;
    }
    if (!this.expectedPL() || this.expectedPL()! <= 0) {
      this.alertService.error('Please enter a valid expected P/L');
      return;
    }
    if (!this.sellOpenPrice() || this.sellOpenPrice()! <= 0) {
      this.alertService.error('Please enter a valid sell open price');
      return;
    }
    if (!this.sellClosePrice() || this.sellClosePrice()! <= 0) {
      this.alertService.error('Please enter a valid sell close price');
      return;
    }
    if (!this.buyOpenPrice() || this.buyOpenPrice()! <= 0) {
      this.alertService.error('Please enter a valid buy open price');
      return;
    }
    if (!this.buyClosePrice() || this.buyClosePrice()! <= 0) {
      this.alertService.error('Please enter a valid buy close price');
      return;
    }
    if (this.commission() === null || this.commission()! < 0) {
      this.alertService.error('Please enter a valid commission');
      return;
    }
    if (this.swap() === null || this.swap()! < 0) {
      this.alertService.error('Please enter valid swaps');
      return;
    }

    this.submitting.set(true);

    // Calculate close time based on hours, minutes, seconds
    const closeTimeInSeconds = (this.closeHours() || 0) * 3600 + 
                               (this.closeMinutes() || 0) * 60 + 
                               (this.closeSeconds() || 0);

    const requestBody: any = {
      loginIds: loginIds,
      symbol: this.smartPLSymbol(),
      side: this.smartPLSide(),
      openTime: this.openTime(),
      closeTime: closeTimeInSeconds,
      closeInterval: this.closeInterval(),
      volume: this.volume()!,
      expectedPL: this.expectedPL()!,
      sellOpenPrice: this.sellOpenPrice()!,
      sellClosePrice: this.sellClosePrice()!,
      buyOpenPrice: this.buyOpenPrice()!,
      buyClosePrice: this.buyClosePrice()!,
      commission: this.commission()!,
      swap: this.swap()!,
      sellRequiredMargin: this.sellRequiredMargin(),
      buyRequiredMargin: this.buyRequiredMargin(),
      autoSellPrice: this.autoSellPrice(),
      autoBuyPrice: this.autoBuyPrice(),
    };

    this.priceManagerService
      .createBulkOrder(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success(
            `Bulk order with Smart P/L created successfully for ${loginIds.length} client(s)`
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
        finalize(() => this.submitting.set(false)),
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

  onUploadClients(): void {
    const loginIdsString = this.loginIdsInput().trim();
    if (!loginIdsString) {
      this.alertService.error('Please enter at least one login ID');
      return;
    }

    this.uploadingClients.set(true);
    this.fetchedClients.set([]);

    this.priceManagerService
      .getActiveClients(loginIdsString, 0, 1000)
      .pipe(
        tap((response: any) => {
          const clients = response?.data || response?.items || [];
          this.fetchedClients.set(clients);
          
          if (clients.length === 0) {
            this.alertService.warning('No clients found for the provided login IDs');
          } else {
            this.alertService.success(`Successfully fetched ${clients.length} client(s)`);
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
