// Updated client-accounts.component.ts with separated wallet modals

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
import {
  AccountStatus,
  AccountType,
  CreateTradingAccountRequest,
  TradingAccount,
} from './models/trading-account.model';
import { PortfolioComponent } from './modals/portfolio/portfolio.component';
import { WalletModalComponent } from './modals/wallet-modal/wallet-modal.component';
import { AddWalletModalComponent } from './modals/add-wallet-modal/add-wallet-modal.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-client-accounts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PortfolioComponent,
    WalletModalComponent,
    AddWalletModalComponent,
    HasPermissionDirective,
  ],
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

  // Wallet modal state (for managing existing wallets)
  showWalletModal = false;
  selectedWalletAccountId: string | null = null;
  selectedAccountNumber: string = '';

  // Add wallet modal state (for creating new wallets)
  showAddWalletModal = false;
  selectedAddWalletAccountId: string | null = null;
  selectedAddWalletAccountNumber: string = '';

  // Context menu state
  showContextMenuFlag = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuAccount: TradingAccount | null = null;

  // Dropdown menu state
  selectedMenuAccount: TradingAccount | null = null;
  dropdownPosition = { x: 0, y: 0 };

  // Expose enums to template
  AccountType = AccountType;
  AccountStatus = AccountStatus;

  constructor() {
    this.accountForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      accountType: [AccountType.Trading, [Validators.required]],
    });

    // Close menus when clicking outside
    document.addEventListener('click', (event) => {
      this.hideContextMenu();
      this.hideDropdownMenu();
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

    // Remove document click listener
    document.removeEventListener('click', this.hideContextMenu);
    document.removeEventListener('click', this.hideDropdownMenu);
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
        this.getAccountTypeInfo(account.accountType)
          .toLowerCase()
          .includes(term) ||
        account.status.toLowerCase().includes(term)
    );
  }

  loadAccounts(): void {
    this.adminTradingAccountService
      .getUserAccounts(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {},
      });
  }

  getActiveAccountsCount(): number {
    return this.accounts.filter(
      (account) => account.status === AccountStatus.ACTIVE
    ).length;
  }

  getTotalBalance(): number {
    return this.accounts.reduce((total, account) => {
      return total + account.initialBalance;
    }, 0);
  }

  getVerifiedAccountsCount(): number {
    return this.accounts.filter((account) => account.verifiedAt !== null)
      .length;
  }

  getAverageMaxLeverage(): number {
    if (this.accounts.length === 0) return 0;
    const total = this.accounts.reduce(
      (sum, account) => sum + account.maxLeverage,
      0
    );
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
        accountType: Number(formData.accountType),
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
          error: (error) => {},
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
          error: (error) => {},
        });
    }
  }

  deactivateAccount(account: TradingAccount): void {
    if (this.clientId) {
      this.adminTradingAccountService
        .deactivateAccount(account.id, this.clientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {},
        });
    }
  }

  suspendAccount(account: TradingAccount): void {
    if (this.clientId) {
      this.adminTradingAccountService
        .suspendAccount(account.id, this.clientId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (error) => {},
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
    this.closePortfolioModal();

    // Small delay to ensure clean state
    setTimeout(() => {
      this.selectedAccountId = account.id;
      this.showPortfolioModal = true;
    }, 50);
  }

  closePortfolioModal(): void {
    this.showPortfolioModal = false;
    this.selectedAccountId = null;
  }

  // Wallet Modal Methods (for managing existing wallets)
  openWalletModal(account: TradingAccount): void {
    this.closeWalletModal();

    // Small delay to ensure clean state
    setTimeout(() => {
      this.selectedWalletAccountId = account.id;
      this.selectedAccountNumber = account.accountNumber;
      this.showWalletModal = true;
    }, 50);
  }

  closeWalletModal(): void {
    this.showWalletModal = false;
    this.selectedWalletAccountId = null;
    this.selectedAccountNumber = '';
  }

  // Add Wallet Modal Methods (for creating new wallets)
  openAddWalletModal(account: TradingAccount): void {
    this.closeAddWalletModal();

    // Small delay to ensure clean state
    setTimeout(() => {
      this.selectedAddWalletAccountId = account.id;
      this.selectedAddWalletAccountNumber = account.accountNumber;
      this.showAddWalletModal = true;
    }, 50);
  }

  closeAddWalletModal(): void {
    this.showAddWalletModal = false;
    this.selectedAddWalletAccountId = null;
    this.selectedAddWalletAccountNumber = '';
  }

  // Handle wallet creation success
  onWalletCreated(): void {
    this.closeAddWalletModal();
    this.loadAccounts();
  }

  // Context Menu Methods
  showContextMenu(event: MouseEvent, account: TradingAccount): void {
    event.preventDefault();
    event.stopPropagation();

    this.hideDropdownMenu(); // Close dropdown if open

    this.contextMenuAccount = account;
    this.contextMenuPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    this.showContextMenuFlag = true;

    // Adjust position if menu would go off screen
    setTimeout(() => {
      this.adjustContextMenuPosition();
    }, 0);
  }

  hideContextMenu(): void {
    this.showContextMenuFlag = false;
    this.contextMenuAccount = null;
  }

  contextMenuAction(action: string): void {
    if (!this.contextMenuAccount) return;

    const account = this.contextMenuAccount;
    this.hideContextMenu();

    switch (action) {
      case 'portfolio':
        this.openPortfolioModal(account);
        break;
      case 'wallets':
        this.openWalletModal(account);
        break;
      case 'addWallet':
        this.openAddWalletModal(account);
        break;
    }
  }

  // Dropdown Menu Methods
  toggleAccountMenu(account: TradingAccount, event: MouseEvent): void {
    event.stopPropagation();

    this.hideContextMenu(); // Close context menu if open

    if (this.selectedMenuAccount?.id === account.id) {
      this.hideDropdownMenu();
      return;
    }

    this.selectedMenuAccount = account;
    const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
    this.dropdownPosition = {
      x: buttonRect.right - 180, // Position dropdown to the left of the button
      y: buttonRect.bottom + 5,
    };

    // Adjust position if menu would go off screen
    setTimeout(() => {
      this.adjustDropdownPosition();
    }, 0);
  }

  hideDropdownMenu(): void {
    this.selectedMenuAccount = null;
  }

  dropdownAction(action: string): void {
    if (!this.selectedMenuAccount) return;

    const account = this.selectedMenuAccount;
    this.hideDropdownMenu();

    switch (action) {
      case 'portfolio':
        this.openPortfolioModal(account);
        break;
      case 'wallets':
        this.openWalletModal(account);
        break;
      case 'addWallet':
        this.openAddWalletModal(account);
        break;
    }
  }

  // Menu Position Adjustment Methods
  private adjustContextMenuPosition(): void {
    const menu = document.querySelector(
      '.fixed.bg-white.dark\\:bg-gray-800'
    ) as HTMLElement;
    if (!menu) return;

    const menuRect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let { x, y } = this.contextMenuPosition;

    // Adjust horizontal position
    if (x + menuRect.width > windowWidth) {
      x = windowWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (y + menuRect.height > windowHeight) {
      y = windowHeight - menuRect.height - 10;
    }

    this.contextMenuPosition = { x: Math.max(10, x), y: Math.max(10, y) };
  }

  private adjustDropdownPosition(): void {
    const dropdown = document.querySelector(
      '.fixed.bg-white.dark\\:bg-gray-800'
    ) as HTMLElement;
    if (!dropdown) return;

    const dropdownRect = dropdown.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let { x, y } = this.dropdownPosition;

    // Adjust horizontal position
    if (x + dropdownRect.width > windowWidth) {
      x = windowWidth - dropdownRect.width - 10;
    }
    if (x < 10) {
      x = 10;
    }

    // Adjust vertical position
    if (y + dropdownRect.height > windowHeight) {
      y = windowHeight - dropdownRect.height - 10;
    }

    this.dropdownPosition = { x, y: Math.max(10, y) };
  }

  // Utility methods
  getAccountTypeInfo(accountType: AccountType | string | number): string {
    return this.adminTradingAccountService.getAccountTypeInfo(accountType);
  }

  getAccountStatusInfo(status: AccountStatus): {
    label: string;
    color: string;
  } {
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
