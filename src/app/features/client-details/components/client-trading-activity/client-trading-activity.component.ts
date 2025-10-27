// Updated client-trading-activity.component.ts

import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';
import { TradingActivityService } from './services/trading-activity.service';
import { TradingOrder } from './models/trading-activity.model';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-client-trading-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective],
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
export class ClientTradingActivityComponent
  implements OnInit, OnDestroy, OnChanges
{
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
  cancellingOrderId: string | null = null;

  // Pagination properties
  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;
  hasNextPage = false;
  hasPreviousPage = false;

  // Math property for template access
  Math = Math;

  get clientId(): string {
    return this.client?.userId || '';
  }

  get filteredTradingOrders(): TradingOrder[] {
    let filtered = this.tradingOrders;

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter((order) => order.status === this.statusFilter);
    }

    // Apply symbol filter
    if (this.symbolFilter) {
      filtered = filtered.filter((order) =>
        order.tradingPairSymbol
          .toLowerCase()
          .includes(this.symbolFilter.toLowerCase())
      );
    }

    // Apply order type filter
    if (this.orderTypeFilter) {
      filtered = filtered.filter(
        (order) => order.orderType === this.orderTypeFilter
      );
    }

    // Apply search filter
    if (this.tradingSearchTerm) {
      const term = this.tradingSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
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
    return this.tradingOrders.filter((order) => order.filledQuantity > 0)
      .length;
  }

  get pendingOrdersCount(): number {
    return this.tradingOrders.filter((order) => order.status === 'Pending')
      .length;
  }

  get cancelledOrdersCount(): number {
    return this.tradingOrders.filter((order) => order.status === 'Cancelled')
      .length;
  }

  get totalQuantity(): number {
    return this.tradingOrders.reduce((sum, order) => sum + order.quantity, 0);
  }

  get filledQuantity(): number {
    return this.tradingOrders.reduce(
      (sum, order) => sum + order.filledQuantity,
      0
    );
  }

  ngOnInit(): void {
    // if (this.clientId) {
    //   this.loadClientOrders();
    // }
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

    // Prepare filters for the API call
    const filters = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      status: this.statusFilter || undefined,
      symbol: this.symbolFilter || undefined,
    };

    this.tradingActivityService
      .getClientOrdersByUserId(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tradingOrders = response.orders;
          this.totalItems = response.totalCount;
          this.currentPage = response.pageIndex;
          this.pageSize = response.pageSize;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.hasNextPage = this.currentPage < this.totalPages;
          this.hasPreviousPage = this.currentPage > 1;
          this.loadingClientOrders = false;
        },
        error: (error) => {
          this.loadingClientOrders = false;
        },
      });
  }

  refreshOrders(): void {
    this.loadClientOrders();
  }

  onFilterChange(): void {
    // Reset to first page when filters change
    this.currentPage = 1;
    this.loadClientOrders();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadClientOrders();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page when page size changes
    this.loadClientOrders();
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.currentPage;
    const pages: number[] = [];

    // Show up to 5 page numbers around the current page
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  canCancelOrder(order: TradingOrder): boolean {
    return order.status === 'Pending';
  }

  cancelOrder(order: TradingOrder): void {
    if (
      !confirm(
        `Are you sure you want to cancel this ${order.side} order for ${order.tradingPairSymbol}?`
      )
    ) {
      return;
    }

    this.cancellingOrderId = order.id;

    this.tradingActivityService
      .cancelOrder(order.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancellingOrderId = null;
          this.loadClientOrders();
        },
        error: (error) => {
          this.cancellingOrderId = null;
        },
      });
  }

  isCancelling(orderId: string): boolean {
    return this.cancellingOrderId === orderId;
  }
}
