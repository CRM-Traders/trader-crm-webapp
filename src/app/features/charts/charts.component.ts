import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { ThemeService } from '../../core/services/theme.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketData, Position } from './models/chart.model';

// declare global {
//   interface Window {
//     TradingView: any;
//   }
// }

@Component({
  selector: 'app-charts',
  imports: [CommonModule, FormsModule],
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss',
})
export class ChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
  @ViewChild('symbolOverview', { static: false }) symbolOverview!: ElementRef;
  @ViewChild('technicalAnalysis', { static: false })
  technicalAnalysis!: ElementRef;
  @ViewChild('marketOverview', { static: false }) marketOverview!: ElementRef;
  @ViewChild('tickerTape', { static: false }) tickerTape!: ElementRef;
  @ViewChild('economicCalendar', { static: false })
  economicCalendar!: ElementRef;
  @ViewChild('forexCrossRates', { static: false })
  forexCrossRates!: ElementRef;
  @ViewChild('cryptoMarket', { static: false }) cryptoMarket!: ElementRef;
  @ViewChild('screener', { static: false }) screener!: ElementRef;

  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  selectedSymbol = signal<string>('BTCUSD');
  selectedInterval = signal<string>('60');
  selectedChartType = signal<string>('1');
  isFullscreen = signal<boolean>(false);
  activeWidget = signal<string>('chart');
  showOrderPanel = signal<boolean>(false);

  // Market data
  marketData = signal<MarketData[]>([]);
  positions = signal<Position[]>([]);

  // Order form
  orderType = signal<'market' | 'limit' | 'stop'>('market');
  orderSide = signal<'buy' | 'sell'>('buy');
  orderQuantity = signal<number>(0);
  orderPrice = signal<number>(0);
  stopLoss = signal<number>(0);
  takeProfit = signal<number>(0);

  // Computed values
  totalPnL = computed(() => {
    return this.positions().reduce((sum, pos) => sum + pos.pnl, 0);
  });

  totalPnLPercent = computed(() => {
    const positions = this.positions();
    if (positions.length === 0) return 0;
    const totalInvested = positions.reduce(
      (sum, pos) => sum + pos.entryPrice * pos.quantity,
      0
    );
    return totalInvested > 0 ? (this.totalPnL() / totalInvested) * 100 : 0;
  });

  // Available symbols
  symbols = [
    { value: 'BTCUSD', label: 'Bitcoin / USD', type: 'crypto' },
    { value: 'ETHUSD', label: 'Ethereum / USD', type: 'crypto' },
    { value: 'EURUSD', label: 'EUR / USD', type: 'forex' },
    { value: 'GBPUSD', label: 'GBP / USD', type: 'forex' },
    { value: 'AAPL', label: 'Apple Inc.', type: 'stock' },
    { value: 'GOOGL', label: 'Alphabet Inc.', type: 'stock' },
    { value: 'TSLA', label: 'Tesla Inc.', type: 'stock' },
    { value: 'AMZN', label: 'Amazon.com Inc.', type: 'stock' },
  ];

  // Time intervals
  intervals = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '30', label: '30m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: 'D', label: '1D' },
    { value: 'W', label: '1W' },
  ];

  // Chart types
  chartTypes = [
    { value: '1', label: 'Candlestick' },
    { value: '0', label: 'Bar' },
    { value: '2', label: 'Line' },
    { value: '3', label: 'Area' },
    { value: '8', label: 'Heikin Ashi' },
    { value: '9', label: 'Hollow Candles' },
    { value: '10', label: 'Baseline' },
  ];

  private tvWidget: any;
  private symbolOverviewWidget: any;
  private technicalAnalysisWidget: any;
  private marketOverviewWidget: any;
  private tickerTapeWidget: any;
  private economicCalendarWidget: any;
  private forexCrossRatesWidget: any;
  private cryptoMarketWidget: any;
  private screenerWidget: any;

  ngOnInit(): void {
    this.loadTradingViewLibrary();
    this.initializeWebSocket();
    this.loadMockPositions();
    this.startMarketDataUpdates();
  }

  ngAfterViewInit(): void {
    // Initialize widgets after view is ready
    setTimeout(() => {
      this.initializeAllWidgets();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up widgets
    if (this.tvWidget) {
      this.tvWidget.remove();
    }

    // Disconnect WebSocket
    this.socketService.disconnect('trading-live');
  }

  private loadTradingViewLibrary(): void {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {};
    document.head.appendChild(script);

    // Load additional widget scripts
    const widgetScript = document.createElement('script');
    widgetScript.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    widgetScript.async = true;
    document.head.appendChild(widgetScript);
  }

  private initializeAllWidgets(): void {
    this.initializeChart();
    this.initializeSymbolOverview();
    this.initializeTechnicalAnalysis();
    this.initializeMarketOverview();
    this.initializeTickerTape();
    this.initializeEconomicCalendar();
    this.initializeForexCrossRates();
    this.initializeCryptoMarket();
    this.initializeScreener();
  }

  private initializeChart(): void {
    if (!window.TradingView || !this.chartContainer) return;

    this.tvWidget = new window.TradingView.widget({
      autosize: true,
      symbol: this.selectedSymbol(),
      interval: this.selectedInterval(),
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: this.selectedChartType(),
      locale: 'en',
      toolbar_bg: '#1f2937',
      enable_publishing: false,
      allow_symbol_change: true,
      container_id: this.chartContainer.nativeElement.id,
      hide_side_toolbar: false,
      studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      support_host: 'https://www.tradingview.com',
    });
  }

  private initializeSymbolOverview(): void {
    if (!this.symbolOverview) return;

    const container = this.symbolOverview.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[this.selectedSymbol()]],
      chartOnly: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: 'dark',
      autosize: true,
      showVolume: true,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      fontSize: '10',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      lineColor: 'rgba(41, 98, 255, 1)',
      topColor: 'rgba(41, 98, 255, 0.3)',
      bottomColor: 'rgba(41, 98, 255, 0)',
    });

    container.appendChild(script);
  }

  private initializeTechnicalAnalysis(): void {
    if (!this.technicalAnalysis) return;

    const container = this.technicalAnalysis.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '1h',
      width: '100%',
      height: '100%',
      isTransparent: false,
      symbol: this.selectedSymbol(),
      showIntervalTabs: true,
      locale: 'en',
      colorTheme: 'dark',
    });

    container.appendChild(script);
  }

  private initializeMarketOverview(): void {
    if (!this.marketOverview) return;

    const container = this.marketOverview.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '12M',
      showChart: true,
      locale: 'en',
      width: '100%',
      height: '100%',
      largeChartUrl: '',
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      plotLineColorGrowing: 'rgba(41, 98, 255, 1)',
      plotLineColorFalling: 'rgba(41, 98, 255, 1)',
      gridLineColor: 'rgba(240, 243, 250, 0)',
      scaleFontColor: 'rgba(106, 109, 120, 1)',
      belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)',
      belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
      belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
      belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
      symbolActiveColor: 'rgba(41, 98, 255, 0.12)',
      tabs: [
        {
          title: 'Forex',
          symbols: [
            { s: 'FX:EURUSD', d: 'EUR/USD' },
            { s: 'FX:GBPUSD', d: 'GBP/USD' },
            { s: 'FX:USDJPY', d: 'USD/JPY' },
            { s: 'FX:USDCHF', d: 'USD/CHF' },
            { s: 'FX:AUDUSD', d: 'AUD/USD' },
            { s: 'FX:USDCAD', d: 'USD/CAD' },
          ],
          originalTitle: 'Forex',
        },
        {
          title: 'Crypto',
          symbols: [
            { s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' },
            { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' },
            { s: 'BINANCE:BNBUSDT', d: 'Binance Coin' },
            { s: 'BINANCE:XRPUSDT', d: 'XRP' },
            { s: 'BINANCE:ADAUSDT', d: 'Cardano' },
            { s: 'BINANCE:SOLUSDT', d: 'Solana' },
          ],
          originalTitle: 'Crypto',
        },
      ],
    });

    container.appendChild(script);
  }

  private initializeTickerTape(): void {
    if (!this.tickerTape) return;

    const container = this.tickerTape.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD', title: 'US 100' },
        { proName: 'FX_IDC:EURUSD', title: 'EUR/USD' },
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum' },
      ],
      showSymbolLogo: true,
      colorTheme: 'dark',
      isTransparent: false,
      displayMode: 'adaptive',
      locale: 'en',
    });

    container.appendChild(script);
  }

  private initializeEconomicCalendar(): void {
    if (!this.economicCalendar) return;

    const container = this.economicCalendar.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      importanceFilter: '0,1',
      currencyFilter:
        'USD,EUR,GBP,JPY,AUD,CAD,CHF,CNY,NZD,SEK,NOK,DKK,SGD,HKD,KRW,TRY,INR,MXN,ZAR,BRL',
    });

    container.appendChild(script);
  }

  private initializeForexCrossRates(): void {
    if (!this.forexCrossRates) return;

    const container = this.forexCrossRates.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-forex-cross-rates.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: '100%',
      currencies: ['EUR', 'USD', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'],
      isTransparent: false,
      colorTheme: 'dark',
      locale: 'en',
    });

    container.appendChild(script);
  }

  private initializeCryptoMarket(): void {
    if (!this.cryptoMarket) return;

    const container = this.cryptoMarket.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      dataSource: 'Crypto',
      width: '100%',
      height: '100%',
      symbolsGroups: [
        {
          name: 'Cryptocurrencies',
          symbols: [
            { name: 'BINANCE:BTCUSDT', weight: 1 },
            { name: 'BINANCE:ETHUSDT', weight: 0.8 },
            { name: 'BINANCE:BNBUSDT', weight: 0.6 },
            { name: 'BINANCE:XRPUSDT', weight: 0.5 },
            { name: 'BINANCE:ADAUSDT', weight: 0.4 },
            { name: 'BINANCE:SOLUSDT', weight: 0.4 },
            { name: 'BINANCE:DOTUSDT', weight: 0.3 },
            { name: 'BINANCE:DOGEUSDT', weight: 0.3 },
            { name: 'BINANCE:AVAXUSDT', weight: 0.2 },
            { name: 'BINANCE:MATICUSDT', weight: 0.2 },
          ],
        },
      ],
      colorTheme: 'dark',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      locale: 'en',
    });

    container.appendChild(script);
  }

  private initializeScreener(): void {
    if (!this.screener) return;

    const container = this.screener.nativeElement;

    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: '100%',
      defaultColumn: 'overview',
      defaultScreen: 'general',
      market: 'forex',
      showToolbar: true,
      colorTheme: 'dark',
      locale: 'en',
    });

    container.appendChild(script);
  }

  private initializeWebSocket(): void {
    this.socketService
      .messagesOfType('trading-live', 'market-data')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.updateMarketData(data);
      });

    // Listen for position updates
    this.socketService
      .messagesOfType('trading-live', 'position-update')
      .pipe(takeUntil(this.destroy$))
      .subscribe((position) => {
        this.updatePosition(position);
      });
  }

  private subscribeToMarketData(): void {
    this.socketService.send('trading-live', {
      type: 'subscribe',
      payload: {
        symbols: this.symbols.map((s) => s.value),
        channels: ['price', 'volume', 'trades'],
      },
    });
  }

  private updateMarketData(data: any): void {
    const currentData = this.marketData();
    const index = currentData.findIndex((m) => m.symbol === data.symbol);

    if (index >= 0) {
      currentData[index] = { ...currentData[index], ...data };
      this.marketData.set([...currentData]);
    } else {
      this.marketData.set([...currentData, data]);
    }
  }

  private updatePosition(positionUpdate: any): void {
    const positions = this.positions();
    const index = positions.findIndex((p) => p.id === positionUpdate.id);

    if (index >= 0) {
      positions[index] = { ...positions[index], ...positionUpdate };
      this.positions.set([...positions]);
    }
  }

  private loadMockPositions(): void {
    this.positions.set([
      {
        id: '1',
        symbol: 'BTCUSD',
        side: 'buy',
        quantity: 0.5,
        entryPrice: 65000,
        currentPrice: 67500,
        pnl: 1250,
        pnlPercent: 3.85,
        stopLoss: 63000,
        takeProfit: 70000,
        openTime: new Date('2024-01-15T10:30:00'),
      },
      {
        id: '2',
        symbol: 'EURUSD',
        side: 'sell',
        quantity: 10000,
        entryPrice: 1.085,
        currentPrice: 1.082,
        pnl: 30,
        pnlPercent: 0.28,
        stopLoss: 1.09,
        takeProfit: 1.075,
        openTime: new Date('2024-01-15T14:45:00'),
      },
    ]);
  }

  private startMarketDataUpdates(): void {
    // Simulate market data updates
    interval(2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const positions = this.positions();
        const updatedPositions = positions.map((pos) => {
          const priceChange = (Math.random() - 0.5) * 0.002;
          const newPrice = pos.currentPrice * (1 + priceChange);
          const priceDiff = newPrice - pos.entryPrice;
          const pnl =
            pos.side === 'buy'
              ? priceDiff * pos.quantity
              : -priceDiff * pos.quantity;
          const pnlPercent = (pnl / (pos.entryPrice * pos.quantity)) * 100;

          return {
            ...pos,
            currentPrice: newPrice,
            pnl,
            pnlPercent,
          };
        });

        this.positions.set(updatedPositions);
      });
  }

  onSymbolChange(): void {
    if (this.tvWidget) {
      this.tvWidget.setSymbol(
        this.selectedSymbol(),
        this.selectedInterval(),
        () => {}
      );
    }
    this.initializeSymbolOverview();
    this.initializeTechnicalAnalysis();
  }

  onIntervalChange(): void {
    if (this.tvWidget) {
      this.tvWidget.chart().setResolution(this.selectedInterval());
    }
  }

  onChartTypeChange(): void {
    if (this.tvWidget) {
      this.tvWidget.chart().setChartType(parseInt(this.selectedChartType()));
    }
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);

    if (this.isFullscreen()) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  setActiveWidget(widget: string): void {
    this.activeWidget.set(widget);
  }

  toggleOrderPanel(): void {
    this.showOrderPanel.update((v) => !v);
  }

  closePosition(position: Position): void {
    this.socketService.send('trading-live', {
      type: 'close-position',
      payload: {
        positionId: position.id,
        symbol: position.symbol,
        quantity: position.quantity,
      },
    });

    // Remove from local state
    this.positions.update((positions) =>
      positions.filter((p) => p.id !== position.id)
    );
  }

  placeOrder(): void {
    const order = {
      symbol: this.selectedSymbol(),
      side: this.orderSide(),
      type: this.orderType(),
      quantity: this.orderQuantity(),
      price: this.orderType() === 'market' ? null : this.orderPrice(),
      stopLoss: this.stopLoss() || null,
      takeProfit: this.takeProfit() || null,
      timestamp: new Date(),
    };

    // Send order via WebSocket
    this.socketService.send('trading-live', {
      type: 'place-order',
      payload: order,
    });

    // Reset form
    this.orderQuantity.set(0);
    this.orderPrice.set(0);
    this.stopLoss.set(0);
    this.takeProfit.set(0);
    this.showOrderPanel.set(false);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
