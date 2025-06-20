// services/trading-activity.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  TradingOrder,
  TradingActivitySummary,
  TradingActivityFilters,
  TradingActivityResponse
} from '../models/trading-activity.model';

@Injectable({
  providedIn: 'root',
})
export class TradingActivityService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'trading/api/Trading';

  // Reactive state management
  private readonly _orders = signal<TradingOrder[]>([]);
  private readonly _summary = signal<TradingActivitySummary | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _totalCount = signal<number>(0);
  private readonly _pageIndex = signal<number>(1);
  private readonly _pageSize = signal<number>(50);

  readonly orders = this._orders.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly totalCount = this._totalCount.asReadonly();
  readonly pageIndex = this._pageIndex.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();

  /**
   * Get trading orders for a specific trading account
   */
  getTradingOrders(
    tradingAccountId: string,
    filters?: Partial<TradingActivityFilters>
  ): Observable<TradingActivityResponse> {
    console.log('TradingActivityService: Getting orders for account:', tradingAccountId, 'with filters:', filters);
    this._loading.set(true);

    // Build query parameters
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.symbol) params.append('symbol', filters.symbol);
    if (filters?.orderType) params.append('orderType', filters.orderType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    params.append('pageIndex', (filters?.pageIndex || 1).toString());
    params.append('pageSize', (filters?.pageSize || 50).toString());

    const queryString = params.toString();
    const url = `${this.baseEndpoint}/orders/${tradingAccountId}${queryString ? '?' + queryString : ''}`;

    return this.http
      .get<TradingActivityResponse>(url)
      .pipe(
        tap((response) => {
          console.log('TradingActivityService: Orders loaded:', response.orders);

          // If the API provides a summary, use it; otherwise, calculate it
          const summary = response.summary ?? this.calculateSummary(response.orders);

          this._orders.set(response.orders);
          this._summary.set(summary);
          this._totalCount.set(response.totalCount);
          this._pageIndex.set(response.pageIndex);
          this._pageSize.set(response.pageSize);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TradingActivityService: Error loading orders:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load trading activity. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Refresh trading orders
   */
  refreshOrders(tradingAccountId: string, filters?: Partial<TradingActivityFilters>): void {
    this.getTradingOrders(tradingAccountId, filters).subscribe();
  }

  /**
   * Clear trading orders data
   */
  clearOrders(): void {
    console.log('TradingActivityService: Clearing orders data');
    this._orders.set([]);
    this._summary.set(null);
    this._totalCount.set(0);
    this._loading.set(false);
  }

  /**
   * Calculate trading activity summary from orders
   */
  private calculateSummary(orders: TradingOrder[]): TradingActivitySummary {
    const closedOrders = orders.filter(order => order.status === 'closed' && order.profit !== undefined);
    const openOrders = orders.filter(order => order.status === 'open');

    const totalVolume = orders.reduce((sum, order) => sum + order.volume, 0);
    const profits = closedOrders.map(order => order.profit || 0);
    const winningTrades = profits.filter(profit => profit > 0);
    const losingTrades = profits.filter(profit => profit < 0);

    const totalProfit = winningTrades.reduce((sum, profit) => sum + profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, loss) => sum + loss, 0));
    const netPnL = totalProfit - totalLoss;

    const winRate = closedOrders.length > 0
      ? (winningTrades.length / closedOrders.length) * 100
      : 0;

    const averageWin = winningTrades.length > 0
      ? totalProfit / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? totalLoss / losingTrades.length
      : 0;

    return {
      totalTrades: orders.length,
      totalVolume,
      winRate: Math.round(winRate * 100) / 100,
      totalProfit,
      totalLoss,
      netPnL,
      openTrades: openOrders.length,
      closedTrades: closedOrders.length,
      averageWin,
      averageLoss
    };
  }

  /**
   * Get order type display information
   */
  getOrderTypeDisplay(orderType: string): string {
    const typeMap: { [key: string]: string } = {
      'buy': 'Buy',
      'sell': 'Sell',
      'buy_limit': 'Buy Limit',
      'sell_limit': 'Sell Limit',
      'buy_stop': 'Buy Stop',
      'sell_stop': 'Sell Stop'
    };
    return typeMap[orderType] || orderType;
  }

  /**
   * Get order type color class
   */
  getOrderTypeColorClass(orderType: string): string {
    switch (orderType) {
      case 'buy':
      case 'buy_limit':
      case 'buy_stop':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sell':
      case 'sell_limit':
      case 'sell_stop':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: string, profit?: number): string {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'closed':
        if (profit !== undefined) {
          return profit >= 0
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        }
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Format number with specific decimal places
   */
  formatNumber(value: number, decimals: number = 5): string {
    return value.toFixed(decimals);
  }
}
