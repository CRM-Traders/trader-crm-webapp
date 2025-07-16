// services/wallet.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  DepositRequest,
  WithdrawRequest,
  WalletTransaction,
  TradingAccountSummary,
  ClientWalletsSummary,
  WalletTransactionFilters,
  WalletTransactionResponse,
} from '../models/wallet.model';
import { Wallet } from '../../client-accounts/models/wallet.model';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'wallets/api/Wallets';
  private readonly tradingBaseEndpoint = 'traiding/api/Wallets';

  // Reactive state management
  private readonly _loading = signal<boolean>(false);
  private readonly _tradingAccounts = signal<TradingAccountSummary[]>([]);
  private readonly _recentTransaction = signal<WalletTransaction | null>(null);

  private readonly _selectedAccountWallets = signal<Wallet[]>([]);

  readonly loading = this._loading.asReadonly();
  readonly tradingAccounts = this._tradingAccounts.asReadonly();
  readonly recentTransaction = this._recentTransaction.asReadonly();

  getTradingAccounts(
    clientUserId: string
  ): Observable<TradingAccountSummary[]> {
    this._loading.set(true);

    return this.http
      .get<TradingAccountSummary[]>(
        `traiding/api/TradingAccounts/client-accounts-for-admin?clientUserId=${clientUserId}`
      )
      .pipe(
        tap((accounts) => {
          this._tradingAccounts.set(accounts);
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

  getWalletsByTradingAccount(tradingAccountId: string): Observable<Wallet[]> {
    this._loading.set(true);

    return this.http
      .get<Wallet[]>(`${this.tradingBaseEndpoint}/${tradingAccountId}`)
      .pipe(
        tap((wallets) => {
          this._selectedAccountWallets.set(wallets);
          this._loading.set(false);
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error('Failed to load wallets. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Process deposit transaction
   */
  deposit(request: DepositRequest): Observable<void> {
    this._loading.set(true);

    return this.http
      .post<void>(`${this.tradingBaseEndpoint}/deposit`, request)
      .pipe(
        tap(() => {
          this._loading.set(false);
          this.alertService.success(
            `Deposit of ${this.formatCurrency(
              request.amount,
              request.currency
            )} has been processed successfully!`
          );
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error(
            'Failed to process deposit. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  withdraw(request: WithdrawRequest): Observable<void> {
    this._loading.set(true);

    return this.http
      .post<void>(`${this.tradingBaseEndpoint}/withdraw`, request)
      .pipe(
        tap(() => {
          this._loading.set(false);
          this.alertService.success(
            `Withdrawal of ${this.formatCurrency(
              request.amount,
              request.currency
            )} has been processed successfully!`
          );
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error(
            'Failed to process withdrawal. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  getClientTransactionsByUserId(
    userId: string,
    filters?: WalletTransactionFilters
  ): Observable<WalletTransactionResponse> {
    this._loading.set(true);

    const params = new URLSearchParams();
    params.append('clientUserId', userId);

    if (filters?.pageNumber)
      params.append('pageNumber', (filters.pageNumber - 1).toString());
    if (filters?.pageSize)
      params.append('pageSize', filters.pageSize.toString());
    if (filters?.transactionType)
      params.append('transactionType', filters.transactionType);
    if (filters?.currency) params.append('currency', filters.currency);

    const queryString = params.toString();
    const url = `traiding/api/Wallets/client-transactions-by-user-id?${queryString}`;

    return this.http.get<WalletTransactionResponse>(url).pipe(
      tap((response) => {
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error(
          'Failed to load client transactions. Please try again.'
        );
        return throwError(() => error);
      })
    );
  }

  getClientWalletsSummary(userId: string): Observable<ClientWalletsSummary> {
    this._loading.set(true);

    return this.http
      .get<ClientWalletsSummary>(
        `traiding/api/Wallets/client-wallets-summary?clientUserId=${userId}`
      )
      .pipe(
        tap((summary) => {
          this._loading.set(false);
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error(
            'Failed to load client wallets summary. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  clearRecentTransaction(): void {
    this._recentTransaction.set(null);
  }

  clearTradingAccounts(): void {
    this._tradingAccounts.set([]);
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    const cryptoCurrencies = [
      'USDT',
      'BTC',
      'ETH',
      'ADA',
      'DOT',
      'SOL',
      'AVAX',
      'MATIC',
      'LINK',
      'UNI',
    ];

    if (cryptoCurrencies.includes(currency)) {
      return `${amount.toFixed(2)} ${currency}`;
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'JPY', 'AUD', 'CAD'];
  }

  getAccountTypeDisplay(accountType: string): string {
    switch (accountType?.toLowerCase()) {
      case 'demo':
        return 'Demo';
      case 'real':
        return 'Live';
      case 'paper':
        return 'Paper';
      default:
        return 'Unknown';
    }
  }

  getAccountTypeColorClass(accountType: string): string {
    switch (accountType?.toLowerCase()) {
      case 'demo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'real':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paper':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }
}
