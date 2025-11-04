// services/ticket.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { HttpService } from '../../../../../core/services/http.service';
import { AlertService } from '../../../../../core/services/alert.service';
import {
  Ticket,
  TicketFilters,
  TicketResponse,
  TicketSummary,
  FinancialTicket,
  FinancialTicketResponse,
  FinancialTicketSummary,
  UpdateTicketStatusRequest,
  TicketStatus,
} from '../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpService);
  private alertService = inject(AlertService);

  private readonly baseEndpoint = 'traiding/api/Ticket';
  private readonly financialTicketEndpoint = 'traiding/api/FinancialTicket';

  // Reactive state management
  private readonly _loading = signal<boolean>(false);
  private readonly _tickets = signal<Ticket[]>([]);
  private readonly _financialTickets = signal<FinancialTicket[]>([]);
  private readonly _summary = signal<TicketSummary | null>(null);
  private readonly _financialSummary = signal<FinancialTicketSummary | null>(
    null
  );

  readonly loading = this._loading.asReadonly();
  readonly tickets = this._tickets.asReadonly();
  readonly financialTickets = this._financialTickets.asReadonly();
  readonly summary = this._summary.asReadonly();
  readonly financialSummary = this._financialSummary.asReadonly();

  /**
   * Get tickets for a client with pagination and filtering
   */
  getTickets(
    clientUserId: string,
    filters?: TicketFilters
  ): Observable<TicketResponse> {
    this._loading.set(true);

    const params = new URLSearchParams();
    params.append('clientUserId', clientUserId);

    if (filters?.pageIndex !== undefined)
      params.append('pageIndex', filters.pageIndex.toString());
    if (filters?.pageSize !== undefined)
      params.append('pageSize', filters.pageSize.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);

    const queryString = params.toString();
    const url = `${this.baseEndpoint}/get-tickets?${queryString}`;

    return this.http.get<TicketResponse>(url).pipe(
      tap((response) => {
        this._tickets.set(response.items);
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error('Failed to load tickets. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get ticket by ID
   */
  getTicketById(ticketId: string): Observable<Ticket> {
    this._loading.set(true);

    return this.http.get<Ticket>(`${this.baseEndpoint}/${ticketId}`).pipe(
      tap((ticket) => {
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error('Failed to load ticket. Please try again.');
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new ticket
   */
  createTicket(ticket: Partial<Ticket>): Observable<Ticket> {
    this._loading.set(true);

    return this.http.post<Ticket>(`${this.baseEndpoint}/create`, ticket).pipe(
      tap((newTicket) => {
        this._loading.set(false);
        this.alertService.success('Ticket created successfully!');
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error('Failed to create ticket. Please try again.');
        return throwError(() => error);
      })
    );
  }

  updateTicket(ticketId: string, updates: Partial<Ticket>): Observable<Ticket> {
    this._loading.set(true);

    return this.http
      .put<Ticket>(`${this.baseEndpoint}/${ticketId}`, updates)
      .pipe(
        tap((updatedTicket) => {
          this._loading.set(false);
          this.alertService.success('Ticket updated successfully!');
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error('Failed to update ticket. Please try again.');
          return throwError(() => error);
        })
      );
  }

  updateTicketStatus(ticketId: string, status: TicketStatus): Observable<any> {
    this._loading.set(true);

    const request: UpdateTicketStatusRequest = {
      id: ticketId,
      status: status,
    };

    return this.http
      .post<any>(`${this.baseEndpoint}/update-ticket-status`, request)
      .pipe(
        tap((response) => {
          this._loading.set(false);
          this.alertService.success('Ticket status updated successfully!');
        }),
        catchError((error) => {
          this._loading.set(false);
          this.alertService.error(
            'Failed to update ticket status. Please try again.'
          );
          return throwError(() => error);
        })
      );
  }

  clearTickets(): void {
    this._tickets.set([]);
  }

  clearSummary(): void {
    this._summary.set(null);
  }

  getFinancialTickets(
    clientUserId: string,
    pageIndex: number = 0,
    pageSize: number = 50
  ): Observable<FinancialTicketResponse> {
    this._loading.set(true);

    const params = new URLSearchParams();
    params.append('clientUserId', clientUserId);
    params.append('pageIndex', pageIndex.toString());
    params.append('pageSize', pageSize.toString());

    const queryString = params.toString();
    const url = `${this.baseEndpoint}/get-tickets?${queryString}`;

    return this.http.get<FinancialTicketResponse>(url).pipe(
      tap((response) => {
        if (response.data && response.data.length > 0) {
          this._financialTickets.set(response.data[0].tickets);
        } else {
          this._financialTickets.set([]);
        }
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        this.alertService.error(
          'Failed to load financial tickets. Please try again.'
        );
        return throwError(() => error);
      })
    );
  }

  getFinancialTicketStatusColorClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  getTicketTypeColorClass(ticketType: number): string {
    switch (ticketType) {
      case 0:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 1:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }

  getTicketTypeIcon(ticketType: number): string {
    switch (ticketType) {
      case 0:
        return 'M12 6v6m0 0v6m0-6h6m-6 0H6';
      case 1:
        return 'M20 12H4';
      default:
        return 'M12 6v6m0 0v6m0-6h6m-6 0H6';
    }
  }

  formatCurrency(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }

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

  getSupportedStatuses(): string[] {
    return ['Open', 'InProgress', 'Resolved', 'Closed'];
  }

  getSupportedPriorities(): string[] {
    return ['Low', 'Medium', 'High', 'Critical'];
  }

  getSupportedCategories(): string[] {
    return ['Technical', 'Billing', 'Account', 'Trading', 'General'];
  }
}
