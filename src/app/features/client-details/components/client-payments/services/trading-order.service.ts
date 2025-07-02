// services/trading.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';

export interface TradingOrder {
  id: string;
  tradingPairSymbol: string;
  orderType: string;
  side: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  status: string;
  createdAt: string;
}

export interface TradingOrdersResponse {
  items: TradingOrder[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface TradingStatistics {
  totalOrders: number;
  totalVolume: number;
  totalPnL: number;
  winRate: number;
  averageOrderSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class TradingService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'traiding/api/Trading';

  // Reactive state management
  private readonly _loading = signal<boolean>(false);
  private readonly _tradingOrders = signal<TradingOrder[]>([]);
  private readonly _tradingStatistics = signal<TradingStatistics | null>(null);
  private readonly _selectedAccountOrders = signal<TradingOrder[]>([]);

  readonly loading = this._loading.asReadonly();
  readonly tradingOrders = this._tradingOrders.asReadonly();
  readonly tradingStatistics = this._tradingStatistics.asReadonly();
  readonly selectedAccountOrders = this._selectedAccountOrders.asReadonly();

  /**
   * Get trading orders for a specific trading account
   */
  getTradingOrders(
    tradingAccountId: string,
    options?: {
      status?: string;
      symbol?: string;
      pageIndex?: number;
      pageSize?: number;
    }
  ): Observable<TradingOrder[]> {
    console.log('TradingService: Getting trading orders for account:', tradingAccountId, options);
    this._loading.set(true);

    let queryParams = '';
    const params: string[] = [];

    if (options?.status) {
      params.push(`status=${encodeURIComponent(options.status)}`);
    }
    if (options?.symbol) {
      params.push(`symbol=${encodeURIComponent(options.symbol)}`);
    }
    if (options?.pageIndex !== undefined) {
      params.push(`pageIndex=${options.pageIndex}`);
    }
    if (options?.pageSize !== undefined) {
      params.push(`pageSize=${options.pageSize}`);
    }

    if (params.length > 0) {
      queryParams = '?' + params.join('&');
    }

    return this.http
      .get<TradingOrdersResponse>(`${this.baseEndpoint}/orders/${tradingAccountId}${queryParams}`)
      .pipe(
        tap((response) => {
          console.log('TradingService: Trading orders loaded:', response);
          this._selectedAccountOrders.set(response.items);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TradingService: Error loading trading orders:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load trading orders. Please try again.'
          );
          return throwError(() => error);
        }),
        // Map the response to only return the items array
        // This fixes the type error
        // Use map operator from rxjs
        // Import map if not already imported
        // import { map } from 'rxjs';
        map((response) => response.items)
      );
  }

  /**
   * Get trading orders with pagination
   */
  getTradingOrdersPaginated(
    tradingAccountId: string,
    pageIndex: number = 1,
    pageSize: number = 50,
    filters?: {
      status?: string;
      symbol?: string;
    }
  ): Observable<TradingOrdersResponse> {
    console.log('TradingService: Getting paginated trading orders:', { tradingAccountId, pageIndex, pageSize, filters });
    this._loading.set(true);

    const params: string[] = [
      `tradingAccountId=${encodeURIComponent(tradingAccountId)}`,
      `pageIndex=${pageIndex}`,
      `pageSize=${pageSize}`
    ];

    if (filters?.status) {
      params.push(`status=${encodeURIComponent(filters.status)}`);
    }
    if (filters?.symbol) {
      params.push(`symbol=${encodeURIComponent(filters.symbol)}`);
    }

    const queryParams = '?' + params.join('&');

    return this.http
      .get<TradingOrdersResponse>(`${this.baseEndpoint}/orders/${queryParams}`)
      .pipe(
        tap((response) => {
          console.log('TradingService: Paginated trading orders loaded:', response);
          this._selectedAccountOrders.set(response.items);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TradingService: Error loading paginated trading orders:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load trading orders. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get all trading orders for a specific trading account (all pages)
   */
  getAllTradingOrders(tradingAccountId: string): Observable<TradingOrder[]> {
    console.log('TradingService: Getting all trading orders for account:', tradingAccountId);
    return this.getTradingOrders(tradingAccountId, { pageSize: 1000 });
  }

  /**
   * Get trading statistics for a trading account
   */
  getTradingStatistics(tradingAccountId: string): Observable<TradingStatistics> {
    console.log('TradingService: Getting trading statistics for account:', tradingAccountId);
    this._loading.set(true);

    return this.http
      .get<TradingStatistics>(`${this.baseEndpoint}/statistics/${tradingAccountId}`)
      .pipe(
        tap((statistics) => {
          console.log('TradingService: Trading statistics loaded:', statistics);
          this._tradingStatistics.set(statistics);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TradingService: Error loading trading statistics:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load trading statistics. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Cancel a trading order
   */
  cancelOrder(orderId: string): Observable<any> {
    console.log('TradingService: Cancelling order:', orderId);
    this._loading.set(true);

    return this.http
      .post<any>(`${this.baseEndpoint}/orders/${orderId}/cancel`, {})
      .pipe(
        tap((result) => {
          console.log('TradingService: Order cancelled successfully:', result);
          this._loading.set(false);
          this.alertService.success('Order cancelled successfully!');
        }),
        catchError((error) => {
          console.error('TradingService: Error cancelling order:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to cancel order. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get order details
   */
  getOrderDetails(orderId: string): Observable<TradingOrder> {
    console.log('TradingService: Getting order details for:', orderId);
    this._loading.set(true);

    return this.http
      .get<TradingOrder>(`${this.baseEndpoint}/orders/${orderId}`)
      .pipe(
        tap((order) => {
          console.log('TradingService: Order details loaded:', order);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TradingService: Error loading order details:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load order details. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Clear trading orders
   */
  clearTradingOrders(): void {
    console.log('TradingService: Clearing trading orders');
    this._tradingOrders.set([]);
    this._selectedAccountOrders.set([]);
  }

  /**
   * Clear trading statistics
   */
  clearTradingStatistics(): void {
    console.log('TradingService: Clearing trading statistics');
    this._tradingStatistics.set(null);
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    const cryptoCurrencies = ['BTC', 'ETH', 'BNB', 'ADA', 'DOT', 'SOL', 'AVAX', 'MATIC', 'LINK', 'UNI'];
    
    if (cryptoCurrencies.includes(currency)) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      }).format(amount) + ' ' + currency;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format trading pair symbol
   */
  formatTradingPair(symbol: string): string {
    // Convert symbols like 'BTCUSD' to 'BTC/USD'
    if (symbol && symbol.length >= 6) {
      const base = symbol.substring(0, 3);
      const quote = symbol.substring(3);
      return `${base}/${quote}`;
    }
    return symbol || 'N/A';
  }

  /**
   * Get order type display text
   */
  getOrderTypeDisplay(orderType: string): string {
    const types: { [key: string]: string } = {
      'market': 'Market',
      'limit': 'Limit',
      'stop': 'Stop',
      'stop_limit': 'Stop Limit',
      'trailing_stop': 'Trailing Stop'
    };
    return types[orderType?.toLowerCase()] || orderType?.charAt(0).toUpperCase() + orderType?.slice(1) || 'Unknown';
  }

  /**
   * Get order status display info and color class
   */
  getOrderStatusInfo(status: string): { label: string; colorClass: string } {
    const statusMap: { [key: string]: { label: string; colorClass: string } } = {
      'open': { 
        label: 'Open', 
        colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
      },
      'filled': { 
        label: 'Filled', 
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      },
      'partially_filled': { 
        label: 'Partially Filled', 
        colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
      },
      'cancelled': { 
        label: 'Cancelled', 
        colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
      },
      'rejected': { 
        label: 'Rejected', 
        colorClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
      },
      'expired': { 
        label: 'Expired', 
        colorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
      }
    };

    return statusMap[status?.toLowerCase()] || { 
      label: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown', 
      colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
    };
  }

  /**
   * Get order side display info and color class
   */
  getOrderSideInfo(side: string): { label: string; colorClass: string } {
    const sideMap: { [key: string]: { label: string; colorClass: string } } = {
      'buy': { 
        label: 'Buy', 
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      },
      'sell': { 
        label: 'Sell', 
        colorClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
      }
    };

    return sideMap[side?.toLowerCase()] || { 
      label: side?.charAt(0).toUpperCase() + side?.slice(1) || 'Unknown', 
      colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' 
    };
  }

  /**
   * Calculate fill percentage
   */
  calculateFillPercentage(filledQuantity: number, totalQuantity: number): number {
    if (!totalQuantity || totalQuantity === 0) return 0;
    return Math.round((filledQuantity / totalQuantity) * 100);
  }

  /**
   * Check if order can be cancelled
   */
  canCancelOrder(status: string): boolean {
    const cancellableStatuses = ['open', 'partially_filled'];
    return cancellableStatuses.includes(status?.toLowerCase());
  }

  /**
   * Get supported order types
   */
  getSupportedOrderTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'market', label: 'Market' },
      { value: 'limit', label: 'Limit' },
      { value: 'stop', label: 'Stop' },
      { value: 'stop_limit', label: 'Stop Limit' },
      { value: 'trailing_stop', label: 'Trailing Stop' }
    ];
  }

  /**
   * Get supported order statuses for filtering
   */
  getSupportedOrderStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'open', label: 'Open' },
      { value: 'filled', label: 'Filled' },
      { value: 'partially_filled', label: 'Partially Filled' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'expired', label: 'Expired' }
    ];
  }
}