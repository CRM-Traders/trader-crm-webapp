// src/app/features/clients/components/client-details/sections/client-accounts/client-accounts.component.ts

import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { AdminTradingAccountService } from './services/admin-trading-accounts.service';
import { AccountStatus, AccountType, CreateTradingAccountRequest, TradingAccount } from './models/trading-account.model';

@Component({
  selector: 'app-client-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './client-accounts.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .modal-backdrop {
        @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center;
      }
      .modal-content {
        @apply bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4;
      }
    `,
  ],
})
export class ClientAccountsComponent implements OnInit, OnDestroy {
  @Input() clientId!: string;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private adminTradingAccountService = inject(AdminTradingAccountService);
  private destroy$ = new Subject<void>();

  accountForm: FormGroup;
  showCreateModal = false;
  searchTerm = '';
  Math = Math;

  // Expose enums to template
  AccountType = AccountType;
  AccountStatus = AccountStatus;

  constructor() {
    this.accountForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadAccounts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Getters for reactive data
  get accounts() {
    return this.adminTradingAccountService.accounts();
  }

  get loading() {
    return this.adminTradingAccountService.loading();
  }

  get filteredAccounts(): TradingAccount[] {
    if (!this.searchTerm) {
      return this.accounts;
    }

    const term = this.searchTerm.toLowerCase();
    return this.accounts.filter(
      (account) =>
        account.accountNumber.toLowerCase().includes(term) ||
        account.displayName.toLowerCase().includes(term) ||
        this.getAccountTypeInfo(account.accountType).toLowerCase().includes(term) ||
        account.status.toLowerCase().includes(term)
    );
  }

  loadAccounts(): void {
    this.adminTradingAccountService
      .getUserAccounts(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading accounts:', error);
        },
      });
  }

  getActiveAccountsCount(): number {
    return this.accounts.filter((account) => account.status === AccountStatus.ACTIVE).length;
  }

  getTotalBalance(): number {
    return this.accounts.reduce((total, account) => {
      return total + account.initialBalance;
    }, 0);
  }

  getVerifiedAccountsCount(): number {
    return this.accounts.filter((account) => account.verifiedAt !== null).length;
  }

  getAverageMaxLeverage(): number {
    if (this.accounts.length === 0) return 0;
    const total = this.accounts.reduce((sum, account) => sum + account.maxLeverage, 0);
    return total / this.accounts.length;
  }

  toggleCreateModal(): void {
    this.showCreateModal = !this.showCreateModal;
    if (!this.showCreateModal) {
      this.accountForm.reset();
    }
  }

  submitAccount(): void {
    if (this.accountForm.valid && this.clientId) {
      const formData = this.accountForm.value;

      const request: CreateTradingAccountRequest = {
        displayName: formData.displayName,
        clientUserId: this.clientId,
      };

      this.adminTradingAccountService
        .createAccount(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (newAccount) => {
            this.alertService.success(`Trading account "${newAccount.displayName}" created successfully`);
            this.toggleCreateModal();
          },
          error: (error) => {
            console.error('Error creating account:', error);
          },
        });
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }

  activateAccount(account: TradingAccount): void {
    if (this.clientId) {
      this.adminTradingAccountService
        .activateAccount(account.id, this.clientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error activating account:', error);
          },
        });
    }
  }

  deactivateAccount(account: TradingAccount): void {
    if (this.clientId) {
      this.adminTradingAccountService
        .deactivateAccount(account.id, this.clientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error deactivating account:', error);
          },
        });
    }
  }

  suspendAccount(account: TradingAccount): void {
    if (this.clientId) {
      this.adminTradingAccountService
        .suspendAccount(account.id, this.clientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {
            console.error('Error suspending account:', error);
          },
        });
    }
  }

  refreshAccounts(): void {
    if (this.clientId) {
      this.adminTradingAccountService.refreshAccounts(this.clientId);
    }
  }

  // Utility methods
  getAccountTypeInfo(accountType: AccountType): string {
    return this.adminTradingAccountService.getAccountTypeInfo(accountType);
  }

  getAccountStatusInfo(status: AccountStatus): { label: string; color: string } {
    return this.adminTradingAccountService.getAccountStatusInfo(status);
  }

  canTrade(account: TradingAccount): boolean {
    return this.adminTradingAccountService.canTrade(account);
  }

  formatBalance(amount: number): string {
    return this.adminTradingAccountService.formatBalance(amount);
  }

  formatDate(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(date: string | null): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
}
