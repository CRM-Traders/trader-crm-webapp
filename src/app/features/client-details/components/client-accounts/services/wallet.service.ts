// services/wallet.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { 
  Wallet, 
  WalletSummary, 
  CreateWalletRequest, 
  DepositRequest, 
  WithdrawRequest, 
  TransferRequest,
  WalletTransaction,
  WalletSettings,
  WalletType,
  WalletStatus
} from '../models/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'traiding/api/Wallets';

  // Reactive state management
  private readonly _wallets = signal<Wallet[]>([]);
  private readonly _walletSummary = signal<WalletSummary | null>(null);
  private readonly _loading = signal<boolean>(false);

  readonly wallets = this._wallets.asReadonly();
  readonly walletSummary = this._walletSummary.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * Get wallets for a specific trading account
   */
  getWallets(tradingAccountId: string): Observable<{ wallets: Wallet[], summary: WalletSummary }> {
    this._loading.set(true);

    return this.http
      .get<Wallet[]>(`${this.baseEndpoint}/${tradingAccountId}`)
      .pipe(
        tap((wallets) => {
          // Calculate summary from wallets array
          const summary = this.calculateWalletSummary(wallets, tradingAccountId);
          
          this._wallets.set(wallets);
          this._walletSummary.set(summary);
          this._loading.set(false);
        }),
        // Transform the array response to the expected format
        map((wallets) => ({ 
          wallets, 
          summary: this.calculateWalletSummary(wallets, tradingAccountId) 
        })),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error('Failed to load wallets. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Calculate wallet summary from wallet array
   */
  private calculateWalletSummary(wallets: Wallet[], tradingAccountId: string): WalletSummary {
    const now = new Date().toISOString();
    
    return {
      tradingAccountId,
      totalWallets: wallets.length,
      activeWallets: wallets.filter(w => w.totalBalance > 0).length, // Consider wallets with balance as active
      totalBalance: wallets.reduce((sum, w) => sum + w.usdEquivalent, 0),
      availableBalance: wallets.reduce((sum, w) => sum + (w.availableBalance * this.getUsdRate(w)), 0),
      lockedBalance: wallets.reduce((sum, w) => sum + (w.lockedBalance * this.getUsdRate(w)), 0),
      lastUpdated: wallets.length > 0 ? this.getLatestUpdate(wallets) : now
    };
  }

  /**
   * Get USD rate for calculation (using usdEquivalent / totalBalance ratio)
   */
  private getUsdRate(wallet: Wallet): number {
    if (wallet.totalBalance === 0) return 0;
    return wallet.usdEquivalent / wallet.totalBalance;
  }

  /**
   * Get the latest update time from wallets
   */
  private getLatestUpdate(wallets: Wallet[]): string {
    return wallets
      .map(w => w.lastPriceUpdate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }

  /**
   * Refresh wallets data
   */
  refreshWallets(tradingAccountId: string): void {
    this.getWallets(tradingAccountId).subscribe();
  }

  /**
   * Clear wallets data
   */
  clearWallets(): void {
    this._wallets.set([]);
    this._walletSummary.set(null);
  }

  /**
   * Create a new wallet
   */
  createWallet(request: CreateWalletRequest): Observable<Wallet> {
    return this.http
      .post<Wallet>(`${this.baseEndpoint}`, {
        currency: request.currency,
        tradingAccountId: request.tradingAccountId
      })
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to create wallet. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseEndpoint}/supported-currencies`)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load supported currencies. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get wallet by ID
   */
  getWallet(walletId: string): Observable<Wallet> {
    return this.http
      .get<Wallet>(`${this.baseEndpoint}/${walletId}`)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load wallet details. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Update wallet settings
   */
  updateWalletSettings(walletId: string, settings: Partial<WalletSettings>): Observable<WalletSettings> {
    return this.http
      .patch<WalletSettings>(`${this.baseEndpoint}/${walletId}/settings`, settings)
      .pipe(
        tap(() => {
          this.alertService.success('Wallet settings updated successfully');
        }),
        catchError((error) => {
          this.alertService.error('Failed to update wallet settings. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Create deposit address for wallet
   */
  createDepositAddress(walletId: string, network?: string): Observable<{ address: string, memo?: string }> {
    return this.http
      .post<{ address: string, memo?: string }>(
        `${this.baseEndpoint}/${walletId}/deposit-address`, 
        { network }
      )
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to generate deposit address. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Process withdrawal request
   */
  withdraw(request: WithdrawRequest): Observable<{ transactionId: string }> {
    return this.http
      .post<{ transactionId: string }>(`${this.baseEndpoint}/withdraw`, request)
      .pipe(
        tap(() => {
          this.alertService.success('Withdrawal request submitted successfully');
        }),
        catchError((error) => {
          this.alertService.error('Failed to process withdrawal. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Process transfer request
   */
  transfer(request: TransferRequest): Observable<{ transactionId: string }> {
    return this.http
      .post<{ transactionId: string }>(`${this.baseEndpoint}/transfer`, request)
      .pipe(
        tap(() => {
          this.alertService.success('Transfer completed successfully');
        }),
        catchError((error) => {
          this.alertService.error('Failed to process transfer. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get wallet transaction history
   */
  getWalletTransactions(walletId: string, limit = 50, offset = 0): Observable<WalletTransaction[]> {
    return this.http
      .get<WalletTransaction[]>(`${this.baseEndpoint}/${walletId}/transactions?limit=${limit}&offset=${offset}`)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load transaction history. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Activate wallet
   */
  activateWallet(walletId: string): Observable<Wallet> {
    return this.http
      .patch<Wallet>(`${this.baseEndpoint}/${walletId}/activate`, {})
      .pipe(
        tap(() => {
          this.alertService.success('Wallet activated successfully');
        }),
        catchError((error) => {
          this.alertService.error('Failed to activate wallet. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Suspend wallet
   */
  suspendWallet(walletId: string, reason?: string): Observable<Wallet> {
    return this.http
      .patch<Wallet>(`${this.baseEndpoint}/${walletId}/suspend`, { reason })
      .pipe(
        tap(() => {
          this.alertService.success('Wallet suspended successfully');
        }),
        catchError((error) => {
          this.alertService.error('Failed to suspend wallet. Please try again.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get supported assets
   */
  getSupportedAssets(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseEndpoint}/supported-assets`)
      .pipe(
        catchError((error) => {
          this.alertService.error('Failed to load supported assets. Please try again.');
          return throwError(() => error);
        })
      );
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
   * Format cryptocurrency amount for display
   */
  formatCrypto(amount: number, decimals = 8): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  /**
   * Get currency display name
   */
  getCurrencyDisplayName(currency: string): string {
    const currencyMap: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum', 
      'USDT': 'Tether',
      'USDC': 'USD Coin',
      'BNB': 'Binance Coin',
      'ADA': 'Cardano',
      'SOL': 'Solana', 
      'DOT': 'Polkadot',
      'MATIC': 'Polygon',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap',
      'AAVE': 'Aave'
    };
    return currencyMap[currency] || currency;
  }

  /**
   * Get wallet type display name (for future use)
   */
  getWalletTypeInfo(walletType: WalletType): string {
    switch (walletType) {
      case WalletType.SPOT:
        return 'Spot Trading';
      case WalletType.FUTURES:
        return 'Futures Trading';
      case WalletType.MARGIN:
        return 'Margin Trading';
      default:
        return walletType;
    }
  }

  /**
   * Get wallet status information (for future use)
   */
  getWalletStatusInfo(status: WalletStatus): { label: string; color: string } {
    switch (status) {
      case WalletStatus.ACTIVE:
        return { label: 'Active', color: 'success' };
      case WalletStatus.SUSPENDED:
        return { label: 'Suspended', color: 'error' };
      case WalletStatus.MAINTENANCE:
        return { label: 'Maintenance', color: 'warning' };
      case WalletStatus.INACTIVE:
        return { label: 'Inactive', color: 'neutral' };
      default:
        return { label: status, color: 'neutral' };
    }
  }

  /**
   * Get currency color class for UI
   */
  getCurrencyColorClass(currency: string): string {
    const colorMap: Record<string, string> = {
      'BTC': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'ETH': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'USDT': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'USDC': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'BNB': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'ADA': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'SOL': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'DOT': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return colorMap[currency] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  /**
   * Get wallet status color class for UI
   */
  getWalletStatusColorClass(status: WalletStatus): string {
    switch (status) {
      case WalletStatus.ACTIVE:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case WalletStatus.SUSPENDED:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case WalletStatus.MAINTENANCE:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case WalletStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  /**
   * Calculate wallet percentage of total balance
   */
  calculateWalletPercentage(walletBalance: number, totalBalance: number): number {
    if (totalBalance === 0) return 0;
    return (walletBalance / totalBalance) * 100;
  }

  /**
   * Check if wallet has any balance
   */
  hasBalance(wallet: Wallet): boolean {
    return wallet.totalBalance > 0;
  }

  /**
   * Check if wallet can accept deposits (simplified check)
   */
  canDeposit(wallet: Wallet): boolean {
    return true; // Assume all wallets can accept deposits
  }

  /**
   * Check if wallet can process withdrawals
   */
  canWithdraw(wallet: Wallet): boolean {
    return wallet.availableBalance > 0;
  }

  /**
   * Check if wallet can be used for trading
   */
  canTrade(wallet: Wallet): boolean {
    return wallet.availableBalance > 0;
  }

  /**
   * Format wallet balance for display
   */
  formatWalletBalance(amount: number, currency: string): string {
    const decimals = this.getCurrencyDecimals(currency);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  /**
   * Get currency decimal places
   */
  private getCurrencyDecimals(currency: string): number {
    const decimalMap: Record<string, number> = {
      'BTC': 8,
      'ETH': 6,
      'USDT': 2,
      'USDC': 2,
      'BNB': 4,
      'ADA': 6,
      'SOL': 6,
      'DOT': 4
    };
    return decimalMap[currency] || 8;
  }
}