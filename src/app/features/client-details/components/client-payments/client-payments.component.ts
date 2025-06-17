// src/app/features/clients/components/client-details/sections/client-payments/client-payments.component.ts

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payments & Transactions
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Manage client payments, deposits, withdrawals and transaction history
        </p>
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

      <!-- Add Transaction Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Add New Transaction
          </h3>
          <button
            type="button"
            (click)="toggleAddTransaction()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
            {{ showAddForm ? 'Cancel' : 'Add Transaction' }}
          </button>
        </div>

        <div
          *ngIf="showAddForm"
          class="border-t border-gray-200 dark:border-gray-700 pt-6"
        >
          <form [formGroup]="transactionForm" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Payment Type -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Payment Type <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="paymentType"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Payment Type</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="bonus">Bonus</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="commission">Commission</option>
                </select>
              </div>

              <!-- Payment Method -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Payment Method <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="paymentMethod"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Payment Method</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="skrill">Skrill</option>
                  <option value="neteller">Neteller</option>
                  <option value="cryptocurrency">Cryptocurrency</option>
                  <option value="wire-transfer">Wire Transfer</option>
                </select>
              </div>

              <!-- To Account -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  To Account <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="toAccount"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Account</option>
                  <option value="TA-001234">TA-001234 (MT4 - USD)</option>
                  <option value="TA-001235">TA-001235 (MT5 - EUR)</option>
                  <option value="TA-001236">TA-001236 (cTrader - USD)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Amount -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Amount <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <div
                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  >
                    <span class="text-gray-500 dark:text-gray-400 sm:text-sm"
                      >$</span
                    >
                  </div>
                  <input
                    type="number"
                    formControlName="amount"
                    step="0.01"
                    min="0"
                    class="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <!-- Expiration Date & Time -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Expiration Date & Time
                </label>
                <input
                  type="datetime-local"
                  formControlName="expirationDateTime"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <!-- Add Note -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Transaction Note
              </label>
              <textarea
                formControlName="note"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Add any additional notes for this transaction..."
              ></textarea>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="toggleAddTransaction()"
                class="px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="submitTransaction()"
                [disabled]="transactionForm.invalid"
                class="px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Process Transaction
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Transactions Grid -->
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
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
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
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Search transactions..."
                />
              </div>
              <!-- Export Button -->
              <button
                type="button"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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

        <!-- Table -->
        <div class="overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Transaction ID
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Affiliate
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Original Agent
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Payment Type
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Trading Account
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Payment Aggregator
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Payment Method
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Date & Time
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Note
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
            >
              <tr
                *ngFor="let transaction of filteredTransactions"
                class="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  {{ transaction.id }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ transaction.affiliate }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ transaction.originalAgent }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        transaction.paymentType === 'deposit',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        transaction.paymentType === 'withdrawal',
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                        transaction.paymentType === 'bonus',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                        transaction.paymentType === 'adjustment'
                    }"
                  >
                    {{ transaction.paymentType | titlecase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {{ transaction.amount | currency : transaction.currency }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ transaction.tradingAccount }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ transaction.paymentAggregator }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {{ transaction.paymentMethod }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ transaction.dateTime | date : 'medium' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [ngClass]="{
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200':
                        transaction.status === 'completed',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                        transaction.status === 'pending',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                        transaction.status === 'failed',
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                        transaction.status === 'cancelled'
                    }"
                  >
                    {{ transaction.status | titlecase }}
                  </span>
                </td>
                <td
                  class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate"
                >
                  {{ transaction.note || '-' }}
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  <div class="flex items-center space-x-2">
                    <button
                      type="button"
                      class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      title="View Details"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      title="Edit Transaction"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          class="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 flex justify-between sm:hidden">
              <button
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
            <div
              class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"
            >
              <div>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span class="font-medium">1</span> to
                  <span class="font-medium">10</span> of
                  <span class="font-medium">{{ transactions.length }}</span>
                  results
                </p>
              </div>
              <div>
                <nav
                  class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span class="sr-only">Previous</span>
                    <svg
                      class="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    1
                  </button>
                  <button
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span class="sr-only">Next</span>
                    <svg
                      class="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

  transactions: Transaction[] = [
    {
      id: 'TXN-001',
      transactionType: 'deposit',
      affiliate: 'Partner A',
      originalAgent: 'John Smith',
      paymentType: 'deposit',
      amount: 1000,
      currency: 'USD',
      tradingAccount: 'TA-001234',
      paymentAggregator: 'PaymentHub',
      paymentMethod: 'Credit Card',
      dateTime: new Date('2024-01-15T10:30:00'),
      status: 'completed',
      note: 'Initial deposit from new client',
    },
    {
      id: 'TXN-002',
      transactionType: 'bonus',
      affiliate: 'Partner A',
      originalAgent: 'John Smith',
      paymentType: 'bonus',
      amount: 100,
      currency: 'USD',
      tradingAccount: 'TA-001234',
      paymentAggregator: 'Internal',
      paymentMethod: 'System Credit',
      dateTime: new Date('2024-01-15T10:35:00'),
      status: 'completed',
      note: 'Welcome bonus - 10% of initial deposit',
    },
    {
      id: 'TXN-003',
      transactionType: 'withdrawal',
      affiliate: 'Partner A',
      originalAgent: 'Sarah Johnson',
      paymentType: 'withdrawal',
      amount: 500,
      currency: 'USD',
      tradingAccount: 'TA-001234',
      paymentAggregator: 'PaymentHub',
      paymentMethod: 'Bank Transfer',
      dateTime: new Date('2024-01-20T14:20:00'),
      status: 'pending',
      note: 'Withdrawal request - pending approval',
    },
    {
      id: 'TXN-004',
      transactionType: 'deposit',
      affiliate: 'Partner A',
      originalAgent: 'John Smith',
      paymentType: 'deposit',
      amount: 2500,
      currency: 'USD',
      tradingAccount: 'TA-001235',
      paymentAggregator: 'CryptoGateway',
      paymentMethod: 'Bitcoin',
      dateTime: new Date('2024-01-25T09:15:00'),
      status: 'completed',
      note: 'Additional deposit via cryptocurrency',
    },
    {
      id: 'TXN-005',
      transactionType: 'adjustment',
      affiliate: 'Partner A',
      originalAgent: 'Manager',
      paymentType: 'adjustment',
      amount: -50,
      currency: 'USD',
      tradingAccount: 'TA-001234',
      paymentAggregator: 'Internal',
      paymentMethod: 'Manual Adjustment',
      dateTime: new Date('2024-01-26T16:45:00'),
      status: 'completed',
      note: 'Trading fee adjustment',
    },
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
        paymentAggregator: 'PaymentHub', // Default aggregator
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

      this.alertService.success('Transaction created successfully');
    } else {
      this.alertService.error('Please fill in all required fields');
    }
  }
}
