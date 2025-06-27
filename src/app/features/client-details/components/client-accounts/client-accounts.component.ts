// Updated client-accounts.component.ts with portfolio modal integration

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
import { PortfolioComponent } from './modals/portfolio/portfolio.component';

@Component({
  selector: 'app-client-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PortfolioComponent],
  templateUrl: './client-accounts.component.html',
  styleUrls: ['./client-accounts.component.scss'],
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

  // Portfolio modal state
  showPortfolioModal = false;
  selectedAccountId: string | null = null;

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
            this.alertService.success(`Trading account created successfully`);
            this.toggleCreateModal();
            this.loadAccounts(); // Refresh accounts after creation
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

  // Portfolio Modal Methods
  openPortfolioModal(account: TradingAccount): void {
    console.log('Opening portfolio modal for account:', account.accountNumber);
    // Ensure clean state
    this.closePortfolioModal();

    // Small delay to ensure clean state
    setTimeout(() => {
      this.selectedAccountId = account.id;
      this.showPortfolioModal = true;
      console.log('Portfolio modal state:', {
        showPortfolioModal: this.showPortfolioModal,
        selectedAccountId: this.selectedAccountId
      });
    }, 50);
  }

  closePortfolioModal(): void {
    console.log('Closing portfolio modal');
    this.showPortfolioModal = false;
    this.selectedAccountId = null;
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
