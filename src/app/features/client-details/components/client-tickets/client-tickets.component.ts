// client-tickets.component.ts

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
import { TicketService } from './services/ticket.service';
import {
  FinancialTicket,
  FinancialTicketSummary,
  TicketStatus,
} from './models/ticket.model';

@Component({
  selector: 'app-client-tickets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './client-tickets.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientTicketsComponent implements OnInit, OnDestroy {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private ticketService = inject(TicketService);
  private destroy$ = new Subject<void>();

  // Financial tickets state
  financialTickets: FinancialTicket[] = [];
  loadingTickets = false;

  // Pagination properties
  currentPage = 0; // 0-based for API
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;
  hasNextPage = false;
  hasPreviousPage = false;

  // Filter properties
  tradingAccountIdFilter = '';
  statusFilter = '';
  currencyFilter = '';

  // Available filter options
  availableTradingAccounts: string[] = [];
  availableStatuses: string[] = [];
  availableCurrencies: string[] = [];

  // Summary state - calculated from response data
  financialSummary: FinancialTicketSummary | null = null;

  // Math property for template access
  Math = Math;

  // Ticket status enum for template access
  TicketStatus = TicketStatus;

  // Status update loading state
  updatingStatus: { [key: string]: boolean } = {};

  get clientId(): string {
    return this.client?.userId || '';
  }

  constructor() {
    // Remove form initialization since we're not creating tickets
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadFinancialTickets();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Summary calculations from response data
  get totalTickets(): number {
    return this.financialSummary?.totalTickets || 0;
  }

  get activeTickets(): number {
    return this.financialSummary?.activeTickets || 0;
  }

  get totalWithdrawals(): number {
    return this.financialSummary?.totalWithdrawals || 0;
  }

  get totalDeposits(): number {
    return this.financialSummary?.totalDeposits || 0;
  }

  get totalAmount(): number {
    return this.financialSummary?.totalAmount || 0;
  }

  get totalWithdrawalAmount(): number {
    return this.financialSummary?.totalWithdrawalAmount || 0;
  }

  get totalDepositAmount(): number {
    return this.financialSummary?.totalDepositAmount || 0;
  }

  // Get filtered tickets
  get filteredTickets(): FinancialTicket[] {
    let filtered = this.financialTickets;

    if (this.tradingAccountIdFilter) {
      filtered = filtered.filter(
        (ticket) => ticket.tradingAccountId === this.tradingAccountIdFilter
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticketStatusName.toLowerCase() ===
          this.statusFilter.toLowerCase()
      );
    }

    if (this.currencyFilter) {
      filtered = filtered.filter(
        (ticket) => ticket.walletCurrency === this.currencyFilter
      );
    }

    return filtered;
  }

  private loadFinancialTickets(): void {
    if (!this.clientId) return;

    this.loadingTickets = true;
    this.ticketService
      .getFinancialTickets(this.clientId, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            const data = response.data[0];
            this.financialTickets = data.tickets;
            this.totalItems = response.pagination.totalCount;
            this.totalPages = response.pagination.totalPages;
            this.hasNextPage = response.pagination.hasNext;
            this.hasPreviousPage = response.pagination.hasPrevious;

            // Calculate summary from response data
            this.calculateSummaryFromResponse(data);

            // Extract filter options from tickets
            this.extractFilterOptions();
          } else {
            this.financialTickets = [];
            this.totalItems = 0;
            this.totalPages = 0;
            this.hasNextPage = false;
            this.hasPreviousPage = false;
            this.financialSummary = null;
            this.clearFilterOptions();
          }
          this.loadingTickets = false;
        },
        error: (error) => {
          this.loadingTickets = false;
        },
      });
  }

  private calculateSummaryFromResponse(data: any): void {
    // Calculate amounts from the tickets array
    const totalAmount = data.tickets.reduce(
      (sum: number, ticket: FinancialTicket) => sum + ticket.amount,
      0
    );
    const totalWithdrawalAmount = data.tickets
      .filter((ticket: FinancialTicket) => ticket.ticketType === 1)
      .reduce((sum: number, ticket: FinancialTicket) => sum + ticket.amount, 0);
    const totalDepositAmount = data.tickets
      .filter((ticket: FinancialTicket) => ticket.ticketType === 0)
      .reduce((sum: number, ticket: FinancialTicket) => sum + ticket.amount, 0);

    this.financialSummary = {
      totalTickets: data.totalCount,
      activeTickets: data.activeTickets,
      totalWithdrawals: data.totalWithdrawals,
      totalDeposits: data.totalDeposits,
      totalAmount: totalAmount,
      totalWithdrawalAmount: totalWithdrawalAmount,
      totalDepositAmount: totalDepositAmount,
    };
  }

  private extractFilterOptions(): void {
    // Extract unique trading account IDs
    this.availableTradingAccounts = [
      ...new Set(
        this.financialTickets.map((ticket) => ticket.tradingAccountId)
      ),
    ];

    // Extract unique statuses
    this.availableStatuses = [
      ...new Set(
        this.financialTickets.map((ticket) => ticket.ticketStatusName)
      ),
    ];

    // Extract unique currencies
    this.availableCurrencies = [
      ...new Set(this.financialTickets.map((ticket) => ticket.walletCurrency)),
    ];
  }

  private clearFilterOptions(): void {
    this.availableTradingAccounts = [];
    this.availableStatuses = [];
    this.availableCurrencies = [];
  }

  onFilterChange(): void {
    // Reset to first page when filters change
    this.currentPage = 0;
    // Note: Since we're filtering client-side, we don't need to reload from API
    // The filteredTickets getter will handle the filtering
  }

  clearFilters(): void {
    this.tradingAccountIdFilter = '';
    this.statusFilter = '';
    this.currencyFilter = '';
    this.onFilterChange();
  }

  onPageChange(page: number): void {
    this.currentPage = page - 1; // Convert to 0-based
    this.loadFinancialTickets();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadFinancialTickets();
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.currentPage + 1; // Convert to 1-based for display
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }

    return pages;
  }

  refreshTickets(): void {
    this.loadFinancialTickets();
  }

  /**
   * Update ticket status
   */
  updateTicketStatus(ticketId: string, newStatus: string | TicketStatus): void {
    if (this.updatingStatus[ticketId]) return;

    // Convert string to TicketStatus enum if needed
    const status =
      typeof newStatus === 'string'
        ? (parseInt(newStatus) as TicketStatus)
        : newStatus;

    this.updatingStatus[ticketId] = true;

    this.ticketService
      .updateTicketStatus(ticketId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Reset loading state
          this.updatingStatus[ticketId] = false;
          // Refresh the tickets to get updated data
          this.loadFinancialTickets();
        },
        error: () => {
          this.updatingStatus[ticketId] = false;
        },
      });
  }

  /**
   * Handle select change event for status update
   */
  onStatusChange(ticketId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.updateTicketStatus(ticketId, target.value);
    }
  }

  /**
   * Check if status update is in progress for a ticket
   */
  isUpdatingStatus(ticketId: string): boolean {
    return this.updatingStatus[ticketId] || false;
  }

  /**
   * Get available status options for a ticket
   */
  getAvailableStatuses(currentStatus: number): TicketStatus[] {
    const allStatuses = Object.values(TicketStatus).filter(
      (value) => typeof value === 'number'
    ) as TicketStatus[];

    // Filter out the current status and return available options
    return allStatuses.filter((status) => status !== currentStatus);
  }

  /**
   * Get status display name
   */
  getStatusDisplayName(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.Pending:
        return 'Pending';
      case TicketStatus.Processing:
        return 'Processing';
      case TicketStatus.Completed:
        return 'Completed';
      case TicketStatus.Cancelled:
        return 'Cancelled';
      case TicketStatus.Failed:
        return 'Failed';
      case TicketStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getStatusColorClass(status: string): string {
    return this.ticketService.getFinancialTicketStatusColorClass(status);
  }

  getTicketTypeColorClass(ticketType: number): string {
    return this.ticketService.getTicketTypeColorClass(ticketType);
  }

  getTicketTypeIcon(ticketType: number): string {
    return this.ticketService.getTicketTypeIcon(ticketType);
  }

  formatCurrency(amount: number, currency: string): string {
    return this.ticketService.formatCurrency(amount, currency);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
