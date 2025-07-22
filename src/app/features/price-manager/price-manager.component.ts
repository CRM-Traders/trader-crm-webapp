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

// LightWeight Charts types
interface IChartApi {
  remove(): void;
  addCandlestickSeries(options?: any): ICandlestickSeriesApi;
  addLineSeries(options?: any): ILineSeriesApi;
  addAreaSeries(options?: any): IAreaSeriesApi;
  addBarSeries(options?: any): IBarSeriesApi;
  timeScale(): ITimeScaleApi;
  resize(width: number, height: number): void;
  applyOptions(options: any): void;
}

interface ICandlestickSeriesApi {
  setData(data: any[]): void;
  update(data: any): void;
  applyOptions(options: any): void;
}

interface ILineSeriesApi {
  setData(data: any[]): void;
  update(data: any): void;
  applyOptions(options: any): void;
}

interface IAreaSeriesApi {
  setData(data: any[]): void;
  update(data: any): void;
  applyOptions(options: any): void;
}

interface IBarSeriesApi {
  setData(data: any[]): void;
  update(data: any): void;
  applyOptions(options: any): void;
}

interface ITimeScaleApi {
  fitContent(): void;
  setVisibleRange(range: any): void;
}

// Global LightWeight Charts declaration
declare global {
  interface Window {
    LightweightCharts: {
      createChart: (container: HTMLElement, options?: any) => IChartApi;
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
  selectedChartType = signal('candlestick');
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

  // Chart instance and data
  private chart: IChartApi | null = null;
  private candlestickSeries: ICandlestickSeriesApi | null = null;
  private lineSeries: ILineSeriesApi | null = null;
  private areaSeries: IAreaSeriesApi | null = null;
  private barSeries: IBarSeriesApi | null = null;
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
    { value: 'candlestick', label: 'Candlestick' },
    { value: 'bar', label: 'Bar' },
    { value: 'line', label: 'Line' },
    { value: 'area', label: 'Area' },
  ];

  ngOnInit(): void {
    this.loadLightWeightChartsScript();
    this.loadInitialData();
    this.startMarketStatusUpdates();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.selectedSymbol() && this.selectedClientId()) {
        this.initializeChart();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.chart) {
      this.chart.remove();
    }
  }

  private loadLightWeightChartsScript(): void {
    if (typeof window.LightweightCharts !== 'undefined') {
      return;
    }

    const script = document.createElement('script');
    // script.src =
    //   'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
    script.async = true;
    script.onload = () => {
      console.log('LightWeight Charts script loaded successfully');
    };
    script.onerror = () => {
      this.error.set('Failed to load LightWeight Charts library');
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
    console.log(
      `Loading chart data for: ${this.selectedSymbol()} interval: ${this.selectedInterval()}`
    );

    try {
      const response: any = await this.service
        .chartData(this.selectedSymbol(), this.selectedInterval(), 500)
        .toPromise();

      console.log('Raw response received:', response);

      // Handle the response structure - data is wrapped in a 'data' property
      let dataArray: ChartData[] = response.data;

      console.log(`Raw chart data received: ${dataArray.length} items`);

      this.chartData = dataArray.map((item: any) => {
        // The 'time' field is already a Unix timestamp, use it directly
        return {
          time: item.time, // No conversion needed if already Unix timestamp
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
        };
      });

      this.lastPriceUpdate.set(new Date());
      this.updateChartData();
    } catch (err) {
      console.error('Error loading chart data:', err);
      this.error.set('Failed to load chart data for ' + this.selectedSymbol());
    } finally {
      this.chartLoading.set(false);
    }
  }

  private initializeChart(): void {
    if (
      typeof window.LightweightCharts === 'undefined' ||
      !this.chartContainer
    ) {
      console.warn(
        'LightWeight Charts library not loaded or chart container not available'
      );
      return;
    }

    // Remove existing chart
    if (this.chart) {
      this.chart.remove();
    }

    // Create chart options
    const chartOptions = {
      width: this.chartContainer.nativeElement.clientWidth,
      height: this.isFullscreen() ? window.innerHeight * 0.8 : 600,
      layout: {
        backgroundColor: this.chartTheme() === 'dark' ? '#1f2937' : '#ffffff',
        textColor: this.chartTheme() === 'dark' ? '#e5e7eb' : '#374151',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: {
          color: this.chartTheme() === 'dark' ? '#374151' : '#e5e7eb',
        },
        horzLines: {
          color: this.chartTheme() === 'dark' ? '#374151' : '#e5e7eb',
        },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: this.chartTheme() === 'dark' ? '#4b5563' : '#d1d5db',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: this.chartTheme() === 'dark' ? '#4b5563' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
      watermark: {
        color: this.chartTheme() === 'dark' ? '#374151' : '#e5e7eb',
        visible: true,
        text: this.selectedSymbol(),
        fontSize: 24,
        horzAlign: 'center',
        vertAlign: 'center',
      },
    };

    // Create new chart
    this.chart = window.LightweightCharts.createChart(
      this.chartContainer.nativeElement,
      chartOptions
    );

    // Create series based on selected chart type
    this.createSeries();

    // Load data if available
    if (this.chartData.length > 0) {
      this.updateChartData();
    }

    // Handle resize
    window.addEventListener('resize', this.handleChartResize.bind(this));
  }

  private createSeries(): void {
    if (!this.chart) return;

    // Clear existing series
    this.candlestickSeries = null;
    this.lineSeries = null;
    this.areaSeries = null;
    this.barSeries = null;

    const seriesOptions = {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#dc2626',
      borderUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      wickUpColor: '#16a34a',
    };

    const lineAreaOptions = {
      color: '#3b82f6',
      lineWidth: 2,
    };

    switch (this.selectedChartType()) {
      case 'candlestick':
        this.candlestickSeries = this.chart.addCandlestickSeries(seriesOptions);
        break;
      case 'bar':
        this.barSeries = this.chart.addBarSeries(seriesOptions);
        break;
      case 'line':
        this.lineSeries = this.chart.addLineSeries(lineAreaOptions);
        break;
      case 'area':
        this.areaSeries = this.chart.addAreaSeries({
          ...lineAreaOptions,
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0.1)',
        });
        break;
    }
  }

  private updateChartData(): void {
    if (!this.chart || this.chartData.length === 0) return;

    const activeSeries = this.getActiveSeries();
    if (!activeSeries) return;

    // Format data based on chart type
    let formattedData;
    if (
      this.selectedChartType() === 'line' ||
      this.selectedChartType() === 'area'
    ) {
      // For line and area charts, use close price
      formattedData = this.chartData.map((item) => ({
        time: item.time,
        value: item.close,
      }));
    } else {
      // For candlestick and bar charts, use OHLC data
      formattedData = this.chartData.map((item) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));
    }

    // Set data and fit content
    activeSeries.setData(formattedData);
    this.chart.timeScale().fitContent();
  }

  private getActiveSeries():
    | ICandlestickSeriesApi
    | ILineSeriesApi
    | IAreaSeriesApi
    | IBarSeriesApi
    | null {
    switch (this.selectedChartType()) {
      case 'candlestick':
        return this.candlestickSeries;
      case 'bar':
        return this.barSeries;
      case 'line':
        return this.lineSeries;
      case 'area':
        return this.areaSeries;
      default:
        return null;
    }
  }

  private handleChartResize(): void {
    if (this.chart && this.chartContainer) {
      const { clientWidth } = this.chartContainer.nativeElement;
      const height = this.isFullscreen() ? window.innerHeight * 0.8 : 600;
      this.chart.resize(clientWidth, height);
    }
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
    // Update watermark
    if (this.chart) {
      this.chart.applyOptions({
        watermark: {
          text: this.selectedSymbol(),
        },
      });
    }
  }

  onIntervalChange(): void {
    console.log('Interval changed:', this.selectedInterval());
    if (this.selectedSymbol() && this.selectedClientId()) {
      this.loadChartData();
    }
  }

  onChartTypeChange(): void {
    console.log('Chart type changed:', this.selectedChartType());
    this.createSeries();
    if (this.chartData.length > 0) {
      this.updateChartData();
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

    // Resize chart with new dimensions
    setTimeout(() => {
      this.handleChartResize();
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
