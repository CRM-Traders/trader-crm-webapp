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
import { Client } from '../../../clients/models/clients.model';
import { AlertService } from '../../../../core/services/alert.service';
import { WalletTransactionModalComponent } from './modals/wallet-transaction-modal/wallet-transaction-modal.component';
import { AdminTradingAccountService } from '../client-accounts/services/admin-trading-accounts.service';
import { TradingAccount } from '../client-accounts/models/trading-account.model';
import { TradingOrder, TradingService } from './services/trading-order.service';
import { WalletService } from './services/wallet.service';
import { WalletTransaction, ClientWalletsSummary } from './models/wallet.model';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    WalletTransactionModalComponent,
    HasPermissionDirective,
  ],
  templateUrl: './client-payments.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientPaymentsComponent implements OnInit, OnDestroy {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private adminTradingAccountService = inject(AdminTradingAccountService);
  private tradingService = inject(TradingService);
  private walletService = inject(WalletService);
  private destroy$ = new Subject<void>();

  transactionForm: FormGroup;
  showAddForm = false;
  searchTerm = '';
  tradingSearchTerm = '';
  activeTab: 'transactions' | 'trading' = 'transactions';

  showDepositModal = false;
  showWithdrawModal = false;

  selectedTradingAccountId = '';
  tradingOrders: TradingOrder[] = [];
  loadingTradingHistory = false;

  walletTransactions: WalletTransaction[] = [];
  loadingWalletTransactions = false;

  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;
  hasNextPage = false;
  hasPreviousPage = false;

  transactionTypeFilter = '';
  currencyFilter = '';

  Math = Math;

  walletSummary: ClientWalletsSummary | null = null;
  loadingWalletSummary = false;

  get clientId(): string {
    return this.client?.userId || '';
  }

  get tradingAccounts(): TradingAccount[] {
    return this.adminTradingAccountService.accounts();
  }

  constructor() {
    this.transactionForm = this.fb.group({
      paymentType: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      toAccount: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      expirationDateTime: [''],
      note: [''],
    });
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadTradingAccounts();
      this.loadTradingHistoryForAllAccounts();
      this.loadWalletTransactions();
      this.loadWalletSummary();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredTransactions(): WalletTransaction[] {
    if (!this.searchTerm) {
      return this.walletTransactions;
    }

    const term = this.searchTerm.toLowerCase();
    return this.walletTransactions.filter(
      (transaction) =>
        transaction.id.toLowerCase().includes(term) ||
        transaction.transactionType.toLowerCase().includes(term) ||
        transaction.accountNumber.toLowerCase().includes(term) ||
        (transaction.description &&
          transaction.description.toLowerCase().includes(term))
    );
  }

  get filteredTradingOrders(): TradingOrder[] {
    if (!this.tradingSearchTerm) {
      return this.tradingOrders;
    }

    const term = this.tradingSearchTerm.toLowerCase();
    return this.tradingOrders.filter(
      (order) =>
        order.id.toLowerCase().includes(term) ||
        order.tradingPairSymbol.toLowerCase().includes(term) ||
        order.orderType.toLowerCase().includes(term) ||
        order.side.toLowerCase().includes(term) ||
        order.status.toLowerCase().includes(term)
    );
  }

  get totalDeposits(): number {
    return (
      this.walletSummary?.totalDeposits ||
      this.walletTransactions
        .filter((t) => t.transactionType === 'Deposit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    );
  }

  get totalWithdrawals(): number {
    return (
      this.walletSummary?.totalWithdrawals ||
      this.walletTransactions
        .filter((t) => t.transactionType === 'Withdrawal')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    );
  }

  get netBalance(): number {
    return (
      this.walletSummary?.totalBalance ||
      this.totalDeposits - this.totalWithdrawals
    );
  }

  get totalUsdEquivalent(): number {
    return this.walletSummary?.totalUsdEquivalent || 0;
  }

  get totalAvailableBalance(): number {
    return this.walletSummary?.totalAvailableBalance || 0;
  }

  get totalLockedBalance(): number {
    return this.walletSummary?.totalLockedBalance || 0;
  }

  get depositCount(): number {
    return this.walletTransactions.filter(
      (t) => t.transactionType === 'Deposit'
    ).length;
  }

  get withdrawalCount(): number {
    return this.walletTransactions.filter(
      (t) => t.transactionType === 'Withdrawal'
    ).length;
  }

  get totalTradingOrders(): number {
    return this.walletSummary?.totalTradingOrders || this.tradingOrders.length;
  }

  get totalAccounts(): number {
    return this.walletSummary?.totalAccounts || 0;
  }

  private loadTradingAccounts(): void {
    this.adminTradingAccountService
      .getUserAccounts(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {},
      });
  }

  private loadTradingHistoryForAllAccounts(): void {
    this.tradingAccounts.forEach((account) => {
      this.loadTradingHistory(account.id);
    });
  }

  private loadTradingHistory(accountId: string): void {
    if (!accountId) return;

    this.loadingTradingHistory = true;

    this.tradingService
      .getTradingOrdersPaginated(accountId, 1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const existingIds = this.tradingOrders.map((o) => o.id);
          const newOrders = response.items.filter(
            (o) => !existingIds.includes(o.id)
          );
          this.tradingOrders = [...this.tradingOrders, ...newOrders];
          this.loadingTradingHistory = false;
        },
        error: (error) => {
          this.loadingTradingHistory = false;
        },
      });
  }

  private loadWalletTransactions(): void {
    if (!this.clientId) return;

    this.loadingWalletTransactions = true;

    const filters = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      transactionType: this.transactionTypeFilter || undefined,
      currency: this.currencyFilter || undefined,
    };

    this.walletService
      .getClientTransactionsByUserId(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.walletTransactions = response.items;
          this.totalItems = response.totalCount;
          this.currentPage = response.pageNumber + 1;
          this.pageSize = response.pageSize;
          this.totalPages = response.totalPages;
          this.hasNextPage = response.hasNextPage;
          this.hasPreviousPage = response.hasPreviousPage;
          this.loadingWalletTransactions = false;
        },
        error: (error) => {
          this.loadingWalletTransactions = false;
        },
      });
  }

  private loadWalletSummary(): void {
    if (!this.clientId) return;

    this.loadingWalletSummary = true;

    this.walletService
      .getClientWalletsSummary(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.walletSummary = summary;
          this.loadingWalletSummary = false;
        },
        error: (error) => {
          this.loadingWalletSummary = false;
        },
      });
  }

  onTradingAccountChange(accountId: string): void {
    if (accountId) {
      this.loadTradingHistory(accountId);
    } else {
      this.loadTradingHistoryForAllAccounts();
    }
  }

  openDepositModal(): void {
    this.showDepositModal = true;
  }

  closeDepositModal(): void {
    this.showDepositModal = false;
  }

  openWithdrawModal(): void {
    this.showWithdrawModal = true;
  }

  closeWithdrawModal(): void {
    this.showWithdrawModal = false;
  }

  onTransactionSuccess(): void {
    this.loadWalletTransactions();
    this.loadWalletSummary();
  }

  refreshTransactions(): void {
    this.loadWalletTransactions();
    this.loadWalletSummary();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadWalletTransactions();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadWalletTransactions();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadWalletTransactions();
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.currentPage;
    const pages: number[] = [];

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  exportTransactions(): void {
    this.alertService.info('Export functionality will be implemented soon');
  }

  toggleAddTransaction(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.transactionForm.reset();
    }
  }

  submitTransaction(): void {
    if (this.transactionForm.valid) {
      const formData = this.transactionForm.value;

      this.transactionForm.reset();
      this.showAddForm = false;

      this.alertService.success('Manual transaction created successfully');

      this.loadWalletTransactions();
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }
}
