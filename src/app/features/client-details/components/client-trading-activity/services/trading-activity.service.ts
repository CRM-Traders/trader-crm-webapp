// services/trading-activity.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  TradingOrder,
  TradingActivitySummary,
  TradingActivityFilters,
  TradingActivityResponse,
} from '../models/trading-activity.model';

@Injectable({
  providedIn: 'root',
})
export class TradingActivityService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'trading/api/Trading';

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

  getClientOrdersByUserId(
    userId: string,
    filters?: {
      pageNumber?: number;
      pageSize?: number;
      status?: string;
      symbol?: string;
    }
  ): Observable<TradingActivityResponse> {
    this._loading.set(true);

    const params = new URLSearchParams();
    params.append('clientUserId', userId);

    if (filters?.pageNumber)
      params.append('pageNumber', (filters.pageNumber - 1).toString());
    if (filters?.pageSize)
      params.append('pageSize', filters.pageSize.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.symbol) params.append('symbol', filters.symbol);

    const queryString = params.toString();
    const url = `traiding/api/Wallets/client-orders-by-user-id?${queryString}`;

    return this.http
      .get<{
        items: TradingOrder[];
        totalCount: number;
        pageNumber: number;
        pageSize: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      }>(url)
      .pipe(
        map((response) => {
          const tradingResponse: TradingActivityResponse = {
            orders: response.items,
            totalCount: response.totalCount,
            pageIndex: response.pageNumber + 1,
            pageSize: response.pageSize,
            summary: this.calculateSummary(response.items),
          };
          return tradingResponse;
        }),
        tap((tradingResponse) => {
          this._orders.set(tradingResponse.orders);
          this._totalCount.set(tradingResponse.totalCount);
          this._pageIndex.set(tradingResponse.pageIndex);
          this._pageSize.set(tradingResponse.pageSize);
          this._loading.set(false);
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error(
            'Failed to load client orders. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  getTradingOrders(
    tradingAccountId: string,
    filters?: Partial<TradingActivityFilters>
  ): Observable<TradingActivityResponse> {
    this._loading.set(true);

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.symbol) params.append('symbol', filters.symbol);
    if (filters?.orderType) params.append('orderType', filters.orderType);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    params.append('pageIndex', (filters?.pageIndex || 1).toString());
    params.append('pageSize', (filters?.pageSize || 50).toString());

    const queryString = params.toString();
    const url = `${this.baseEndpoint}/orders/${tradingAccountId}${
      queryString ? '?' + queryString : ''
    }`;

    return this.http.get<TradingActivityResponse>(url).pipe(
      tap((response) => {
        const summary =
          response.summary ?? this.calculateSummary(response.orders);

        this._orders.set(response.orders);
        this._summary.set(summary);
        this._totalCount.set(response.totalCount);
        this._pageIndex.set(response.pageIndex);
        this._pageSize.set(response.pageSize);
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error(
          'Failed to load trading activity. Please try again.'
        );
        return throwError(() => error);
      })
    );
  }

  refreshOrders(
    tradingAccountId: string,
    filters?: Partial<TradingActivityFilters>
  ): void {
    this.getTradingOrders(tradingAccountId, filters).subscribe();
  }

  clearOrders(): void {
    this._orders.set([]);
    this._summary.set(null);
    this._totalCount.set(0);
    this._loading.set(false);
  }

  private calculateSummary(orders: TradingOrder[]): TradingActivitySummary {
    const pendingOrders = orders.filter((order) => order.status === 'Pending');
    const filledOrders = orders.filter((order) => order.filledQuantity > 0);
    const cancelledOrders = orders.filter(
      (order) => order.status === 'Cancelled'
    );

    const totalVolume = orders.reduce((sum, order) => sum + order.quantity, 0);
    const filledVolume = filledOrders.reduce(
      (sum, order) => sum + order.filledQuantity,
      0
    );
    const pendingVolume = pendingOrders.reduce(
      (sum, order) => sum + order.remainingQuantity,
      0
    );

    const totalProfit = 0;
    const totalLoss = 0;
    const netPnL = 0;
    const winRate = 0;
    const averageWin = 0;
    const averageLoss = 0;

    return {
      totalTrades: orders.length,
      totalVolume,
      winRate,
      totalProfit,
      totalLoss,
      netPnL,
      openTrades: pendingOrders.length,
      closedTrades: filledOrders.length + cancelledOrders.length,
      averageWin,
      averageLoss,
    };
  }

  getOrderTypeDisplay(orderType: string): string {
    const typeMap: { [key: string]: string } = {
      buy: 'Buy',
      sell: 'Sell',
      buy_limit: 'Buy Limit',
      sell_limit: 'Sell Limit',
      buy_stop: 'Buy Stop',
      sell_stop: 'Sell Stop',
    };
    return typeMap[orderType] || orderType;
  }

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

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatNumber(value: number, decimals: number = 5): string {
    return value.toFixed(decimals);
  }
}
