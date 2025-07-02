// Updated client-trading-activity.component.ts

import { Component, inject, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';
import { AdminTradingAccountService } from '../client-accounts/services/admin-trading-accounts.service';
import { TradingAccount } from '../client-accounts/models/trading-account.model';
import { TradingOrder, TradingService } from '../client-payments/services/trading-order.service';

@Component({
  selector: 'app-client-trading-activity',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-trading-activity.component.html',
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
  private tradingService = inject(TradingService);
  private adminTradingAccountService = inject(AdminTradingAccountService);
  private destroy$ = new Subject<void>();

  // State
  selectedTradingAccountId = '';
  tradingSearchTerm = '';
  statusFilter = '';
  tradingOrders: TradingOrder[] = [];
  loadingTradingHistory = false;

  get clientId(): string {
    return this.client?.userId || '';
  }

  get tradingAccounts(): TradingAccount[] {
    return this.adminTradingAccountService.accounts();
  }

  get loadingAccounts(): boolean {
    return this.adminTradingAccountService.loading();
  }

  get filteredTradingOrders(): TradingOrder[] {
    let filtered = this.tradingOrders;

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(order => order.status === this.statusFilter);
    }

    // Apply search filter
    if (this.tradingSearchTerm) {
      const term = this.tradingSearchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(term) ||
        order.tradingPairSymbol.toLowerCase().includes(term) ||
        order.orderType.toLowerCase().includes(term) ||
        order.side.toLowerCase().includes(term) ||
        order.status.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // Summary calculations
  get totalTradingOrders(): number {
    return this.tradingOrders.length;
  }

  get filledOrdersCount(): number {
    return this.tradingOrders.filter(order => order.status === 'filled').length;
  }

  get openOrdersCount(): number {
    return this.tradingOrders.filter(order => order.status === 'open' || order.status === 'partially_filled').length;
  }

  get cancelledOrdersCount(): number {
    return this.tradingOrders.filter(order => order.status === 'cancelled' || order.status === 'rejected').length;
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadTradingAccounts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['client'] && this.clientId) {
      this.loadTradingAccounts();
    }
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

  refreshTradingAccounts(): void {
    if (this.clientId) {
      this.adminTradingAccountService.refreshAccounts(this.clientId);
    }
  }

  selectTradingAccount(account: TradingAccount): void {
    console.log('Selected trading account:', account);
    this.selectedTradingAccountId = account.id;
    this.loadTradingHistory();
  }

  private loadTradingHistory(): void {
    if (!this.selectedTradingAccountId) return;

    this.loadingTradingHistory = true;
    
    this.tradingService
      .getTradingOrdersPaginated(this.selectedTradingAccountId, 1, 100) // Get first 100 orders
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tradingOrders = response.items;
          this.loadingTradingHistory = false;
        },
        error: (error) => {
          console.error('Error loading trading history:', error);
          this.loadingTradingHistory = false;
        },
      });
  }

  refreshOrders(): void {
    if (this.selectedTradingAccountId) {
      this.loadTradingHistory();
    }
  }

  onFilterChange(): void {
    // Filters are applied through the filteredTradingOrders getter
    // No additional action needed
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
}