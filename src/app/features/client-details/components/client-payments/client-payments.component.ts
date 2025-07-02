// Updated client-payments.component.ts with trading history integration

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

interface Transaction {
  id: string;
  transactionType: string;
  affiliate: string;
  originalAgent: string;
  paymentType: string;
  amount: number;
  currency: string;
  tradingAccount: string;
  paymentAggregator: string;
  paymentMethod: string;
  dateTime: Date;
  status: string;
  note: string;
}

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    WalletTransactionModalComponent,
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
  private tradingService = inject(TradingService); // You'll need to create this service
  private destroy$ = new Subject<void>();

  transactionForm: FormGroup;
  showAddForm = false;
  searchTerm = '';
  tradingSearchTerm = '';
  activeTab: 'transactions' | 'trading' = 'transactions';

  // Wallet modal state
  showDepositModal = false;
  showWithdrawModal = false;

  // Trading history state
  selectedTradingAccountId = '';
  tradingOrders: TradingOrder[] = [];
  loadingTradingHistory = false;

  get clientId(): string {
    return this.client?.userId || '';
  }

  get tradingAccounts(): TradingAccount[] {
    return this.adminTradingAccountService.accounts();
  }

  // Mock transactions data (replace with actual service calls)
  transactions: Transaction[] = [
    {
      id: 'TXN-001',
      transactionType: 'deposit',
      affiliate: 'Direct',
      originalAgent: 'Admin',
      paymentType: 'deposit',
      amount: 1000,
      currency: 'USD',
      tradingAccount: 'ACC-001',
      paymentAggregator: 'Wallet',
      paymentMethod: 'Bank Transfer',
      dateTime: new Date('2024-01-15T10:30:00'),
      status: 'completed',
      note: 'Initial deposit'
    },
    // Add more mock data as needed
  ];

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
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredTransactions(): Transaction[] {
    if (!this.searchTerm) {
      return this.transactions;
    }

    const term = this.searchTerm.toLowerCase();
    return this.transactions.filter(
      (transaction) =>
        transaction.id.toLowerCase().includes(term) ||
        transaction.paymentType.toLowerCase().includes(term) ||
        transaction.paymentMethod.toLowerCase().includes(term) ||
        transaction.status.toLowerCase().includes(term) ||
        transaction.note.toLowerCase().includes(term)
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

  // Summary calculations
  get totalDeposits(): number {
    return this.transactions
      .filter(t => t.transactionType === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get totalWithdrawals(): number {
    return this.transactions
      .filter(t => t.transactionType === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get netBalance(): number {
    return this.totalDeposits - this.totalWithdrawals;
  }

  get depositCount(): number {
    return this.transactions.filter(t => t.transactionType === 'deposit').length;
  }

  get withdrawalCount(): number {
    return this.transactions.filter(t => t.transactionType === 'withdraw').length;
  }

  get totalTradingOrders(): number {
    return this.tradingOrders.length;
  }

  private loadTradingAccounts(): void {
    this.adminTradingAccountService
      .getUserAccounts(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading trading accounts:', error);
        },
      });
  }

  private loadTradingHistoryForAllAccounts(): void {
    this.tradingAccounts.forEach(account => {
      this.loadTradingHistory(account.id);
    });
  }

  private loadTradingHistory(accountId: string): void {
    if (!accountId) return;

    this.loadingTradingHistory = true;
    
    this.tradingService
      .getTradingOrdersPaginated(accountId, 1, 100) // Get first 100 orders
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Merge orders from different accounts
          const existingIds = this.tradingOrders.map(o => o.id);
          const newOrders = response.items.filter(o => !existingIds.includes(o.id));
          this.tradingOrders = [...this.tradingOrders, ...newOrders];
          this.loadingTradingHistory = false;
        },
        error: (error) => {
          console.error('Error loading trading history:', error);
          this.loadingTradingHistory = false;
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

  // Wallet Modal Methods
  openDepositModal(): void {
    console.log('Opening deposit modal for client:', this.clientId);
    this.showDepositModal = true;
  }

  closeDepositModal(): void {
    console.log('Closing deposit modal');
    this.showDepositModal = false;
  }

  openWithdrawModal(): void {
    console.log('Opening withdraw modal for client:', this.clientId);
    this.showWithdrawModal = true;
  }

  closeWithdrawModal(): void {
    console.log('Closing withdraw modal');
    this.showWithdrawModal = false;
  }

  onTransactionSuccess(): void {
    console.log('Transaction successful - refreshing data');
    this.alertService.success('Transaction completed successfully!');
    
    // Refresh data
    this.loadTransactionHistory();
  }

  private loadTransactionHistory(): void {
    // Implement actual transaction history loading
    // This would typically call a service to fetch real transaction data
  }

  exportTransactions(): void {
    // Implement export functionality
    console.log('Exporting transactions...');
    this.alertService.info('Export functionality will be implemented soon');
  }

  // Existing methods...
  toggleAddTransaction(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.transactionForm.reset();
    }
  }

  submitTransaction(): void {
    if (this.transactionForm.valid) {
      const formData = this.transactionForm.value;

      // Create new transaction object
      const newTransaction: Transaction = {
        id: `TXN-${String(this.transactions.length + 1).padStart(3, '0')}`,
        transactionType: formData.paymentType,
        affiliate: this.client.affiliateName || 'Direct',
        originalAgent: 'Current User', // Replace with actual user
        paymentType: formData.paymentType,
        amount: formData.amount,
        currency: 'USD', // Default currency
        tradingAccount: formData.toAccount,
        paymentAggregator: 'Manual Entry', // For manual transactions
        paymentMethod: formData.paymentMethod,
        dateTime: new Date(),
        status: 'pending',
        note: formData.note || '',
      };

      // Add to transactions list
      this.transactions.unshift(newTransaction);

      // Reset form and hide
      this.transactionForm.reset();
      this.showAddForm = false;

      this.alertService.success('Manual transaction created successfully');
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }
}