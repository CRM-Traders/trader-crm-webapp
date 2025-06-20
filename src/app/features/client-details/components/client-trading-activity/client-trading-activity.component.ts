// Updated client-trading-activity.component.ts

import { Component, inject, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';
import { TradingActivityService } from './services/trading-activity.service';
import { AdminTradingAccountService } from '../client-accounts/services/admin-trading-accounts.service';
import { TradingOrder, TradingActivitySummary, TradingActivityFilters } from './models/trading-activity.model';
import { TradingAccount } from '../client-accounts/models/trading-account.model';

@Component({
  selector: 'app-client-trading-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Trading Activity
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          View client's trading history and performance
        </p>
      </div>

      <!-- Trading Account Selection -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Select Trading Account
          </h3>
          <button
            type="button"
            (click)="refreshTradingAccounts()"
            [disabled]="loadingAccounts"
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>

        <!-- Account Selection -->
        <div *ngIf="!loadingAccounts && tradingAccounts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let account of tradingAccounts"
            (click)="selectTradingAccount(account)"
            class="p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
            [ngClass]="{
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20': selectedAccountId === account.id,
              'border-gray-200 dark:border-gray-600': selectedAccountId !== account.id
            }"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ account.displayName }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ account.accountNumber }}</p>
              </div>
              <!-- <div class="text-right">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="getAccountTypeColorClass(account.accountType)">
                  {{ getAccountTypeDisplay(account.accountType) }}
                </span>
              </div> -->
            </div>
          </div>
        </div>

        <!-- Loading Accounts -->
        <div *ngIf="loadingAccounts" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600 dark:text-gray-400">Loading accounts...</span>
        </div>

        <!-- No Accounts -->
        <div *ngIf="!loadingAccounts && tradingAccounts.length === 0" class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No trading accounts</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This client has no trading accounts available.
          </p>
        </div>
      </div>

      <!-- Trading Summary Cards -->
      <div *ngIf="selectedAccountId && summary" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-green-200 dark:bg-green-700">
              <svg class="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-green-800 dark:text-green-200">Total Orders</p>
              <p class="text-2xl font-bold text-green-900 dark:text-green-100">{{ summary.totalTrades }}</p>
              <p class="text-xs text-green-700 dark:text-green-300">{{ summary.closedTrades }} closed, {{ summary.openTrades }} open</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-blue-200 dark:bg-blue-700">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-200">Total Volume</p>
              <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{{ formatNumber(summary.totalVolume, 2) }}</p>
              <p class="text-xs text-blue-700 dark:text-blue-300">Lots traded</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-purple-200 dark:bg-purple-700">
              <svg class="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-purple-800 dark:text-purple-200">Win Rate</p>
              <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">{{ formatNumber(summary.winRate, 1) }}%</p>
              <p class="text-xs text-purple-700 dark:text-purple-300">Success ratio</p>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-6">
          <div class="flex items-center">
            <div class="p-3 rounded-full bg-orange-200 dark:bg-orange-700">
              <svg class="w-6 h-6 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-orange-800 dark:text-orange-200">Net P&L</p>
              <p class="text-2xl font-bold" [ngClass]="{
                  'text-green-900 dark:text-green-100': summary.netPnL >= 0,
                  'text-red-900 dark:text-red-100': summary.netPnL < 0
                }">
                {{ formatCurrency(summary.netPnL) }}
              </p>
              <p class="text-xs text-orange-700 dark:text-orange-300">Total profit/loss</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div *ngIf="selectedAccountId" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              [(ngModel)]="filters.status"
              (ngModelChange)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Symbol Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              [(ngModel)]="filters.symbol"
              (ngModelChange)="applyFilters()"
              placeholder="e.g. EURUSD"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <!-- Order Type Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Type</label>
            <select
              [(ngModel)]="filters.orderType"
              (ngModelChange)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="">All Types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="buy_limit">Buy Limit</option>
              <option value="sell_limit">Sell Limit</option>
              <option value="buy_stop">Buy Stop</option>
              <option value="sell_stop">Sell Stop</option>
            </select>
          </div>

          <!-- Clear Filters -->
          <div class="flex items-end">
            <button
              type="button"
              (click)="clearFilters()"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Trading Activity Grid -->
      <div *ngIf="selectedAccountId" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Trading Orders</h3>
            <div class="flex items-center space-x-3">
              <!-- Search -->
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  class="block w-full !pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Search orders..."
                />
              </div>

              <!-- Refresh Button -->
              <button
                type="button"
                (click)="refreshOrders()"
                [disabled]="loading"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>

              <!-- Export Button -->
              <button
                type="button"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600 dark:text-gray-400">Loading trading activity...</span>
        </div>

        <!-- Table -->
        <div *ngIf="!loading" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700/30">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Open Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Close Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profit/Loss</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Open Time</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Close Time</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700/30">
              <tr *ngFor="let order of filteredOrders" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                  {{ order.orderId }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                  {{ order.symbol }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="getOrderTypeColorClass(order.orderType)">
                    {{ getOrderTypeDisplay(order.orderType) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatNumber(order.volume, 2) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatNumber(order.openPrice, 5) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ order.closePrice ? formatNumber(order.closePrice, 5) : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold"
                    [ngClass]="{
                      'text-green-600 dark:text-green-400': order.profit && order.profit >= 0,
                      'text-red-600 dark:text-red-400': order.profit && order.profit < 0,
                      'text-gray-500 dark:text-gray-400': !order.profit
                    }">
                  {{ order.profit ? formatCurrency(order.profit) : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [ngClass]="getStatusColorClass(order.status, order.profit)">
                    {{ order.status | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(order.openTime) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ order.closeTime ? formatDate(order.closeTime) : '-' }}
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="filteredOrders.length === 0 && !loading">
                <td colspan="10" class="px-6 py-12 text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No trading orders</h3>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No orders found for the selected account and filters.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
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
export class ClientTradingActivityComponent implements OnInit, OnDestroy, OnChanges {
  @Input() client!: Client;

  private alertService = inject(AlertService);
  private tradingActivityService = inject(TradingActivityService);
  private adminTradingAccountService = inject(AdminTradingAccountService);
  private destroy$ = new Subject<void>();

  searchTerm = '';
  selectedAccountId: string | null = null;

  filters: Partial<TradingActivityFilters> = {
    status: '',
    symbol: '',
    orderType: '',
    pageIndex: 1,
    pageSize: 50
  };

  ngOnInit(): void {
    if (this.client?.id) {
      this.loadTradingAccounts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['client'] && this.client?.id) {
      this.loadTradingAccounts();
    }
  }

  // Getters for reactive data
  get tradingAccounts(): TradingAccount[] {
    return this.adminTradingAccountService.accounts();
  }

  get loadingAccounts(): boolean {
    return this.adminTradingAccountService.loading();
  }

  get orders(): TradingOrder[] {
    return this.tradingActivityService.orders();
  }

  get summary(): TradingActivitySummary | null {
    return this.tradingActivityService.summary();
  }

  get loading(): boolean {
    return this.tradingActivityService.loading();
  }

  get filteredOrders(): TradingOrder[] {
    if (!this.searchTerm) {
      return this.orders;
    }

    const term = this.searchTerm.toLowerCase();
    return this.orders.filter(order =>
      order.orderId.toLowerCase().includes(term) ||
      order.symbol.toLowerCase().includes(term) ||
      order.orderType.toLowerCase().includes(term) ||
      order.status.toLowerCase().includes(term)
    );
  }

  private loadTradingAccounts(): void {
    if (!this.client?.id) return;

    this.adminTradingAccountService
      .getUserAccounts(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading trading accounts:', error);
        },
      });
  }

  refreshTradingAccounts(): void {
    if (this.client?.id) {
      this.adminTradingAccountService.refreshAccounts(this.client.id);
    }
  }

  selectTradingAccount(account: TradingAccount): void {
    console.log('Selected trading account:', account);
    this.selectedAccountId = account.id;
    this.loadTradingActivity();
  }

  private loadTradingActivity(): void {
    if (!this.selectedAccountId) return;

    this.tradingActivityService
      .getTradingOrders(this.selectedAccountId, this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading trading activity:', error);
        },
      });
  }

  refreshOrders(): void {
    if (this.selectedAccountId) {
      this.tradingActivityService.refreshOrders(this.selectedAccountId, this.filters);
    }
  }

  applyFilters(): void {
    if (this.selectedAccountId) {
      this.filters.pageIndex = 1; // Reset to first page when filtering
      this.loadTradingActivity();
    }
  }

  clearFilters(): void {
    this.filters = {
      status: '',
      symbol: '',
      orderType: '',
      pageIndex: 1,
      pageSize: 50
    };
    this.searchTerm = '';

    if (this.selectedAccountId) {
      this.loadTradingActivity();
    }
  }

  // Utility methods
  getAccountTypeDisplay(accountType: string): string {
    return this.adminTradingAccountService.getAccountTypeInfo(accountType as any);
  }

  getAccountTypeColorClass(accountType: string): string {
    switch (accountType?.toLowerCase()) {
      case 'demo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'real':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paper':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }

  getOrderTypeDisplay(orderType: string): string {
    return this.tradingActivityService.getOrderTypeDisplay(orderType);
  }

  getOrderTypeColorClass(orderType: string): string {
    return this.tradingActivityService.getOrderTypeColorClass(orderType);
  }

  getStatusColorClass(status: string, profit?: number): string {
    return this.tradingActivityService.getStatusColorClass(status, profit);
  }

  formatCurrency(amount: number): string {
    return this.tradingActivityService.formatCurrency(amount);
  }

  formatNumber(value: number, decimals: number = 5): string {
    return this.tradingActivityService.formatNumber(value, decimals);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
}
