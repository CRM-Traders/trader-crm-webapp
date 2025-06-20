// Updated client-payments.component.ts with wallet transaction modal integration

import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Client } from '../../../clients/models/clients.model';
import { AlertService } from '../../../../core/services/alert.service';
import { WalletTransactionModalComponent } from './modals/wallet-transaction-modal/wallet-transaction-modal.component';

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
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payments & Transactions
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Manage client payments, deposits, withdrawals and transaction
            history
          </p>
        </div>
        <div class="flex justify-between items-center gap-2 mb-6">
                    <button
            type="button"
            (click)="openDepositModal()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Deposit
          </button>
            <button
            type="button"
            (click)="openWithdrawModal()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Withdraw
          </button>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          class="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-green-200 dark:bg-green-700">
              <svg
                class="w-6 h-6 text-green-600 dark:text-green-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">
                Total Deposits
              </p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">
                $12,450.00
              </p>
              <p class="text-xs text-green-700 dark:text-green-300">
                15 transactions
              </p>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-red-200 dark:bg-red-700">
              <svg
                class="w-6 h-6 text-red-600 dark:text-red-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">
                Total Withdrawals
              </p>
              <p class="text-2xl font-bold text-red-900 dark:text-red-100">
                $3,200.00
              </p>
              <p class="text-xs text-red-700 dark:text-red-300">
                8 transactions
              </p>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-blue-200 dark:bg-blue-700">
              <svg
                class="w-6 h-6 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Net Balance
              </p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                $9,250.00
              </p>
              <p class="text-xs text-blue-700 dark:text-blue-300">
                Current balance
              </p>
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-6"
        >
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-purple-200 dark:bg-purple-700">
              <svg
                class="w-6 h-6 text-purple-600 dark:text-purple-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <p
                class="text-sm font-medium text-purple-800 dark:text-purple-200"
              >
                Credit Available
              </p>
              <p
                class="text-2xl font-bold text-purple-900 dark:text-purple-100"
              >
                $2,340.00
              </p>
              <p class="text-xs text-purple-700 dark:text-purple-300">
                Available credit
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Transaction Section (existing form, now collapsible) -->
      <div
        *ngIf="showAddForm"
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Add Manual Transaction
          </h3>
          <button
            type="button"
            (click)="toggleAddTransaction()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Transactions Grid (existing table) -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Transaction History
            </h3>
            <div class="flex items-center space-x-3">
              <!-- Search -->
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 !pl-3 flex items-center pointer-events-none"
                >
                  <svg
                    class="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                </div>
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  class="block w-full !pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Search transactions..."
                />
              </div>
              <!-- Export Button -->
              <button
                type="button"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        <!-- Your existing table code here... -->
        <!-- (I'll keep the existing table structure for brevity) -->
      </div>
    </div>

    <!-- Wallet Transaction Modals -->
    <app-wallet-transaction-modal
      [isVisible]="showDepositModal"
      [clientId]="clientId"
      [transactionType]="'deposit'"
      (onClose)="closeDepositModal()"
      (onSuccess)="onTransactionSuccess()"
    >
    </app-wallet-transaction-modal>

    <app-wallet-transaction-modal
      [isVisible]="showWithdrawModal"
      [clientId]="clientId"
      [transactionType]="'withdraw'"
      (onClose)="closeWithdrawModal()"
      (onSuccess)="onTransactionSuccess()"
    >
    </app-wallet-transaction-modal>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientPaymentsComponent implements OnInit {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  transactionForm: FormGroup;
  showAddForm = false;
  searchTerm = '';

  // Wallet modal state
  showDepositModal = false;
  showWithdrawModal = false;

  get clientId(): string {
    return this.client?.userId || '';
  }

  // Your existing transactions array...
  transactions: Transaction[] = [
    // ... existing transaction data
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
    // Initialize component
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
    // Here you could refresh the transaction list or update summary cards
    this.alertService.success('Transaction completed successfully!');

    // Optionally refresh transaction history
    // this.loadTransactionHistory();
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
