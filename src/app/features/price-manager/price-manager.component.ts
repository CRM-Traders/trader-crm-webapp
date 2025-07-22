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
  Client,
  PriceManagerService,
  TradingPair,
  ManipulatePriceRequest,
  Order,
} from './services/price-manager.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';

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

  activeClients = signal<Client[]>([]);
  tradingPairs = signal<TradingPair[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  chartLoading = signal(false);
  manipulating = signal(false);

  selectedClientId = signal('');
  selectedSymbol = signal('');
  selectedInterval = signal('1h');
  tradingPairSearch = signal('');

  manipulationPrice = signal<number | null>(null);
  forceManipulation = signal(false);
  manipulationCount = signal(0);

  isFullscreen = signal(false);
  lastPriceUpdate = signal<Date | null>(null);
  marketStatus = signal<'open' | 'closed'>('open');

  recentActivity = signal<
    Array<{
      symbol: string;
      price: number;
      clientName: string;
      timestamp: Date;
      force: boolean;
    }>
  >([]);

  selectedClient = computed(() => {
    const clientId = this.selectedClientId();
    return (
      this.activeClients().find((client: any) => client.userId === clientId) ||
      null
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

  openOrders = signal<Order[]>([]);
  ordersLoading = signal(false);
  updatingOrderIds = signal<Set<string>>(new Set());
  orderPriceUpdates: { [orderId: string]: number } = {};

  // ... existing methods ...

  async onClientchange() {
    if (this.selectedClient()) {
      await this.loadOpenOrders();
    }
  }

  private async loadOpenOrders(): Promise<void> {
    if (!this.selectedClient()) {
      this.openOrders.set([]);
      return;
    }

    this.ordersLoading.set(true);

    try {
      const response: any = await this.service
        .getOpenOrders(this.selectedClient()!.userId, 0, 50)
        .toPromise();

      if (response?.items && Array.isArray(response.items)) {
        this.openOrders.set(response.items);
        // Initialize price update tracking
        this.orderPriceUpdates = {};
      } else {
        this.openOrders.set([]);
      }
    } catch (err) {
      console.error('Error loading open orders:', err);
      this.error.set('Failed to load open orders');
      this.openOrders.set([]);
    } finally {
      this.ordersLoading.set(false);
    }
  }

  async refreshOrders(): Promise<void> {
    await this.loadOpenOrders();
  }

  async updateOrderPrice(orderId: string, newPrice: number): Promise<void> {
    if (!newPrice || newPrice <= 0) {
      return;
    }

    // Add to updating set
    const currentUpdating = new Set(this.updatingOrderIds());
    currentUpdating.add(orderId);
    this.updatingOrderIds.set(currentUpdating);

    try {
      const response = await this.service
        .updateOrderPrice(orderId, newPrice)
        .toPromise();
      console.log('Order price updated:', response);

      // Refresh orders to get updated data
      await this.loadOpenOrders();

      // Clear the input field
      delete this.orderPriceUpdates[orderId];

      // Add to activity log
      const order = this.openOrders().find((o) => o.id === orderId);
      if (order) {
        const activity = {
          symbol: order.tradingPairSymbol,
          price: newPrice,
          clientName: `${this.selectedClient()?.firstName} ${
            this.selectedClient()?.lastName
          }`,
          timestamp: new Date(),
          force: false,
        };
        this.recentActivity.update((activities) => [activity, ...activities]);
      }
    } catch (err) {
      console.error('Error updating order price:', err);
      this.error.set('Failed to update order price. Please try again.');
    } finally {
      // Remove from updating set
      const updatedUpdating = new Set(this.updatingOrderIds());
      updatedUpdating.delete(orderId);
      this.updatingOrderIds.set(updatedUpdating);
    }
  }

  async quickPriceUpdate(orderId: string, newPrice: number): Promise<void> {
    await this.updateOrderPrice(orderId, newPrice);
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }

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
    this.loadInitialData();
    this.startMarketStatusUpdates();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {}, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);

    if (this.isFullscreen()) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  async manipulatePrice(): Promise<void> {
    if (!this.canManipulatePrice()) {
      return;
    }

    this.manipulating.set(true);

    try {
      const pair = this.tradingPairs().find(
        (x) => x.symbol === this.selectedSymbol()
      );

      const request: ManipulatePriceRequest = {
        userId: this.selectedClientId(),
        symbol: `${pair?.baseAsset}/${pair?.quoteAsset}`,
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

      this.manipulationPrice.set(null);
      this.forceManipulation.set(false);
    } catch (err) {
      console.error('Error manipulating price:', err);
      this.error.set('Failed to manipulate price. Please try again.');
    } finally {
      this.manipulating.set(false);
    }
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(date));
  }
}
