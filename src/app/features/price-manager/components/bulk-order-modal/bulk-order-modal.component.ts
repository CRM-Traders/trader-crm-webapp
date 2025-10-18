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

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private symbolsService = inject(TradingSymbolsService);
  private destroy$ = new Subject<void>();

  // Form fields
  loginIdsInput = signal<string>('');
  symbol = signal<string>('');
  side = signal<number>(1); // Default to Buy
  targetProfit = signal<number | null>(null);
  volume = signal<number | null>(null);
  entryPrice = signal<number | null>(null);
  exitPrice = signal<number | null>(null);
  leverage = signal<number>(1);
  defaultAccountBalance = signal<number | null>(null);
  closeImmediately = signal<boolean>(false);

  submitting = signal<boolean>(false);

  // Symbols
  loadingSymbols = signal<boolean>(false);
  tradingSymbols = signal<TradingSymbol[]>([]);
  filteredSymbols = signal<TradingSymbol[]>([]);
  symbolSearchTerm = signal<string>('');
  showSymbolDropdown = signal<boolean>(false);

  // Available options
  sideOptions = [
    { value: 1, label: 'Buy', class: 'text-green-600 dark:text-green-400' },
    { value: 2, label: 'Sell', class: 'text-red-600 dark:text-red-400' },
  ];

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

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) return;

    // Close symbol dropdown when clicking outside
    if (this.showSymbolDropdown()) {
      const rootEl = this.symbolDropdownRoot?.nativeElement;
      if (rootEl && !rootEl.contains(target)) {
        this.showSymbolDropdown.set(false);
        this.symbolSearchTerm.set('');
        this.filteredSymbols.set(this.tradingSymbols());
      }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
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
    if (!this.targetProfit() || this.targetProfit()! <= 0) {
      this.alertService.error('Please enter a valid target profit');
      return;
    }
    if (!this.volume() || this.volume()! <= 0) {
      this.alertService.error('Please enter a valid volume');
      return;
    }
    if (!this.entryPrice() || this.entryPrice()! <= 0) {
      this.alertService.error('Please enter a valid entry price');
      return;
    }
    if (!this.exitPrice() || this.exitPrice()! <= 0) {
      this.alertService.error('Please enter a valid exit price');
      return;
    }
    if (!this.defaultAccountBalance() || this.defaultAccountBalance()! <= 0) {
      this.alertService.error('Please enter a valid default account balance');
      return;
    }
    if (this.leverage() < 1) {
      this.alertService.error('Leverage must be at least 1');
      return;
    }

    this.submitting.set(true);

    const requestBody: BulkOrderRequest = {
      loginIds: loginIds,
      symbol: this.symbol(),
      side: this.side(),
      targetProfit: this.targetProfit()!,
      volume: this.volume()!,
      entryPrice: this.entryPrice()!,
      exitPrice: this.exitPrice()!,
      leverage: this.leverage(),
      defaultAccountBalance: this.defaultAccountBalance()!,
      closeImmediately: this.closeImmediately(),
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
