// src/app/core/services/trading-account.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import {
  TradingAccount,
  CreateTradingAccountRequest,
  TradingAccountStats,
  AccountType,
  AccountStatus,
} from '../models/trading-account.model';
import { AlertService } from '../../../../core/services/alert.service';
import { HttpService } from '../../../../core/services/http.service';

@Injectable({
  providedIn: 'root',
})
export class TradingAccountService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'traiding/api/TradingAccounts';

  // Reactive state management
  private readonly _accounts = signal<TradingAccount[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _stats = signal<TradingAccountStats | null>(null);

  readonly accounts = this._accounts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly stats = this._stats.asReadonly();

  /**
   * Get trading accounts for the current user
   */
  getUserAccounts(): Observable<TradingAccount[]> {
    this._loading.set(true);

    return this.http.get<TradingAccount[]>(`${this.baseEndpoint}/user`).pipe(
      tap((accounts) => {
        this._accounts.set(accounts);
        this.calculateStats(accounts);
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error(
          'Failed to load trading accounts. Please try again.'
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new trading account
   */
  createAccount(
    request: CreateTradingAccountRequest
  ): Observable<TradingAccount> {
    this._loading.set(true);

    return this.http.post<TradingAccount>(this.baseEndpoint, request).pipe(
      tap((newAccount) => {
        const currentAccounts = this._accounts();
        this._accounts.set([...currentAccounts, newAccount]);
        this.calculateStats(this._accounts());
        this._loading.set(false);
        this.alertService.success(
          `Trading account "${newAccount.displayName}" created successfully!`
        );
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error(
          'Failed to create trading account. Please try again.'
        );
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific trading account by ID
   */
  getAccountById(id: string): Observable<TradingAccount> {
    return this.http.get<TradingAccount>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Update a trading account
   */
  updateAccount(
    id: string,
    updates: Partial<TradingAccount>
  ): Observable<TradingAccount> {
    return this.http
      .put<TradingAccount>(`${this.baseEndpoint}/${id}`, updates)
      .pipe(
        tap((updatedAccount) => {
          const currentAccounts = this._accounts();
          const updatedAccounts = currentAccounts.map((account) =>
            account.id === id ? updatedAccount : account
          );
          this._accounts.set(updatedAccounts);
          this.calculateStats(updatedAccounts);
          this.alertService.success('Account updated successfully!');
        }),
        catchError((error) => {
          this.alertService.error(
            'Failed to update account. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a trading account
   */
  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseEndpoint}/${id}`).pipe(
      tap(() => {
        const currentAccounts = this._accounts();
        const filteredAccounts = currentAccounts.filter(
          (account) => account.id !== id
        );
        this._accounts.set(filteredAccounts);
        this.calculateStats(filteredAccounts);
        this.alertService.success('Account deleted successfully!');
      }),
      catchError((error) => {
        this.alertService.error('Failed to delete account. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Navigate to trading platform for a specific account
   */
  navigateToTradingPlatform(account: TradingAccount): void {
    if (account.status !== AccountStatus.ACTIVE) {
      this.alertService.warning(
        'Account must be active to access trading platform.'
      );
      return;
    }

    // In a real implementation, you would pass account details to the trading platform
    const tradingUrl = this.buildTradingPlatformUrl(account);
    window.open(tradingUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Get account type display information
   */
  getAccountTypeInfo(accountType: AccountType): string {
    switch (accountType) {
      case AccountType.DEMO:
        return 'Demo';
      case AccountType.REAL:
        return 'Live';
      case AccountType.PAPER:
        return 'Paper';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get account status display information
   */
  getAccountStatusInfo(status: AccountStatus): {
    label: string;
    color: string;
  } {
    switch (status) {
      case AccountStatus.ACTIVE:
        return { label: 'Active', color: 'success' };
      case AccountStatus.PENDING:
        return { label: 'Pending', color: 'warning' };
      case AccountStatus.SUSPENDED:
        return { label: 'Suspended', color: 'error' };
      case AccountStatus.CLOSED:
        return { label: 'Closed', color: 'neutral' };
      case AccountStatus.VERIFICATION_REQUIRED:
        return { label: 'Verification Required', color: 'warning' };
      default:
        return { label: 'Unknown', color: 'neutral' };
    }
  }

  canTrade(account: TradingAccount): boolean {
    return account.status === AccountStatus.ACTIVE;
  }

  formatBalance(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Refresh accounts data
   */
  refreshAccounts(): void {
    this.getUserAccounts().subscribe();
  }

  /**
   * Calculate account statistics
   */
  private calculateStats(accounts: TradingAccount[]): void {
    const activeAccounts = accounts.filter(
      (acc) => acc.status === AccountStatus.ACTIVE
    );
    const totalBalance = accounts.reduce(
      (sum, acc) => sum + (acc.currentBalance || acc.initialBalance),
      0
    );

    const stats: TradingAccountStats = {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      totalBalance,
      unrealizedPnL: 0, // This would come from trading data
      realizedPnL: 0, // This would come from trading data
    };

    this._stats.set(stats);
  }

  /**
   * Build trading platform URL with account context
   */
  private buildTradingPlatformUrl(account: TradingAccount): string {
    // This would be configured based on your trading platform
    const baseUrl = 'https://trading.yourdomain.com';
    const params = new URLSearchParams({
      accountId: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType.toString(),
    });

    return `${baseUrl}?${params.toString()}`;
  }
}
