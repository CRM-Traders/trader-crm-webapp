import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, finalize, tap } from 'rxjs';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { PriceManagerService, TradingAccount } from '../../services/price-manager.service';
import { AlertService } from '../../../../core/services/alert.service';
import { TradingSymbolsService } from '../../services/trading-symbols.service';

export interface HiddenWithdrawalData {
  userId: string;
  userFullName: string;
}

@Component({
  selector: 'app-hidden-withdrawal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hidden-withdrawal-modal.component.html',
  styleUrls: ['./hidden-withdrawal-modal.component.scss'],
})
export class HiddenWithdrawalModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() data!: HiddenWithdrawalData;

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private symbolsService = inject(TradingSymbolsService);
  private destroy$ = new Subject<void>();

  // Form fields
  tradingAccountId = signal<string>('');
  currency = signal<string>('USD');
  amount = signal<number | null>(null);
  note = signal<string>('');

  submitting = signal<boolean>(false);
  loadingAccounts = signal<boolean>(false);
  tradingAccounts = signal<TradingAccount[]>([]);

  // Available currencies
  loadingCurrencies = signal<boolean>(false);
  currencies = signal<string[]>([]);
  filteredCurrencies = signal<string[]>([]);
  currencySearchTerm = signal<string>('');

  // Balance information
  loadingBalance = signal<boolean>(false);
  userBalance = signal<any>(null);

  ngOnInit(): void {
    // Fetch trading accounts for the user
    this.loadTradingAccounts();
    // Fetch available currencies
    this.loadCurrencies();
  }

  loadTradingAccounts(): void {
    if (!this.data?.userId) {
      return;
    }

    this.loadingAccounts.set(true);

    this.priceManagerService
      .getClientTradingAccounts(this.data.userId)
      .pipe(
        tap((response: any) => {
          // Handle different response formats (API returns array directly)
          let accounts: TradingAccount[] = [];
          if (Array.isArray(response)) {
            accounts = response;
          } else if (response?.accounts && Array.isArray(response.accounts)) {
            accounts = response.accounts;
          } else if (response?.items && Array.isArray(response.items)) {
            accounts = response.items;
          } else if (response?.data && Array.isArray(response.data)) {
            accounts = response.data;
          }

          this.tradingAccounts.set(accounts);

          // Set default trading account if available
          if (accounts.length > 0) {
            this.tradingAccountId.set(accounts[0].id);
          }
        }),
        catchError((err: any) => {
          console.error('Error loading trading accounts:', err);
          let errorMessage = 'Failed to load trading accounts';
          if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          this.alertService.error(errorMessage);
          return [];
        }),
        finalize(() => this.loadingAccounts.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  loadCurrencies(): void {
    this.loadingCurrencies.set(true);

    this.symbolsService.getAvailableCurrencies()
      .pipe(
        tap((currenciesList: string[]) => {
          this.currencies.set(currenciesList || []);
          this.filteredCurrencies.set(currenciesList || []);
          
          // Set default currency if not already set and currencies are available
          if (currenciesList && currenciesList.length > 0 && !this.currency()) {
            // Try to find USD, if not available use the first one
            const defaultCurrency = currenciesList.includes('USD') ? 'USD' : currenciesList[0];
            this.currency.set(defaultCurrency);
            // Load balance for default currency
            this.loadUserBalance();
          }
        }),
        catchError((err: any) => {
          console.error('Error loading currencies:', err);
          this.alertService.error('Failed to load currencies');
          // Set default currencies on error
          const fallbackCurrencies = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT'];
          this.currencies.set(fallbackCurrencies);
          this.filteredCurrencies.set(fallbackCurrencies);
          return [];
        }),
        finalize(() => this.loadingCurrencies.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  loadUserBalance(): void {
    if (!this.data?.userId || !this.currency()) {
      return;
    }

    this.loadingBalance.set(true);

    this.priceManagerService
      .getUserBalance(this.data.userId, this.currency())
      .pipe(
        tap((balanceResponse: any) => {
          this.userBalance.set(balanceResponse);
        }),
        catchError((err: any) => {
          console.error('Error loading user balance:', err);
          this.userBalance.set(null);
          return [];
        }),
        finalize(() => this.loadingBalance.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onCurrencyChange(): void {
    // Load balance when currency changes
    this.loadUserBalance();
  }

  onCurrencySearch(searchTerm: string): void {
    this.currencySearchTerm.set(searchTerm);
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      this.filteredCurrencies.set(this.currencies());
      return;
    }

    const normalizedSearch = searchTerm.toUpperCase().trim();
    const filtered = this.currencies().filter(currency =>
      currency.toUpperCase().includes(normalizedSearch)
    );

    this.filteredCurrencies.set(filtered);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    // Validate required fields
    if (!this.tradingAccountId()) {
      this.alertService.error('Please select a trading account');
      return;
    }
    if (!this.currency()) {
      this.alertService.error('Please select a currency');
      return;
    }
    if (this.amount() === null || this.amount() === undefined) {
      this.alertService.error('Please enter a withdrawal amount');
      return;
    }
    if (this.amount()! <= 0) {
      this.alertService.error('Withdrawal amount must be greater than 0');
      return;
    }

    this.submitting.set(true);

    // Check user balance before processing withdrawal
    const balanceData = this.userBalance();
    
    if (!balanceData || !balanceData.balances || balanceData.balances.length === 0) {
      this.alertService.error('Unable to verify balance. Please try again.');
      this.submitting.set(false);
      return;
    }

    const balanceInfo = balanceData.balances[0];
    const availableBalance = balanceInfo.totalAvailable || 0;
    const withdrawalAmount = this.amount()!;

    if (availableBalance < withdrawalAmount) {
      this.alertService.error(
        `Insufficient balance. Available: ${availableBalance.toFixed(8)} ${this.currency()}, Requested: ${withdrawalAmount.toFixed(8)} ${this.currency()}`
      );
      this.submitting.set(false);
      return;
    }

    const requestBody = {
      tradingAccountId: this.tradingAccountId(),
      currency: this.currency(),
      amount: withdrawalAmount,
      note: this.note() || null,
      userId: this.data.userId,
    };

    this.priceManagerService.hiddenWithdrawal(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success('Hidden withdrawal processed successfully');
          this.modalRef.close(true); // Return true to indicate success
        }),
        catchError((err: any) => {
          console.error('Error processing hidden withdrawal:', err);
          let errorMessage = 'Failed to process hidden withdrawal. Please try again.';
          
          // Prefer plain-text error responses from backend (e.g., "Insufficient balance...")
          if (typeof err?.error === 'string') {
            errorMessage = err.error;
          } else if (err?.error?.error) {
            errorMessage = err.error.error;
          } else if (err?.error?.message) {
            errorMessage = err.error.message;
          } else if (err?.message) {
            errorMessage = err.message;
          }
          
          this.alertService.error(errorMessage);
          return [];
        }),
        finalize(() => this.submitting.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  // Prevent invalid characters in number input
  preventInvalidNumberInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+', '-'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
      return;
    }

    // Only allow a single decimal separator
    if (event.key === '.') {
      const target = event.target as HTMLInputElement;
      if (target && target.value.includes('.')) {
        event.preventDefault();
      }
    }
  }
}

