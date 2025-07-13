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
import { Ticket, TicketFilters, TicketSummary } from './models/ticket.model';

@Component({
  selector: 'app-client-tickets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
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

  ticketForm: FormGroup;
  showAddForm = false;
  searchTerm = '';
  activeTab: 'tickets' | 'summary' = 'tickets';

  // Tickets state
  tickets: Ticket[] = [];
  loadingTickets = false;

  // Pagination properties
  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;
  hasNextPage = false;
  hasPreviousPage = false;

  // Filter properties
  statusFilter = '';
  priorityFilter = '';
  categoryFilter = '';

  // Summary state
  ticketSummary: TicketSummary | null = null;
  loadingSummary = false;

  // Math property for template access
  Math = Math;

  get clientId(): string {
    return this.client?.userId || '';
  }

  get supportedStatuses(): string[] {
    return this.ticketService.getSupportedStatuses();
  }

  get supportedPriorities(): string[] {
    return this.ticketService.getSupportedPriorities();
  }

  get supportedCategories(): string[] {
    return this.ticketService.getSupportedCategories();
  }

  constructor() {
    this.ticketForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      priority: ['Medium', Validators.required],
      category: ['General', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.clientId) {
      this.loadTickets();
      this.loadTicketSummary();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredTickets(): Ticket[] {
    if (!this.searchTerm) {
      return this.tickets;
    }

    const term = this.searchTerm.toLowerCase();
    return this.tickets.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(term) ||
        ticket.description.toLowerCase().includes(term) ||
        ticket.ticketNumber.toLowerCase().includes(term) ||
        ticket.status.toLowerCase().includes(term) ||
        ticket.priority.toLowerCase().includes(term) ||
        ticket.category.toLowerCase().includes(term)
    );
  }

  // Summary calculations
  get totalTickets(): number {
    return this.ticketSummary?.totalTickets || this.tickets.length;
  }

  get openTickets(): number {
    return this.ticketSummary?.openTickets || this.tickets.filter(t => t.status === 'Open').length;
  }

  get inProgressTickets(): number {
    return this.ticketSummary?.inProgressTickets || this.tickets.filter(t => t.status === 'InProgress').length;
  }

  get resolvedTickets(): number {
    return this.ticketSummary?.resolvedTickets || this.tickets.filter(t => t.status === 'Resolved').length;
  }

  get closedTickets(): number {
    return this.ticketSummary?.closedTickets || this.tickets.filter(t => t.status === 'Closed').length;
  }

  get criticalTickets(): number {
    return this.ticketSummary?.criticalTickets || this.tickets.filter(t => t.priority === 'Critical').length;
  }

  get highPriorityTickets(): number {
    return this.ticketSummary?.highPriorityTickets || this.tickets.filter(t => t.priority === 'High').length;
  }

  private loadTickets(): void {
    if (!this.clientId) return;

    const filters: TicketFilters = {
      pageIndex: this.currentPage - 1, // Convert to 0-based
      pageSize: this.pageSize,
      status: this.statusFilter || undefined,
      priority: this.priorityFilter || undefined,
      category: this.categoryFilter || undefined,
    };

    this.loadingTickets = true;
    this.ticketService
      .getTickets(this.clientId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tickets = response.items;
          this.totalItems = response.totalCount;
          this.totalPages = response.totalPages;
          this.hasNextPage = response.hasNextPage;
          this.hasPreviousPage = response.hasPreviousPage;
          this.loadingTickets = false;
        },
        error: (error) => {
          console.error('Error loading tickets:', error);
          this.loadingTickets = false;
        },
      });
  }

  private loadTicketSummary(): void {
    if (!this.clientId) return;

    this.loadingSummary = true;
    this.ticketService
      .getTicketSummary(this.clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.ticketSummary = summary;
          this.loadingSummary = false;
        },
        error: (error) => {
          console.error('Error loading ticket summary:', error);
          this.loadingSummary = false;
        },
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTickets();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadTickets();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadTickets();
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.currentPage;
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
    this.loadTickets();
    this.loadTicketSummary();
  }

  toggleAddTicket(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.ticketForm.reset({
        priority: 'Medium',
        category: 'General',
      });
    }
  }

  submitTicket(): void {
    if (this.ticketForm.valid) {
      const ticketData = {
        ...this.ticketForm.value,
        clientUserId: this.clientId,
      };

      this.ticketService
        .createTicket(ticketData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.ticketForm.reset({
              priority: 'Medium',
              category: 'General',
            });
            this.showAddForm = false;
            this.refreshTickets();
          },
          error: (error) => {
            console.error('Error creating ticket:', error);
          },
        });
    }
  }

  updateTicketStatus(ticketId: string, newStatus: string): void {
    this.ticketService
      .updateTicket(ticketId, { status: newStatus as 'Open' | 'InProgress' | 'Resolved' | 'Closed' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshTickets();
        },
        error: (error) => {
          console.error('Error updating ticket status:', error);
        },
      });
  }

  updateTicketPriority(ticketId: string, newPriority: string): void {
    this.ticketService
      .updateTicket(ticketId, { priority: newPriority as 'Low' | 'Medium' | 'High' | 'Critical' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshTickets();
        },
        error: (error) => {
          console.error('Error updating ticket priority:', error);
        },
      });
  }

  getStatusColorClass(status: string): string {
    return this.ticketService.getStatusColorClass(status);
  }

  getPriorityColorClass(priority: string): string {
    return this.ticketService.getPriorityColorClass(priority);
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