import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../../../core/services/theme.service';

export interface TradingViewConfig {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  hideTopToolbar?: boolean;
  hideSideToolbar?: boolean;
  hideLegend?: boolean;
  hideVolume?: boolean;
  allowSymbolChange?: boolean;
  autosize?: boolean;
  studies?: string[];
  showDetails?: boolean;
  showCalendar?: boolean;
}

@Component({
  selector: 'app-trading-view-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trading-view-chart.component.html',
  styleUrls: ['./trading-view-chart.component.scss'],
})
export class TradingViewChartComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('chartContainer', { static: false })
  chartContainer!: ElementRef<HTMLDivElement>;

  @Input() symbol: string = 'BTCUSDT';
  @Input() interval: string = 'D';
  @Input() hideTopToolbar: boolean = false;
  @Input() hideSideToolbar: boolean = true;
  @Input() hideLegend: boolean = false;
  @Input() hideVolume: boolean = false;
  @Input() allowSymbolChange: boolean = true;
  @Input() autosize: boolean = true;
  @Input() studies: string[] = [];
  @Input() showDetails: boolean = false;
  @Input() showCalendar: boolean = false;

  @Output() parseEventData = new EventEmitter<any>();

  private themeService = inject(ThemeService);
  private scriptLoaded = signal<boolean>(false);
  private isDarkMode = signal<boolean>(false);
  private containerId = '';
  private destroy$ = new Subject<void>();
  private initializationTimeout: any;

  ngOnInit(): void {
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => {
        const themeChanged = this.isDarkMode() !== isDark;
        this.isDarkMode.set(isDark);
        if (themeChanged && this.scriptLoaded()) {
          this.updateChartTheme();
        }
      });
  }

  ngAfterViewInit(): void {
    // Use requestAnimationFrame to ensure DOM is fully ready
    this.initializationTimeout = requestAnimationFrame(() => {
      this.initializeChart();
    });

    window.addEventListener('message', this.onWindowMessage);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.initializationTimeout) {
      cancelAnimationFrame(this.initializationTimeout);
    }

    if (this.chartContainer?.nativeElement) {
      this.chartContainer.nativeElement.innerHTML = '';
    }

    window.removeEventListener('message', this.onWindowMessage);
  }

  private initializeChart(): void {
    if (!this.chartContainer?.nativeElement) {
      console.error('[TradingView] Chart container not found');
      return;
    }

    const container = this.chartContainer.nativeElement;

    // Clear container completely
    container.innerHTML = '';

    // Generate unique container ID
    this.containerId = `tradingview_${Date.now()}`;

    // Create the widget wrapper div
    const widgetDiv = document.createElement('div');
    widgetDiv.id = this.containerId;
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    // Prepare configuration
    const config: any = {
      symbol: this.symbol,
      interval: this.interval,
      theme: this.isDarkMode() ? 'dark' : 'light',
      hide_top_toolbar: this.hideTopToolbar,
      hide_side_toolbar: this.hideSideToolbar,
      hide_legend: this.hideLegend,
      hide_volume: this.hideVolume,
      allow_symbol_change: this.allowSymbolChange,
      autosize: this.autosize,
      studies: this.studies,
      details: this.showDetails,
      calendar: this.showCalendar,
      locale: 'en',
      timezone: 'Etc/UTC',
      save_image: true,
      style: '1',
      backgroundColor: this.isDarkMode() ? '#394d6e' : '#ffffff',
      gridColor: this.isDarkMode()
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(46, 46, 46, 0.06)',
      container_id: this.containerId,
    };

    // Create script element with configuration
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;

    // CRITICAL: Use textContent for script content, NOT innerHTML
    script.textContent = JSON.stringify(config);

    // Append widget div first, then script
    container.appendChild(widgetDiv);
    container.appendChild(script);

    // Mark as loaded
    this.scriptLoaded.set(true);

    console.log('[TradingView] Chart initialized with symbol:', this.symbol);
  }

  private updateChartTheme(): void {
    if (!this.chartContainer?.nativeElement) {
      return;
    }
    console.log(
      '[TradingView] Updating theme to:',
      this.isDarkMode() ? 'dark' : 'light'
    );
    this.initializeChart();
  }

  // Public method to update symbol
  updateSymbol(newSymbol: string): void {
    if (!newSymbol || newSymbol === this.symbol) {
      return;
    }
    console.log(
      '[TradingView] Updating symbol from',
      this.symbol,
      'to',
      newSymbol
    );
    this.symbol = newSymbol;
    this.initializeChart();
  }

  // Parses TradingView window messages
  private onWindowMessage = (event: MessageEvent): void => {
    try {
      const origin = event.origin || '';

      // Only process messages from TradingView
      if (
        !origin.includes('tradingview.com') &&
        !origin.includes('tradingview')
      ) {
        return;
      }

      console.log('From Back', event.data);
      const data = event.data;

      // console.log(data);

      // Emit the event data to parent component
      if (data) {
        this.parseEventData.emit(data);
      }
    } catch (error) {
      // Silently ignore parsing errors
      console.debug('[TradingView] Message parse error:', error);
    }
  };
}
