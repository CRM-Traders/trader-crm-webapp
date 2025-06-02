import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../core/services/http.service';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import {
  Ticket,
  TicketDetail,
  CreateTicketRequest,
  UpdateTicketRequest,
  ChangeTicketStatusRequest,
  AssignTicketRequest,
  TicketStatus,
  TicketColumn,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  AddCommentRequest,
  EditCommentRequest,
  TicketComment,
  TicketAttachment,
  UploadAttachmentRequest,
  AddTagToTicketRequest,
  RemoveTagFromTicketRequest,
  Tag,
  TicketSearchParams,
  CategorySearchParams,
  PaginatedResponse,
  TicketStatistics,
  TicketStatisticsParams,
  UserPerformance,
  UserPerformanceParams,
} from '../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpService);

  private ticketsSubject = new BehaviorSubject<Ticket[]>([]);
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private selectedTicketSubject = new BehaviorSubject<TicketDetail | null>(
    null
  );
  private statisticsSubject = new BehaviorSubject<TicketStatistics | null>(
    null
  );

  public tickets$ = this.ticketsSubject.asObservable();
  public categories$ = this.categoriesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public selectedTicket$ = this.selectedTicketSubject.asObservable();
  public statistics$ = this.statisticsSubject.asObservable();

  getTickets(
    params?: TicketSearchParams
  ): Observable<PaginatedResponse<Ticket>> {
    this.loadingSubject.next(true);

    let httpParams = new HttpParams();

    if (params) {
      if (params.searchTerm)
        httpParams = httpParams.set('SearchTerm', params.searchTerm);
      if (params.pageIndex !== undefined)
        httpParams = httpParams.set('PageIndex', params.pageIndex.toString());
      if (params.pageSize)
        httpParams = httpParams.set('PageSize', params.pageSize.toString());
      if (params.sortField)
        httpParams = httpParams.set('SortField', params.sortField);
      if (params.sortDirection)
        httpParams = httpParams.set('SortDirection', params.sortDirection);
      if (params.statuses?.length) {
        params.statuses.forEach((status) => {
          httpParams = httpParams.append('Status', status.toString());
        });
      }
      if (params.priorities?.length) {
        params.priorities.forEach((priority) => {
          httpParams = httpParams.append('Priority', priority.toString());
        });
      }
      if (params.categoryIds?.length) {
        params.categoryIds.forEach((id) => {
          httpParams = httpParams.append('CategoryId', id);
        });
      }
      if (params.assignedUserIds?.length) {
        params.assignedUserIds.forEach((id) => {
          httpParams = httpParams.append('AssignedToUserId', id);
        });
      }
    }

    return this.http
      .get<PaginatedResponse<Ticket>>('tickets/api/tickets', httpParams)
      .pipe(
        tap((response) => {
          this.ticketsSubject.next(response.items);
          this.loadingSubject.next(false);
        })
      );
  }

  searchTickets(
    params: TicketSearchParams
  ): Observable<PaginatedResponse<Ticket>> {
    this.loadingSubject.next(true);

    let httpParams = new HttpParams();

    if (params.searchTerm)
      httpParams = httpParams.set('SearchTerm', params.searchTerm);
    if (params.statuses?.length) {
      params.statuses.forEach((status) => {
        httpParams = httpParams.append('Statuses', status.toString());
      });
    }
    if (params.priorities?.length) {
      params.priorities.forEach((priority) => {
        httpParams = httpParams.append('Priorities', priority.toString());
      });
    }
    if (params.types?.length) {
      params.types.forEach((type) => {
        httpParams = httpParams.append('Types', type.toString());
      });
    }
    if (params.categoryIds?.length) {
      params.categoryIds.forEach((id) => {
        httpParams = httpParams.append('CategoryIds', id);
      });
    }
    if (params.assignedUserIds?.length) {
      params.assignedUserIds.forEach((id) => {
        httpParams = httpParams.append('AssignedUserIds', id);
      });
    }
    if (params.createdFrom)
      httpParams = httpParams.set(
        'CreatedFrom',
        params.createdFrom.toISOString()
      );
    if (params.createdTo)
      httpParams = httpParams.set('CreatedTo', params.createdTo.toISOString());
    if (params.dueFrom)
      httpParams = httpParams.set('DueFrom', params.dueFrom.toISOString());
    if (params.dueTo)
      httpParams = httpParams.set('DueTo', params.dueTo.toISOString());
    if (params.hasAttachments !== undefined)
      httpParams = httpParams.set(
        'HasAttachments',
        params.hasAttachments.toString()
      );
    if (params.hasComments !== undefined)
      httpParams = httpParams.set('HasComments', params.hasComments.toString());
    if (params.tags?.length) {
      params.tags.forEach((tag) => {
        httpParams = httpParams.append('Tags', tag);
      });
    }
    if (params.pageIndex !== undefined)
      httpParams = httpParams.set('PageIndex', params.pageIndex.toString());
    if (params.pageSize)
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    if (params.sortField)
      httpParams = httpParams.set('SortField', params.sortField);
    if (params.sortDirection)
      httpParams = httpParams.set('SortDirection', params.sortDirection);

    return this.http
      .get<PaginatedResponse<Ticket>>('tickets/api/search/tickets', httpParams)
      .pipe(
        tap((response) => {
          this.ticketsSubject.next(response.items);
          this.loadingSubject.next(false);
        })
      );
  }

  getTicketById(id: string): Observable<TicketDetail> {
    const params = new HttpParams().set('Id', id);

    return this.http
      .get<TicketDetail>('tickets/api/tickets/details', params)
      .pipe(tap((ticket) => this.selectedTicketSubject.next(ticket)));
  }

  createTicket(request: CreateTicketRequest): Observable<void> {
    return this.http.post<void>('tickets/api/tickets', request).pipe(
      tap(() => {
        this.getTickets().subscribe();
      })
    );
  }

  updateTicket(request: UpdateTicketRequest): Observable<void> {
    return this.http.put<void>('tickets/api/tickets', request).pipe(
      tap(() => {
        const currentTickets = this.ticketsSubject.value;
        const updatedTickets = currentTickets.map((ticket) =>
          ticket.id === request.id ? { ...ticket, ...request } : ticket
        );
        this.ticketsSubject.next(updatedTickets);
      })
    );
  }

  changeTicketStatus(request: ChangeTicketStatusRequest): Observable<void> {
    return this.http.patch<void>('tickets/api/tickets/status', request).pipe(
      tap(() => {
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

  assignTicket(request: AssignTicketRequest): Observable<void> {
    return this.http.patch<void>('tickets/api/tickets/assign', request).pipe(
      tap(() => {
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

  deleteTicket(id: string): Observable<void> {
    const params = new HttpParams().set('Id', id);

    return this.http.delete<void>('tickets/api/tickets', params).pipe(
      tap(() => {
        const currentTickets = this.ticketsSubject.value;
        const filteredTickets = currentTickets.filter(
          (ticket) => ticket.id !== id
        );
        this.ticketsSubject.next(filteredTickets);
      })
    );
  }

  getCategories(
    params?: CategorySearchParams
  ): Observable<PaginatedResponse<Category>> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.isActive !== undefined)
        httpParams = httpParams.set('IsActive', params.isActive.toString());
      if (params.searchTerm)
        httpParams = httpParams.set('SearchTerm', params.searchTerm);
      if (params.pageIndex !== undefined)
        httpParams = httpParams.set('PageIndex', params.pageIndex.toString());
      if (params.pageSize)
        httpParams = httpParams.set('PageSize', params.pageSize.toString());
      if (params.sortField)
        httpParams = httpParams.set('SortField', params.sortField);
      if (params.sortDirection)
        httpParams = httpParams.set('SortDirection', params.sortDirection);
    }

    return this.http
      .get<PaginatedResponse<Category>>('tickets/api/categories', httpParams)
      .pipe(tap((response) => this.categoriesSubject.next(response.items)));
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`tickets/api/categories/${id}`);
  }

  createCategory(request: CreateCategoryRequest): Observable<void> {
    return this.http
      .post<void>('tickets/api/categories', request)
      .pipe(tap(() => this.getCategories().subscribe()));
  }

  updateCategory(request: UpdateCategoryRequest): Observable<void> {
    return this.http
      .put<void>('tickets/api/categories', request)
      .pipe(tap(() => this.getCategories().subscribe()));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http
      .delete<void>(`tickets/api/categories/${id}`)
      .pipe(tap(() => this.getCategories().subscribe()));
  }

  getTicketComments(ticketId: string): Observable<TicketComment[]> {
    return this.http.get<TicketComment[]>(
      `tickets/api/comments/ticket/${ticketId}`
    );
  }

  addComment(request: AddCommentRequest): Observable<void> {
    return this.http.post<void>('tickets/api/comments', request);
  }

  editComment(request: EditCommentRequest): Observable<void> {
    return this.http.put<void>('tickets/api/comments', request);
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`tickets/api/comments/${id}`);
  }

  getTicketAttachments(ticketId: string): Observable<TicketAttachment[]> {
    return this.http.get<TicketAttachment[]>(
      `tickets/api/attachments/ticket/${ticketId}`
    );
  }

  uploadAttachment(request: UploadAttachmentRequest): Observable<void> {
    return this.http.post<void>('tickets/api/attachments', request);
  }

  deleteAttachment(id: string): Observable<void> {
    return this.http.delete<void>(`tickets/api/attachments/${id}`);
  }

  getPopularTags(count: number = 10): Observable<Tag[]> {
    const params = new HttpParams().set('Count', count.toString());
    return this.http.get<Tag[]>('tickets/api/tags/popular', params);
  }

  addTagToTicket(request: AddTagToTicketRequest): Observable<void> {
    return this.http.post<void>('tickets/api/tags/ticket', request);
  }

  removeTagFromTicket(request: RemoveTagFromTicketRequest): Observable<void> {
    return this.http.delete<void>(
      'tickets/api/tags/ticket',
      undefined,
      undefined
    ); // TODO
  }

  getTicketStatistics(
    params?: TicketStatisticsParams
  ): Observable<TicketStatistics> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.startDate)
        httpParams = httpParams.set(
          'StartDate',
          params.startDate.toISOString()
        );
      if (params.endDate)
        httpParams = httpParams.set('EndDate', params.endDate.toISOString());
      if (params.categoryId)
        httpParams = httpParams.set('CategoryId', params.categoryId);
      if (params.assignedToUserId)
        httpParams = httpParams.set(
          'AssignedToUserId',
          params.assignedToUserId
        );
    }

    return this.http
      .get<TicketStatistics>('tickets/api/statistics/tickets', httpParams)
      .pipe(tap((stats) => this.statisticsSubject.next(stats)));
  }

  getUserPerformance(
    params?: UserPerformanceParams
  ): Observable<UserPerformance[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.startDate)
        httpParams = httpParams.set(
          'StartDate',
          params.startDate.toISOString()
        );
      if (params.endDate)
        httpParams = httpParams.set('EndDate', params.endDate.toISOString());
      if (params.userIds?.length) {
        params.userIds.forEach((id) => {
          httpParams = httpParams.append('UserIds', id);
        });
      }
    }

    return this.http.get<UserPerformance[]>(
      'tickets/api/statistics/user-performance',
      httpParams
    );
  }

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

  revertTicketStatus(ticketId: string, originalStatus: TicketStatus): void {
    const currentTickets = this.ticketsSubject.value;
    const updatedTickets = currentTickets.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, status: originalStatus } : ticket
    );
    this.ticketsSubject.next(updatedTickets);
  }
}
