// services/portfolio.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { Portfolio } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'traiding/api/Wallets';

  // Reactive state management
  private readonly _portfolio = signal<Portfolio | null>(null);
  private readonly _loading = signal<boolean>(false);

  readonly portfolio = this._portfolio.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * Get portfolio for a specific trading account
   */
  getPortfolio(tradingAccountId: string): Observable<Portfolio> {
    this._loading.set(true);

    return this.http
      .get<Portfolio>(`${this.baseEndpoint}/${tradingAccountId}/portfolio`)
      .pipe(
        tap((portfolio) => {
          this._portfolio.set(portfolio);
          this._loading.set(false);
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error(
            'Failed to load portfolio data. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Refresh portfolio data
   */
  refreshPortfolio(tradingAccountId: string): void {
    this.getPortfolio(tradingAccountId).subscribe();
  }

  /**
   * Clear portfolio data
   */
  clearPortfolio(): void {
    this._portfolio.set(null);
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
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Get color class for P&L values
   */
  getPnLColorClass(value: number): string {
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  }

  /**
   * Get asset type display name
   */
  getAssetTypeDisplay(assetType: string): string {
    switch (assetType) {
      case 'STOCK':
        return 'Stock';
      case 'CRYPTO':
        return 'Crypto';
      case 'FOREX':
        return 'Forex';
      case 'COMMODITY':
        return 'Commodity';
      case 'INDEX':
        return 'Index';
      default:
        return assetType;
    }
  }

  /**
   * Get asset type color class
   */
  getAssetTypeColorClass(assetType: string): string {
    switch (assetType) {
      case 'STOCK':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CRYPTO':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'FOREX':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'COMMODITY':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'INDEX':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }
}
