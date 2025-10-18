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

export interface AdjustBalanceData {
  userId: string;
  userFullName: string;
}

@Component({
  selector: 'app-adjust-balance-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adjust-balance-modal.component.html',
  styleUrls: ['./adjust-balance-modal.component.scss'],
})
export class AdjustBalanceModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() data!: AdjustBalanceData;

  private priceManagerService = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private symbolsService = inject(TradingSymbolsService);
  private destroy$ = new Subject<void>();

  // Form fields
  tradingAccountId = signal<string>('');
  currency = signal<string>('USD');
  adjustmentType = signal<'setTo' | 'adjustBy'>('adjustBy');
  setTo = signal<number | null>(null);
  adjustBy = signal<number | null>(null);

  submitting = signal<boolean>(false);
  loadingAccounts = signal<boolean>(false);
  tradingAccounts = signal<TradingAccount[]>([]);

  // Available currencies
  loadingCurrencies = signal<boolean>(false);
  currencies = signal<string[]>([]);
  filteredCurrencies = signal<string[]>([]);
  currencySearchTerm = signal<string>('');

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

  onAdjustmentTypeChange(type: 'setTo' | 'adjustBy'): void {
    this.adjustmentType.set(type);
    // Clear the other field when switching types
    if (type === 'setTo') {
      this.adjustBy.set(null);
    } else {
      this.setTo.set(null);
    }
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

    // Validate adjustment value
    if (this.adjustmentType() === 'setTo') {
      if (this.setTo() === null || this.setTo() === undefined) {
        this.alertService.error('Please enter a value to set the balance to');
        return;
      }
      if (this.setTo()! < 0) {
        this.alertService.error('Balance cannot be negative');
        return;
      }
    } else {
      if (this.adjustBy() === null || this.adjustBy() === undefined) {
        this.alertService.error('Please enter an adjustment amount');
        return;
      }
    }

    this.submitting.set(true);

    const requestBody = {
      tradingAccountId: this.tradingAccountId(),
      currency: this.currency(),
      setTo: this.adjustmentType() === 'setTo' ? this.setTo() : null,
      adjustBy: this.adjustmentType() === 'adjustBy' ? this.adjustBy() : null,
      userId: this.data.userId,
    };

    this.priceManagerService.adjustBalance(requestBody)
      .pipe(
        tap(() => {
          this.alertService.success('Balance adjusted successfully');
          this.modalRef.close(true); // Return true to indicate success
        }),
        catchError((err: any) => {
          console.error('Error adjusting balance:', err);
          let errorMessage = 'Failed to adjust balance. Please try again.';
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
    const invalidKeys = ['e', 'E', '+'];
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

