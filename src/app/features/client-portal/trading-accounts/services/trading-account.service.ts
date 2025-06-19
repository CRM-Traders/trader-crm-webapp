// src/app/features/client-portal/trading-accounts/services/trading-account.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { AlertService } from '../../../../core/services/alert.service';
import { AccountStatus, AccountType, CreateTradingAccountRequest, TradingAccount } from '../models/trading-account.model';
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

  readonly accounts = this._accounts.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * Get trading accounts for the current user
   */
  getUserAccounts(): Observable<TradingAccount[]> {
    this._loading.set(true);

    return this.http.get<TradingAccount[]>(`${this.baseEndpoint}/user`).pipe(
      tap((accounts) => {
        this._accounts.set(accounts);
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
        this._loading.set(false);
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

  /**
   * Check if account can trade
   */
  canTrade(account: TradingAccount): boolean {
    return account.status === AccountStatus.ACTIVE;
  }

  /**
   * Format balance for display
   */
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
