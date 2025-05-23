// // src/app/features/tickets/services/ticket.service.ts

// import { Injectable, inject } from '@angular/core';
// import { HttpService } from '../../../core/services/http.service';
// import { Observable, BehaviorSubject, tap, map } from 'rxjs';
// import { HttpParams } from '@angular/common/http';
// import {
//   Ticket,
//   TicketDetail,
//   CreateTicketRequest,
//   UpdateTicketRequest,
//   ChangeTicketStatusRequest,
//   AssignTicketRequest,
//   TicketFilters,
//   TicketStatus,
//   TicketColumn,
// } from '../models/ticket.model';

// @Injectable({
//   providedIn: 'root',
// })
// export class TicketService {
//   private http = inject(HttpService);

//   private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
//   private loadingSubject = new BehaviorSubject<boolean>(false);
//   private selectedTicketSubject = new BehaviorSubject<TicketDetail | null>(
//     null
//   );

//   public tickets$ = this.ticketsSubject.asObservable();
//   public loading$ = this.loadingSubject.asObservable();
//   public selectedTicket$ = this.selectedTicketSubject.asObservable();

//   getTickets(filters?: TicketFilters): Observable<Ticket[]> {
//     this.loadingSubject.next(true);

//     let params = new HttpParams();

//     if (filters) {
//       if (filters.status !== undefined)
//         params = params.set('status', filters.status.toString());
//       if (filters.priority !== undefined)
//         params = params.set('priority', filters.priority.toString());
//       if (filters.categoryId)
//         params = params.set('categoryId', filters.categoryId);
//       if (filters.assignedToUserId)
//         params = params.set('assignedToUserId', filters.assignedToUserId);
//       if (filters.searchTerm)
//         params = params.set('searchTerm', filters.searchTerm);
//     }

//     return this.http.get<{ items: Ticket[] }>('tickets', params).pipe(
//       map((response) => response.items),
//       tap((tickets) => {
//         this.ticketsSubject.next(tickets);
//         this.loadingSubject.next(false);
//       })
//     );
//   }

//   getTicketById(id: string): Observable<TicketDetail> {
//     const params = new HttpParams().set('id', id);

//     return this.http
//       .get<TicketDetail>('tickets/details', params)
//       .pipe(tap((ticket) => this.selectedTicketSubject.next(ticket)));
//   }

//   createTicket(request: CreateTicketRequest): Observable<void> {
//     return this.http.post<void>('tickets', request).pipe(
//       tap(() => {
//         this.getTickets().subscribe();
//       })
//     );
//   }

//   updateTicket(request: UpdateTicketRequest): Observable<void> {
//     return this.http.put<void>('tickets', request).pipe(
//       tap(() => {
//         const currentTickets = this.ticketsSubject.value;
//         const updatedTickets = currentTickets.map((ticket) =>
//           ticket.id === request.id ? { ...ticket, ...request } : ticket
//         );
//         this.ticketsSubject.next(updatedTickets);
//       })
//     );
//   }

//   changeTicketStatus(request: ChangeTicketStatusRequest): Observable<void> {
//     return this.http.patch<void>('tickets', request).pipe(
//       tap(() => {
//         const currentTickets = this.ticketsSubject.value;
//         const updatedTickets = currentTickets.map((ticket) =>
//           ticket.id === request.id
//             ? { ...ticket, status: request.status }
//             : ticket
//         );
//         this.ticketsSubject.next(updatedTickets);
//       })
//     );
//   }

//   assignTicket(request: AssignTicketRequest): Observable<void> {
//     return this.http.patch<void>('tickets/assign', request).pipe(
//       tap(() => {
//         const currentTickets = this.ticketsSubject.value;
//         const updatedTickets = currentTickets.map((ticket) =>
//           ticket.id === request.id
//             ? { ...ticket, assignedToUserId: request.assignedToUserId }
//             : ticket
//         );
//         this.ticketsSubject.next(updatedTickets);
//       })
//     );
//   }

//   deleteTicket(id: string): Observable<void> {
//     return this.http.delete<void>(`tickets/${id}`).pipe(
//       tap(() => {
//         const currentTickets = this.ticketsSubject.value;
//         const filteredTickets = currentTickets.filter(
//           (ticket) => ticket.id !== id
//         );
//         this.ticketsSubject.next(filteredTickets);
//       })
//     );
//   }

//   getTicketColumns(): Observable<TicketColumn[]> {
//     return this.tickets$.pipe(
//       map((tickets) => {
//         const columns: TicketColumn[] = [
//           {
//             status: TicketStatus.Open,
//             title: 'Open',
//             tickets: tickets.filter((t) => t.status === TicketStatus.Open),
//             color: 'bg-gray-100 border-gray-300',
//             icon: '📋',
//           },
//           {
//             status: TicketStatus.InProgress,
//             title: 'In Progress',
//             tickets: tickets.filter(
//               (t) => t.status === TicketStatus.InProgress
//             ),
//             color: 'bg-blue-100 border-blue-300',
//             icon: '🔄',
//           },
//           {
//             status: TicketStatus.OnHold,
//             title: 'On Hold',
//             tickets: tickets.filter((t) => t.status === TicketStatus.OnHold),
//             color: 'bg-yellow-100 border-yellow-300',
//             icon: '⏸️',
//           },
//           {
//             status: TicketStatus.Resolved,
//             title: 'Resolved',
//             tickets: tickets.filter((t) => t.status === TicketStatus.Resolved),
//             color: 'bg-green-100 border-green-300',
//             icon: '✅',
//           },
//           {
//             status: TicketStatus.Closed,
//             title: 'Closed',
//             tickets: tickets.filter((t) => t.status === TicketStatus.Closed),
//             color: 'bg-gray-100 border-gray-300',
//             icon: '🔒',
//           },
//         ];

//         const reopenedTickets = tickets.filter(
//           (t) => t.status === TicketStatus.Reopened
//         );
//         if (reopenedTickets.length > 0) {
//           columns.push({
//             status: TicketStatus.Reopened,
//             title: 'Reopened',
//             tickets: reopenedTickets,
//             color: 'bg-orange-100 border-orange-300',
//             icon: '🔄',
//           });
//         }

//         return columns;
//       })
//     );
//   }

//   updateTicketStatusOptimistic(
//     ticketId: string,
//     newStatus: TicketStatus
//   ): void {
//     const currentTickets = this.ticketsSubject.value;
//     const updatedTickets = currentTickets.map((ticket) =>
//       ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
//     );
//     this.ticketsSubject.next(updatedTickets);
//   }

//   revertTicketStatus(ticketId: string, originalStatus: TicketStatus): void {
//     const currentTickets = this.ticketsSubject.value;
//     const updatedTickets = currentTickets.map((ticket) =>
//       ticket.id === ticketId ? { ...ticket, status: originalStatus } : ticket
//     );
//     this.ticketsSubject.next(updatedTickets);
//   }
// }

// src/app/features/tickets/services/ticket.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable, BehaviorSubject, tap, map, of } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import {
  Ticket,
  TicketDetail,
  CreateTicketRequest,
  UpdateTicketRequest,
  ChangeTicketStatusRequest,
  AssignTicketRequest,
  TicketFilters,
  TicketStatus,
  TicketColumn,
  TicketPriority,
  TicketType,
} from '../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpService);

  // BehaviorSubjects for reactive state management
  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private selectedTicketSubject = new BehaviorSubject<TicketDetail | null>(
    null
  );

  // Public observables
  public tickets$ = this.ticketsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public selectedTicket$ = this.selectedTicketSubject.asObservable();

  // Get tickets with filters
  getTickets(filters?: TicketFilters): Observable<Ticket[]> {
    this.loadingSubject.next(true);

    // MOCK DATA FOR TESTING - Remove this section when backend is ready
    const mockTickets: Ticket[] = [
      {
        id: '1a2b3c4d-5678-90ab-cdef-1234567890ab',
        title: 'Customer unable to login after password reset',
        description:
          'Customer reported that after resetting their password through the forgot password link, they are unable to login with the new credentials. The system shows "Invalid credentials" error message.',
        priority: TicketPriority.High,
        status: TicketStatus.Open,
        type: TicketType.Bug,
        customerId: 'cust-001',
        assignedToUserId: 'user-123',
        categoryId: 'cat-tech',
        categoryName: 'Technical Support',
        categoryColor: '#3B82F6',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        tags: ['authentication', 'urgent', 'customer-reported'],
        viewCount: 15,
        commentCount: 3,
        attachmentCount: 2,
      },
      {
        id: '2b3c4d5e-6789-01bc-def2-3456789012bc',
        title: 'Request for API rate limit increase',
        description:
          'Client needs higher API rate limits for their integration. Current limit of 1000 requests per hour is insufficient for their use case. They process approximately 2500 requests during peak hours.',
        priority: TicketPriority.Normal,
        status: TicketStatus.InProgress,
        type: TicketType.Feature,
        customerId: 'cust-002',
        assignedToUserId: 'user-456',
        categoryId: 'cat-billing',
        categoryName: 'Billing & Accounts',
        categoryColor: '#10B981',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        tags: ['api', 'rate-limit', 'enterprise'],
        viewCount: 8,
        commentCount: 5,
        attachmentCount: 1,
      },
      {
        id: '3c4d5e6f-7890-12cd-ef34-5678901234cd',
        title: 'Performance degradation in dashboard',
        description:
          'Multiple users reporting slow loading times for the analytics dashboard. Loading time has increased from 2-3 seconds to 15-20 seconds. Issue started after the last deployment.',
        priority: TicketPriority.Critical,
        status: TicketStatus.InProgress,
        type: TicketType.Incident,
        customerId: 'cust-003',
        assignedToUserId: 'user-789',
        categoryId: 'cat-tech',
        categoryName: 'Technical Support',
        categoryColor: '#3B82F6',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue by 1 day
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        tags: ['performance', 'critical', 'dashboard'],
        viewCount: 45,
        commentCount: 12,
        attachmentCount: 5,
      },
      {
        id: '4d5e6f7g-8901-23de-f456-6789012345de',
        title: 'How to export data to Excel format?',
        description:
          'Customer is asking for guidance on exporting their transaction data to Excel format. They need this for their monthly reporting process.',
        priority: TicketPriority.Low,
        status: TicketStatus.Resolved,
        type: TicketType.Question,
        customerId: 'cust-004',
        assignedToUserId: 'user-321',
        categoryId: 'cat-general',
        categoryName: 'General Support',
        categoryColor: '#6B7280',
        dueDate: undefined,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        tags: ['export', 'excel', 'reporting'],
        viewCount: 3,
        commentCount: 2,
        attachmentCount: 0,
      },
      {
        id: '5e6f7g8h-9012-34ef-5678-7890123456ef',
        title: 'Implement two-factor authentication',
        description:
          'As discussed in our security review meeting, we need to implement 2FA for all user accounts. This should support both SMS and authenticator app options.',
        priority: TicketPriority.High,
        status: TicketStatus.OnHold,
        type: TicketType.Improvement,
        customerId: 'cust-005',
        assignedToUserId: undefined,
        categoryId: 'cat-tech',
        categoryName: 'Technical Support',
        categoryColor: '#3B82F6',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        tags: ['security', '2fa', 'enhancement'],
        viewCount: 22,
        commentCount: 8,
        attachmentCount: 3,
      },
      {
        id: '6f7g8h9i-0123-45fg-6789-8901234567fg',
        title: 'Invoice payment failed - Transaction declined',
        description:
          'Automated payment for invoice INV-2024-0342 failed. Bank declined the transaction. Customer needs assistance with updating payment method.',
        priority: TicketPriority.Normal,
        status: TicketStatus.Closed,
        type: TicketType.Support,
        customerId: 'cust-006',
        assignedToUserId: 'user-654',
        categoryId: 'cat-billing',
        categoryName: 'Billing & Accounts',
        categoryColor: '#10B981',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        tags: ['billing', 'payment', 'resolved'],
        viewCount: 6,
        commentCount: 4,
        attachmentCount: 2,
      },
    ];

    // Simulate API delay
    setTimeout(() => {
      this.ticketsSubject.next(mockTickets);
      this.loadingSubject.next(false);
    }, 500);

    return of(mockTickets);

    // ACTUAL API CALL - Uncomment when backend is ready
    /*
    let params = new HttpParams();
    
    if (filters) {
      if (filters.status !== undefined) params = params.set('status', filters.status.toString());
      if (filters.priority !== undefined) params = params.set('priority', filters.priority.toString());
      if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
      if (filters.assignedToUserId) params = params.set('assignedToUserId', filters.assignedToUserId);
      if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
    }
    
    return this.http.get<{ items: Ticket[] }>('tickets', params).pipe(
      map(response => response.items),
      tap(tickets => {
        this.ticketsSubject.next(tickets);
        this.loadingSubject.next(false);
      })
    );
    */
  }

  // Get ticket details
  getTicketById(id: string): Observable<TicketDetail> {
    const params = new HttpParams().set('id', id);

    return this.http
      .get<TicketDetail>('tickets/details', params)
      .pipe(tap((ticket) => this.selectedTicketSubject.next(ticket)));
  }

  // Create new ticket
  createTicket(request: CreateTicketRequest): Observable<void> {
    return this.http.post<void>('tickets', request).pipe(
      tap(() => {
        // Refresh tickets list after creation
        this.getTickets().subscribe();
      })
    );
  }

  // Update ticket
  updateTicket(request: UpdateTicketRequest): Observable<void> {
    return this.http.put<void>('tickets', request).pipe(
      tap(() => {
        // Update local state
        const currentTickets = this.ticketsSubject.value;
        const updatedTickets = currentTickets.map((ticket) =>
          ticket.id === request.id ? { ...ticket, ...request } : ticket
        );
        this.ticketsSubject.next(updatedTickets);
      })
    );
  }

  // Change ticket status
  changeTicketStatus(request: ChangeTicketStatusRequest): Observable<void> {
    return this.http.patch<void>('tickets', request).pipe(
      tap(() => {
        // Update local state
        const currentTickets = this.ticketsSubject.value;
        const updatedTickets = currentTickets.map((ticket) =>
          ticket.id === request.id
            ? { ...ticket, status: request.status }
            : ticket
        );
        this.ticketsSubject.next(updatedTickets);
      })
    );
  }

  // Assign ticket
  assignTicket(request: AssignTicketRequest): Observable<void> {
    return this.http.patch<void>('tickets/assign', request).pipe(
      tap(() => {
        // Update local state
        const currentTickets = this.ticketsSubject.value;
        const updatedTickets = currentTickets.map((ticket) =>
          ticket.id === request.id
            ? { ...ticket, assignedToUserId: request.assignedToUserId }
            : ticket
        );
        this.ticketsSubject.next(updatedTickets);
      })
    );
  }

  // Delete ticket
  deleteTicket(id: string): Observable<void> {
    return this.http.delete<void>(`tickets/${id}`).pipe(
      tap(() => {
        // Remove from local state
        const currentTickets = this.ticketsSubject.value;
        const filteredTickets = currentTickets.filter(
          (ticket) => ticket.id !== id
        );
        this.ticketsSubject.next(filteredTickets);
      })
    );
  }

  // Helper method to organize tickets by status for Kanban board
  getTicketColumns(): Observable<TicketColumn[]> {
    return this.tickets$.pipe(
      map((tickets) => {
        const columns: TicketColumn[] = [
          {
            status: TicketStatus.Open,
            title: 'Open',
            tickets: tickets.filter((t) => t.status === TicketStatus.Open),
            color: 'bg-gray-100 border-gray-300',
            icon: '📋',
          },
          {
            status: TicketStatus.InProgress,
            title: 'In Progress',
            tickets: tickets.filter(
              (t) => t.status === TicketStatus.InProgress
            ),
            color: 'bg-blue-100 border-blue-300',
            icon: '🔄',
          },
          {
            status: TicketStatus.OnHold,
            title: 'On Hold',
            tickets: tickets.filter((t) => t.status === TicketStatus.OnHold),
            color: 'bg-yellow-100 border-yellow-300',
            icon: '⏸️',
          },
          {
            status: TicketStatus.Resolved,
            title: 'Resolved',
            tickets: tickets.filter((t) => t.status === TicketStatus.Resolved),
            color: 'bg-green-100 border-green-300',
            icon: '✅',
          },
          {
            status: TicketStatus.Closed,
            title: 'Closed',
            tickets: tickets.filter((t) => t.status === TicketStatus.Closed),
            color: 'bg-gray-100 border-gray-300',
            icon: '🔒',
          },
        ];

        // Add Reopened column only if there are reopened tickets
        const reopenedTickets = tickets.filter(
          (t) => t.status === TicketStatus.Reopened
        );
        if (reopenedTickets.length > 0) {
          columns.push({
            status: TicketStatus.Reopened,
            title: 'Reopened',
            tickets: reopenedTickets,
            color: 'bg-orange-100 border-orange-300',
            icon: '🔄',
          });
        }

        return columns;
      })
    );
  }

  // Update ticket status (optimistic update for drag & drop)
  updateTicketStatusOptimistic(
    ticketId: string,
    newStatus: TicketStatus
  ): void {
    const currentTickets = this.ticketsSubject.value;
    const updatedTickets = currentTickets.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
    );
    this.ticketsSubject.next(updatedTickets);
  }

  // Revert optimistic update in case of error
  revertTicketStatus(ticketId: string, originalStatus: TicketStatus): void {
    const currentTickets = this.ticketsSubject.value;
    const updatedTickets = currentTickets.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, status: originalStatus } : ticket
    );
    this.ticketsSubject.next(updatedTickets);
  }
}
