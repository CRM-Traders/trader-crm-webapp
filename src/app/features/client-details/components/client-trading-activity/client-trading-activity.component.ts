// Updated client-trading-activity.component.ts

import { Component, inject, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';
import { TradingActivityService } from './services/trading-activity.service';
import { TradingOrder } from './models/trading-activity.model';

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
  private tradingActivityService = inject(TradingActivityService);
  private destroy$ = new Subject<void>();

  // State
  tradingSearchTerm = '';
  statusFilter = '';
  symbolFilter = '';
  orderTypeFilter = '';
  tradingOrders: TradingOrder[] = [];
  loadingClientOrders = false;

  get clientId(): string {
    return this.client?.userId || '';
  }



  get filteredTradingOrders(): TradingOrder[] {
    let filtered = this.tradingOrders;

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(order => order.status === this.statusFilter);
    }

    // Apply symbol filter
    if (this.symbolFilter) {
      filtered = filtered.filter(order => order.tradingPairSymbol.toLowerCase().includes(this.symbolFilter.toLowerCase()));
    }

    // Apply order type filter
    if (this.orderTypeFilter) {
      filtered = filtered.filter(order => order.orderType === this.orderTypeFilter);
    }

    // Apply search filter
    if (this.tradingSearchTerm) {
      const term = this.tradingSearchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(term) ||
        order.tradingPairSymbol.toLowerCase().includes(term) ||
        order.orderType.toLowerCase().includes(term) ||
        order.status.toLowerCase().includes(term) ||
        order.accountNumber.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // Summary calculations
  get totalTradingOrders(): number {
    return this.tradingOrders.length;
  }

  get filledOrdersCount(): number {
    return this.tradingOrders.filter(order => order.filledQuantity > 0).length;
  }

  get pendingOrdersCount(): number {
    return this.tradingOrders.filter(order => order.status === 'Pending').length;
  }

  get cancelledOrdersCount(): number {
    return this.tradingOrders.filter(order => order.status === 'Cancelled').length;
  }

  get totalQuantity(): number {
    return this.tradingOrders.reduce((sum, order) => sum + order.quantity, 0);
  }

  get filledQuantity(): number {
    return this.tradingOrders.reduce((sum, order) => sum + order.filledQuantity, 0);
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadClientOrders();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['client'] && this.clientId) {
      this.loadClientOrders();
    }
  }

  private loadClientOrders(): void {
    if (!this.clientId) return;

    this.loadingClientOrders = true;
    
    this.tradingActivityService
      .getClientOrdersByUserId(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => {
          this.tradingOrders = orders;
          this.loadingClientOrders = false;
        },
        error: (error) => {
          console.error('Error loading client orders:', error);
          this.loadingClientOrders = false;
        },
      });
  }

  refreshOrders(): void {
    this.loadClientOrders();
  }

  onFilterChange(): void {
    // Filters are applied through the filteredTradingOrders getter
    // No additional action needed
  }
}