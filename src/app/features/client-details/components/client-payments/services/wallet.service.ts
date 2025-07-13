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
  WalletTransactionResponse
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

  /**
   * Get trading accounts for dropdown selection
   */
  getTradingAccounts(clientUserId: string): Observable<TradingAccountSummary[]> {
    console.log('WalletService: Getting trading accounts for client:', clientUserId);
    this._loading.set(true);

    return this.http
      .get<TradingAccountSummary[]>(
        `traiding/api/TradingAccounts/client-accounts-for-admin?clientUserId=${clientUserId}`
      )
      .pipe(
        tap((accounts) => {
          console.log('WalletService: Trading accounts loaded:', accounts);
          this._tradingAccounts.set(accounts);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('WalletService: Error loading trading accounts:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load trading accounts. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

    getWalletsByTradingAccount(tradingAccountId: string): Observable<Wallet[]> {
    console.log('WalletService: Getting wallets for trading account:', tradingAccountId);
    this._loading.set(true);

    return this.http
      .get<Wallet[]>(`${this.tradingBaseEndpoint}/${tradingAccountId}`)
      .pipe(
        tap((wallets) => {
          console.log('WalletService: Wallets loaded for account:', wallets);
          this._selectedAccountWallets.set(wallets);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('WalletService: Error loading wallets:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load wallets. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Process deposit transaction
   */
  deposit(request: DepositRequest): Observable<WalletTransaction> {
    console.log('WalletService: Processing deposit:', request);
    this._loading.set(true);

    return this.http
      .post<WalletTransaction>(`${this.tradingBaseEndpoint}/deposit`, request)
      .pipe(
        tap((transaction) => {
          console.log('WalletService: Deposit successful:', transaction);
          this._recentTransaction.set(transaction);
          this._loading.set(false);
          this.alertService.success(
            `Deposit of ${this.formatCurrency(request.amount, request.currency)} has been processed successfully!`
          );
        }),
        catchError((error) => {
          console.error('WalletService: Error processing deposit:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to process deposit. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Process withdrawal transaction
   */
  withdraw(request: WithdrawRequest): Observable<WalletTransaction> {
    console.log('WalletService: Processing withdrawal:', request);
    this._loading.set(true);

    return this.http
      .post<WalletTransaction>(`${this.tradingBaseEndpoint}/withdraw`, request)
      .pipe(
        tap((transaction) => {
          console.log('WalletService: Withdrawal successful:', transaction);
          this._recentTransaction.set(transaction);
          this._loading.set(false);
          this.alertService.success(
            `Withdrawal of ${this.formatCurrency(request.amount, request.currency)} has been processed successfully!`
          );
        }),
        catchError((error) => {
          console.error('WalletService: Error processing withdrawal:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to process withdrawal. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get client transactions by user ID with pagination and filtering
   */
  getClientTransactionsByUserId(
    userId: string,
    filters?: WalletTransactionFilters
  ): Observable<WalletTransactionResponse> {
    console.log('WalletService: Getting client transactions for user:', userId, 'with filters:', filters);
    this._loading.set(true);

    // Build query parameters
    const params = new URLSearchParams();
    params.append('clientUserId', userId);
    
    if (filters?.pageNumber) params.append('pageNumber', (filters.pageNumber - 1).toString()); // Adjust for 0-based pageNumber
    if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString()); // pageSize is the actual count
    if (filters?.transactionType) params.append('transactionType', filters.transactionType);
    if (filters?.currency) params.append('currency', filters.currency);

    const queryString = params.toString();
    const url = `traiding/api/Wallets/client-transactions-by-user-id?${queryString}`;

    return this.http
      .get<WalletTransactionResponse>(url)
      .pipe(
        tap((response) => {
          console.log('WalletService: Client transactions loaded:', response);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('WalletService: Error loading client transactions:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load client transactions. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get client wallets summary
   */
  getClientWalletsSummary(userId: string): Observable<ClientWalletsSummary> {
    console.log('WalletService: Getting client wallets summary for user:', userId);
    this._loading.set(true);

    return this.http
      .get<ClientWalletsSummary>(`traiding/api/Wallets/client-wallets-summary?clientUserId=${userId}`)
      .pipe(
        tap((summary) => {
          console.log('WalletService: Client wallets summary loaded:', summary);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('WalletService: Error loading client wallets summary:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load client wallets summary. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Clear recent transaction
   */
  clearRecentTransaction(): void {
    console.log('WalletService: Clearing recent transaction');
    this._recentTransaction.set(null);
  }

  /**
   * Clear trading accounts
   */
  clearTradingAccounts(): void {
    console.log('WalletService: Clearing trading accounts');
    this._tradingAccounts.set([]);
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
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'JPY', 'AUD', 'CAD'];
  }

  /**
   * Get account type display information
   */
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

  /**
   * Get account type color class
   */
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
