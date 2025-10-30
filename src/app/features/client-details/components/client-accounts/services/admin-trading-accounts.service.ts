// services/admin-trading-account.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  AccountStatus,
  AccountType,
  CreateTradingAccountRequest,
  TradingAccount,
} from '../models/trading-account.model';

@Injectable({
  providedIn: 'root',
})
export class AdminTradingAccountService {
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
  getUserAccounts(clientUserId: string): Observable<TradingAccount[]> {
    this._loading.set(true);

    return this.http
      .get<TradingAccount[]>(
        `${this.baseEndpoint}/client-accounts-for-admin?clientUserId=${clientUserId}`
      )
      .pipe(
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

    return this.http
      .post<TradingAccount>(
        `${this.baseEndpoint}/create-account-via-admin`,
        request
      )
      .pipe(
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
   * Activate trading account
   */
  activateAccount(accountId: string, clientUserId: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseEndpoint}/${accountId}/activate`, {})
      .pipe(
        tap(() => {
          this.alertService.success('Account activated successfully!');
          this.refreshAccounts(clientUserId);
        }),
        catchError((error) => {
          this.alertService.error(
            'Failed to activate account. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  deactivateAccount(accountId: string, clientUserId: string) {
    return this.http
      .post<void>(`${this.baseEndpoint}/${accountId}/deactivate`, {})
      .pipe(
        tap(() => {
          this.alertService.success('Account deactivated successfully!');
          this.refreshAccounts(clientUserId);
        }),
        catchError((error) => {
          this.alertService.error(
            'Failed to deactivate account. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Suspend trading account
   */
  suspendAccount(accountId: string, clientUserId: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseEndpoint}/${accountId}/suspend`, {})
      .pipe(
        tap(() => {
          this.alertService.success('Account suspended successfully!');
          this.refreshAccounts(clientUserId);
        }),
        catchError((error) => {
          this.alertService.error(
            'Failed to suspend account. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get account type display information
   */
  getAccountTypeInfo(accountType: AccountType | string | number): string {
    // If API already provided a readable string
    if (typeof accountType === 'string') {
      const normalized = accountType.trim().toLowerCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    // If we have numeric enum values
    if (typeof accountType === 'number') {
      switch (accountType) {
        case AccountType.Trading:
          return 'Trading';
        case AccountType.Saving:
          return 'Saving';
        default:
          return 'Unknown';
      }
    }

    // Enum case fallback
    switch (accountType) {
      case AccountType.Trading:
        return 'Trading';
      case AccountType.Saving:
        return 'Saving';
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
  refreshAccounts(clientUserId: string): void {
    this.getUserAccounts(clientUserId).subscribe();
  }
}
