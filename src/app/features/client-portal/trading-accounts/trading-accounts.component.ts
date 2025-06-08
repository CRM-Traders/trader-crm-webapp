// src/app/features/client-portal/trading-accounts/trading-accounts.component.ts

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { LocalizationService } from '../../../core/services/localization.service';
import {
  TradingAccount,
  AccountStatus,
  AccountType,
  ACCOUNT_TYPE_CONFIG,
  CreateTradingAccountRequest,
} from './models/trading-account.model';
import { TradingAccountService } from './services/trading-account.service';

@Component({
  selector: 'app-trading-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './trading-accounts.component.html',
  styleUrl: './trading-accounts.component.scss',
})
export class TradingAccountsComponent implements OnInit {
  tradingAccountService = inject(TradingAccountService);
  private alertService = inject(AlertService);
  private localizationService = inject(LocalizationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Component state
  readonly accounts = this.tradingAccountService.accounts;
  readonly loading = this.tradingAccountService.loading;
  readonly stats = this.tradingAccountService.stats;

  readonly showCreateForm = signal<boolean>(false);
  readonly selectedAccount = signal<TradingAccount | null>(null);
  readonly viewMode = signal<'grid' | 'list'>('grid');

  // Form
  createAccountForm: FormGroup;

  // Computed values
  readonly activeAccounts = computed(() =>
    this.accounts().filter((acc) => acc.status === AccountStatus.ACTIVE)
  );

  readonly inactiveAccounts = computed(() =>
    this.accounts().filter((acc) => acc.status !== AccountStatus.ACTIVE)
  );

  readonly hasAccounts = computed(() => this.accounts().length > 0);

  // Constants for template
  readonly AccountType = AccountType;
  readonly AccountStatus = AccountStatus;
  readonly ACCOUNT_TYPE_CONFIG = ACCOUNT_TYPE_CONFIG;

  constructor() {
    this.createAccountForm = this.fb.group({
      displayName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      accountType: [AccountType.DEMO, [Validators.required]],
      initialBalance: [10000, [Validators.required, Validators.min(1)]],
      enableSpotTrading: [true],
      enableFuturesTrading: [false],
      maxLeverage: [
        1,
        [Validators.required, Validators.min(1), Validators.max(100)],
      ],
    });
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  /**
   * Load user's trading accounts
   */
  loadAccounts(): void {
    this.tradingAccountService.getUserAccounts().subscribe({
      error: () => {
        // Error handling is done in the service
      },
    });
  }

  /**
   * Open trading platform for account
   */
  openTradingPlatform(account: TradingAccount): void {
    if (!this.tradingAccountService.canTrade(account)) {
      this.alertService.warning(
        'Account must be active to access trading platform.'
      );
      return;
    }

    this.tradingAccountService.navigateToTradingPlatform(account);
  }

  /**
   * Create new trading account
   */
  createAccount(): void {
    if (this.createAccountForm.valid) {
      const formValue = this.createAccountForm.value;
      const request: CreateTradingAccountRequest = {
        userId: '', // This would be set by the backend based on auth token
        displayName: formValue.displayName,
        accountType: formValue.accountType,
        initialBalance: formValue.initialBalance,
        enableSpotTrading: formValue.enableSpotTrading,
        enableFuturesTrading: formValue.enableFuturesTrading,
        maxLeverage: formValue.maxLeverage,
      };

      this.tradingAccountService.createAccount(request).subscribe({
        next: () => {
          this.showCreateForm.set(false);
          this.resetForm();
        },
        error: () => {
          // Error handling is done in the service
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Cancel account creation
   */
  cancelCreate(): void {
    this.showCreateForm.set(false);
    this.resetForm();
  }

  /**
   * Get account type display name
   */
  getAccountTypeName(type: AccountType): string {
    return this.tradingAccountService.getAccountTypeInfo(type);
  }

  /**
   * Get account status information
   */
  getAccountStatusInfo(status: AccountStatus): {
    label: string;
    color: string;
  } {
    return this.tradingAccountService.getAccountStatusInfo(status);
  }

  /**
   * Format balance for display
   */
  formatBalance(amount: number): string {
    return this.tradingAccountService.formatBalance(amount);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return this.localizationService.formatDate(new Date(dateString));
  }

  /**
   * Toggle view mode between grid and list
   */
  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  /**
   * Show account details
   */
  showAccountDetails(account: TradingAccount): void {
    this.selectedAccount.set(account);
  }

  /**
   * Close account details
   */
  closeAccountDetails(): void {
    this.selectedAccount.set(null);
  }

  /**
   * Refresh accounts data
   */
  refreshAccounts(): void {
    this.tradingAccountService.refreshAccounts();
  }

  /**
   * Navigate to KYC verification
   */
  navigateToKYC(): void {
    this.router.navigate(['/kyc-verification']);
  }

  /**
   * Get leverage display text
   */
  getLeverageText(leverage: number): string {
    return leverage === 1 ? 'No Leverage' : `${leverage}:1`;
  }

  /**
   * Check if form field has error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.createAccountForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.createAccountForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['min'])
        return `${fieldName} must be greater than ${field.errors['min'].min}`;
      if (field.errors['max'])
        return `${fieldName} must be less than ${field.errors['max'].max}`;
    }
    return '';
  }

  /**
   * Reset form to initial state
   */
  private resetForm(): void {
    this.createAccountForm.reset({
      displayName: '',
      accountType: AccountType.DEMO,
      initialBalance: 10000,
      enableSpotTrading: true,
      enableFuturesTrading: false,
      maxLeverage: 1,
    });
  }

  /**
   * Track by function for ngFor performance optimization
   */
  trackByAccountId(index: number, account: TradingAccount): string {
    return account.id;
  }

  /**
   * Mark all form fields as touched for validation
   */
  private markFormGroupTouched(): void {
    Object.keys(this.createAccountForm.controls).forEach((key) => {
      const control = this.createAccountForm.get(key);
      control?.markAsTouched();
    });
  }
}
