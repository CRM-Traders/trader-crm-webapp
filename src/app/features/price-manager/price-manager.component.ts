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
import {
  ChartData,
  Client,
  PriceManagerService,
  TradingPair,
  ManipulatePriceRequest,
} from './services/price-manager.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';

// TradingView type declarations
declare global {
  interface Window {
    TradingView: typeof TradingView;
  }
}

declare namespace TradingView {
  interface WidgetOptions {
    container_id: string;
    width?: string | number;
    height?: string | number;
    symbol?: string;
    interval?: string;
    timezone?: string;
    theme?: 'light' | 'dark';
    style?: string;
    locale?: string;
    toolbar_bg?: string;
    enable_publishing?: boolean;
    allow_symbol_change?: boolean;
    hide_top_toolbar?: boolean;
    hide_legend?: boolean;
    save_image?: boolean;
    studies?: string[];
    show_popup_button?: boolean;
    popup_width?: string;
    popup_height?: string;
    no_referral_id?: boolean;
    overrides?: Record<string, any>;
  }

  interface ChartWidget {
    remove(): void;
    chart(): {
      setResolution(resolution: string): void;
      setChartType(type: number): void;
      setSymbol(symbol: string, interval: string, callback: () => void): void;
    };
  }

  class widget implements ChartWidget {
    constructor(options: WidgetOptions);
    remove(): void;
    chart(): {
      setResolution(resolution: string): void;
      setChartType(type: number): void;
      setSymbol(symbol: string, interval: string, callback: () => void): void;
    };
  }
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdate: Date;
}

@Component({
  selector: 'app-price-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './price-manager.component.html',
  styleUrls: ['./price-manager.component.scss'],
})
export class PriceManagerComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

  private service = inject(PriceManagerService);
  private destroy$ = new Subject<void>();

  // Core state signals
  activeClients = signal<Client[]>([]);
  tradingPairs = signal<TradingPair[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  chartLoading = signal(false);
  manipulating = signal(false);

  // Selection state
  selectedClientId = signal('');
  selectedSymbol = signal('');
  selectedInterval = signal('1h');
  selectedChartType = signal('1');
  chartTheme = signal<'light' | 'dark'>('dark');
  tradingPairSearch = signal('');

  // Manipulation state
  manipulationPrice = signal<number | null>(null);
  forceManipulation = signal(false);
  manipulationCount = signal(0);

  // UI state
  isFullscreen = signal(false);
  lastPriceUpdate = signal<Date | null>(null);
  marketStatus = signal<'open' | 'closed'>('open');

  // Activity tracking
  recentActivity = signal<
    Array<{
      symbol: string;
      price: number;
      clientName: string;
      timestamp: Date;
      force: boolean;
    }>
  >([]);

  // Chart instance
  private widget: any = null;
  private chartData: ChartData[] = [];

  // Computed values
  selectedClient = computed(() => {
    const clientId = this.selectedClientId();
    return (
      this.activeClients().find((client) => client.id === clientId) || null
    );
  });

  canManipulatePrice = computed(() => {
    return (
      this.selectedClientId() &&
      this.selectedSymbol() &&
      this.manipulationPrice() !== null &&
      this.manipulationPrice()! > 0
    );
  });

  // Configuration arrays
  intervals = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
  ];

  chartTypes = [
    { value: '1', label: 'Candlestick' },
    { value: '0', label: 'Bar' },
    { value: '2', label: 'Line' },
    { value: '3', label: 'Area' },
    { value: '8', label: 'Heikin Ashi' },
    { value: '9', label: 'Hollow Candles' },
  ];

  ngOnInit(): void {
    this.loadTradingViewScript();
    this.loadInitialData();
    this.startMarketStatusUpdates();
  }

  ngAfterViewInit(): void {
    // Initialize chart after view is ready if we have the required data
    setTimeout(() => {
      if (this.selectedSymbol() && this.selectedClientId()) {
        this.initializeChart();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.widget) {
      this.widget.remove();
    }
  }

  private loadTradingViewScript(): void {
    if (typeof window.TradingView !== 'undefined') {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('TradingView script loaded successfully');
    };
    script.onerror = () => {
      this.error.set('Failed to load TradingView library');
    };
    document.head.appendChild(script);
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await Promise.all([this.loadActiveClients(), this.loadTradingPairs()]);
    } catch (err) {
      this.error.set(
        'Failed to load initial data. Please check your connection and try again.'
      );
      console.error('Error loading initial data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadActiveClients(): Promise<void> {
    try {
      const response: any = await this.service.getActiveClients().toPromise();
      if (response?.clients && Array.isArray(response.clients)) {
        this.activeClients.set(response.clients);
      } else {
        throw new Error('Invalid response format for active clients');
      }
    } catch (err) {
      console.error('Error loading active clients:', err);
      throw err;
    }
  }

  private async loadTradingPairs(): Promise<void> {
    try {
      const pairs: any = await this.service
        .tradingPairs(this.tradingPairSearch() || null)
        .toPromise();
      if (Array.isArray(pairs)) {
        this.tradingPairs.set(pairs);
      } else if (pairs?.data && Array.isArray(pairs.data)) {
        this.tradingPairs.set(pairs.data);
      } else {
        throw new Error('Invalid response format for trading pairs');
      }
    } catch (err) {
      console.error('Error loading trading pairs:', err);
      throw err;
    }
  }

  private async loadChartData(): Promise<void> {
    if (!this.selectedSymbol()) return;

    this.chartLoading.set(true);

    try {
      const data = await this.service
        .chartData(this.selectedSymbol(), this.selectedInterval(), 1000)
        .toPromise();

      if (data && Array.isArray(data)) {
        this.chartData = data.map((item: any) => ({
          time: item.openTime,
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
        }));

        this.lastPriceUpdate.set(new Date());
        this.initializeChart();
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      this.error.set('Failed to load chart data for ' + this.selectedSymbol());
    } finally {
      this.chartLoading.set(false);
    }
  }

  private initializeChart(): void {
    if (typeof window.TradingView === 'undefined' || !this.chartContainer) {
      console.warn(
        'TradingView library not loaded or chart container not available'
      );
      return;
    }

    // Remove existing widget
    if (this.widget) {
      this.widget.remove();
    }

    // For custom data integration, you'll need to use TradingView's Charting Library (paid)
    // or implement a custom chart solution. The free widget only works with TradingView's data.

    // Try to map your symbol to TradingView's available symbols
    const tvSymbol = this.mapToTradingViewSymbol(this.selectedSymbol());

    // Create new widget with enhanced configuration
    this.widget = new window.TradingView.widget({
      container_id: this.chartContainer.nativeElement.id,
      width: '100%',
      height: this.isFullscreen() ? window.innerHeight * 0.8 : 600,
      symbol: tvSymbol,
      interval: this.mapToTradingViewInterval(this.selectedInterval()),
      timezone: 'Etc/UTC',
      theme: this.chartTheme(),
      style: this.selectedChartType(),
      locale: 'en',
      toolbar_bg: this.chartTheme() === 'dark' ? '#1f2937' : '#f8fafc',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies',
      ],
      show_popup_button: true,
      popup_width: '1200',
      popup_height: '800',
      no_referral_id: true,
      overrides: {
        'paneProperties.background':
          this.chartTheme() === 'dark' ? '#1f2937' : '#ffffff',
        'paneProperties.vertGridProperties.color':
          this.chartTheme() === 'dark' ? '#374151' : '#e5e7eb',
        'paneProperties.horzGridProperties.color':
          this.chartTheme() === 'dark' ? '#374151' : '#e5e7eb',
      },
    });
  }

  private mapToTradingViewSymbol(symbol: string): string {
    // Map your custom symbols to TradingView symbols
    const symbolMap: { [key: string]: string } = {
      BTCUSDT: 'BINANCE:BTCUSDT',
      ETHUSDT: 'BINANCE:ETHUSDT',
      LTCBTC: 'BINANCE:LTCBTC',
      ADAUSDT: 'BINANCE:ADAUSDT',
      BNBUSDT: 'BINANCE:BNBUSDT',
      // Add more mappings as needed
    };

    return symbolMap[symbol] || `BINANCE:${symbol}`;
  }

  private mapToTradingViewInterval(interval: string): string {
    // Map your intervals to TradingView intervals
    const intervalMap: { [key: string]: string } = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': '1D',
      '1w': '1W',
    };

    return intervalMap[interval] || interval;
  }

  private startMarketStatusUpdates(): void {
    // Simulate market hours (simplified)
    interval(60000) // Check every minute
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const now = new Date();
        const hour = now.getUTCHours();
        // Simplified: consider market open 24/7 for crypto, 9-17 UTC for traditional markets
        this.marketStatus.set('open'); // For crypto markets
      });
  }

  async refreshData(): Promise<void> {
    await this.loadInitialData();
    if (this.selectedSymbol() && this.selectedClientId()) {
      await this.loadChartData();
    }
  }

  onClientChange(): void {
    console.log('Selected client changed:', this.selectedClientId());
    if (this.selectedSymbol()) {
      this.loadChartData();
    }
  }

  async onSearchChange(): Promise<void> {
    try {
      this.loading.set(true);
      await this.loadTradingPairs();
    } catch (err) {
      console.error('Error searching trading pairs:', err);
      this.error.set('Failed to search trading pairs');
    } finally {
      this.loading.set(false);
    }
  }

  onSymbolChange(): void {
    console.log('Selected symbol changed:', this.selectedSymbol());
    if (this.selectedClientId()) {
      this.loadChartData();
    }
  }

  onIntervalChange(): void {
    console.log('Interval changed:', this.selectedInterval());
    if (this.widget) {
      this.widget.chart().setResolution(this.selectedInterval());
    }
    if (this.selectedSymbol() && this.selectedClientId()) {
      this.loadChartData();
    }
  }

  onChartTypeChange(): void {
    console.log('Chart type changed:', this.selectedChartType());
    if (this.widget) {
      this.widget.chart().setChartType(parseInt(this.selectedChartType()));
    }
  }

  onThemeChange(): void {
    console.log('Theme changed:', this.chartTheme());
    if (this.selectedSymbol() && this.selectedClientId()) {
      this.initializeChart();
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);

    if (this.isFullscreen()) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }

    // Reinitialize chart with new dimensions
    setTimeout(() => {
      if (this.selectedSymbol() && this.selectedClientId()) {
        this.initializeChart();
      }
    }, 100);
  }

  async manipulatePrice(): Promise<void> {
    if (!this.canManipulatePrice()) {
      return;
    }

    this.manipulating.set(true);

    try {
      const request: ManipulatePriceRequest = {
        userId: this.selectedClientId(),
        symbol: this.selectedSymbol(),
        price: this.manipulationPrice()!,
        force: this.forceManipulation(),
      };

      const response = await this.service.manipulatePrice(request).toPromise();
      console.log('Price manipulation response:', response);

      // Add to activity log
      const activity = {
        symbol: this.selectedSymbol(),
        price: this.manipulationPrice()!,
        clientName: `${this.selectedClient()?.firstName} ${
          this.selectedClient()?.lastName
        }`,
        timestamp: new Date(),
        force: this.forceManipulation(),
      };

      this.recentActivity.update((activities) => [activity, ...activities]);
      this.manipulationCount.update((count) => count + 1);

      // Reload chart data to reflect changes
      await this.loadChartData();

      // Reset form
      this.manipulationPrice.set(null);
      this.forceManipulation.set(false);
    } catch (err) {
      console.error('Error manipulating price:', err);
      this.error.set('Failed to manipulate price. Please try again.');
    } finally {
      this.manipulating.set(false);
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }
}
