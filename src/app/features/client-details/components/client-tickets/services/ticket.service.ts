// services/ticket.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  Ticket,
  TicketFilters,
  TicketResponse,
  TicketSummary
} from '../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'traiding/api/Ticket';

  // Reactive state management
  private readonly _loading = signal<boolean>(false);
  private readonly _tickets = signal<Ticket[]>([]);
  private readonly _summary = signal<TicketSummary | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly tickets = this._tickets.asReadonly();
  readonly summary = this._summary.asReadonly();

  /**
   * Get tickets for a client with pagination and filtering
   */
  getTickets(
    clientUserId: string,
    filters?: TicketFilters
  ): Observable<TicketResponse> {
    console.log('TicketService: Getting tickets for client:', clientUserId, 'with filters:', filters);
    this._loading.set(true);

    // Build query parameters
    const params = new URLSearchParams();
    params.append('clientUserId', clientUserId);
    
    if (filters?.pageIndex !== undefined) params.append('pageIndex', filters.pageIndex.toString());
    if (filters?.pageSize !== undefined) params.append('pageSize', filters.pageSize.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);

    const queryString = params.toString();
    const url = `${this.baseEndpoint}/get-tickets?${queryString}`;

    return this.http
      .get<TicketResponse>(url)
      .pipe(
        tap((response) => {
          console.log('TicketService: Tickets loaded:', response);
          this._tickets.set(response.items);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TicketService: Error loading tickets:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load tickets. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get ticket summary for a client
   */
  getTicketSummary(clientUserId: string): Observable<TicketSummary> {
    console.log('TicketService: Getting ticket summary for client:', clientUserId);
    this._loading.set(true);

    return this.http
      .get<TicketSummary>(`${this.baseEndpoint}/get-ticket-summary?clientUserId=${clientUserId}`)
      .pipe(
        tap((summary) => {
          console.log('TicketService: Ticket summary loaded:', summary);
          this._summary.set(summary);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TicketService: Error loading ticket summary:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load ticket summary. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Get ticket by ID
   */
  getTicketById(ticketId: string): Observable<Ticket> {
    console.log('TicketService: Getting ticket by ID:', ticketId);
    this._loading.set(true);

    return this.http
      .get<Ticket>(`${this.baseEndpoint}/${ticketId}`)
      .pipe(
        tap((ticket) => {
          console.log('TicketService: Ticket loaded:', ticket);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('TicketService: Error loading ticket:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to load ticket. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new ticket
   */
  createTicket(ticket: Partial<Ticket>): Observable<Ticket> {
    console.log('TicketService: Creating ticket:', ticket);
    this._loading.set(true);

    return this.http
      .post<Ticket>(`${this.baseEndpoint}/create`, ticket)
      .pipe(
        tap((newTicket) => {
          console.log('TicketService: Ticket created:', newTicket);
          this._loading.set(false);
          this.alertService.success(
            'Ticket created successfully!'
          );
        }),
        catchError((error) => {
          console.error('TicketService: Error creating ticket:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to create ticket. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Update ticket
   */
  updateTicket(ticketId: string, updates: Partial<Ticket>): Observable<Ticket> {
    console.log('TicketService: Updating ticket:', ticketId, updates);
    this._loading.set(true);

    return this.http
      .put<Ticket>(`${this.baseEndpoint}/${ticketId}`, updates)
      .pipe(
        tap((updatedTicket) => {
          console.log('TicketService: Ticket updated:', updatedTicket);
          this._loading.set(false);
          this.alertService.success(
            'Ticket updated successfully!'
          );
        }),
        catchError((error) => {
          console.error('TicketService: Error updating ticket:', error);
          this._loading.set(false);
          this.alertService.error(
            'Failed to update ticket. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  /**
   * Clear tickets
   */
  clearTickets(): void {
    console.log('TicketService: Clearing tickets');
    this._tickets.set([]);
  }

  /**
   * Clear summary
   */
  clearSummary(): void {
    console.log('TicketService: Clearing summary');
    this._summary.set(null);
  }

  /**
   * Get status color class
   */
  getStatusColorClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'inprogress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  /**
   * Get priority color class
   */
  getPriorityColorClass(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  /**
   * Get supported statuses
   */
  getSupportedStatuses(): string[] {
    return ['Open', 'InProgress', 'Resolved', 'Closed'];
  }

  /**
   * Get supported priorities
   */
  getSupportedPriorities(): string[] {
    return ['Low', 'Medium', 'High', 'Critical'];
  }

  /**
   * Get supported categories
   */
  getSupportedCategories(): string[] {
    return ['Technical', 'Billing', 'Account', 'Trading', 'General'];
  }
} 