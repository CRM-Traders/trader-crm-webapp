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

import { TradingAccountService } from './services/trading-account.service';
import {
  AccountStatus,
  AccountType,
  CreateTradingAccountRequest,
  TradingAccount,
} from './models/trading-account.model';

@Component({
  selector: 'app-trading-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './trading-accounts.component.html',
})
export class TradingAccountsComponent implements OnInit {
  private tradingAccountService = inject(TradingAccountService);
  private alertService = inject(AlertService);
  private localizationService = inject(LocalizationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Component state
  readonly accounts = signal<TradingAccount[]>([]);
  readonly loading = signal<boolean>(false);
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
    });
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  /**
   * Load user's trading accounts
   */
  loadAccounts(): void {
    this.loading.set(true);
    this.tradingAccountService.getUserAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading accounts:', error);
        this.alertService.error('Failed to load trading accounts');
        this.loading.set(false);
      },
    });
  }

  /**
   * Create new trading account
   */
  createAccount(): void {
    if (this.createAccountForm.valid) {
      const formValue = this.createAccountForm.value;
      const request: CreateTradingAccountRequest = {
        displayName: formValue.displayName,
      };

      this.loading.set(true);
      this.tradingAccountService.createAccount(request).subscribe({
        next: () => {
          this.showCreateForm.set(false);
          this.resetForm();
          this.loadAccounts(); // Reload accounts
          this.alertService.success('Trading account created successfully');
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error creating account:', error);
          this.alertService.error('Failed to create trading account');
          this.loading.set(false);
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
   * Open trading platform for account
   */
  openTradingPlatform(account: TradingAccount): void {
    if (!this.canTrade(account)) {
      this.alertService.warning(
        'Account must be active to access trading platform.'
      );
      return;
    }

    this.tradingAccountService
      .setTraidingAccount(account.id)
      .subscribe((result: any) => {
        if (result) {
          this.tradingAccountService.navigateToTradingPlatform(result, account);
        }
      });
  }

  /**
   * Check if account can trade
   */
  canTrade(account: TradingAccount): boolean {
    return account.status === AccountStatus.ACTIVE;
  }

  /**
   * Get account type display name
   */
  getAccountTypeName(type: AccountType): string {
    switch (type) {
      case AccountType.DEMO:
        return 'Demo Account';
      case AccountType.REAL:
        return 'Live Account';
      case AccountType.PAPER:
        return 'Paper Trading';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get account type CSS classes
   */
  getAccountTypeClasses(type: AccountType): string {
    switch (type) {
      case AccountType.DEMO:
        return 'bg-blue-100 text-blue-800';
      case AccountType.REAL:
        return 'bg-green-100 text-green-800';
      case AccountType.PAPER:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get account status CSS classes
   */
  getAccountStatusClasses(status: AccountStatus): string {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'text-green-600';
      case AccountStatus.PENDING:
        return 'text-yellow-600';
      case AccountStatus.SUSPENDED:
      case AccountStatus.CLOSED:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get status dot CSS classes
   */
  getStatusDotClasses(status: AccountStatus): string {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'bg-green-600';
      case AccountStatus.PENDING:
        return 'bg-yellow-600';
      case AccountStatus.SUSPENDED:
      case AccountStatus.CLOSED:
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
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
    this.loadAccounts();
  }

  /**
   * Get total balance across all accounts
   */
  getTotalBalance(): number {
    return this.accounts().reduce(
      (total, account) => total + account.initialBalance,
      0
    );
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
      if (field.errors['minlength'])
        return `${fieldName} must be at least 3 characters`;
      if (field.errors['maxlength'])
        return `${fieldName} must be no more than 50 characters`;
    }
    return '';
  }

  /**
   * Reset form to initial state
   */
  private resetForm(): void {
    this.createAccountForm.reset({
      displayName: '',
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
