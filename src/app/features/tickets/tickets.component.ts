import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import {
  TicketColumn,
  Ticket,
  getPriorityLabel,
  getPriorityColor,
  getTypeIcon,
  getTypeLabel,
  TicketSearchParams,
  TicketStatus,
  TicketPriority,
  TicketType,
  Category,
  TicketStatistics,
  getStatusColor,
} from './models/ticket.model';
import { TicketService } from './services/ticket.service';
import { TicketDetailModalComponent } from './components/ticket-detail-modal/ticket-detail-modal.component';
import { CreateTicketModalComponent } from './components/create-ticket-modal/create-ticket-modal.component';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    FormsModule,
    TicketDetailModalComponent,
    CreateTicketModalComponent,
  ],
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.scss'],
})
export class TicketsComponent implements OnInit, OnDestroy {
  private ticketService = inject(TicketService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  columns: TicketColumn[] = [];
  loading = false;
  selectedTicket: Ticket | null = null;
  showCreateModal = false;
  showDetailModal = false;
  showAdvancedFilters = false;
  showStatistics = false;

  searchTerm = '';
  selectedStatuses: TicketStatus[] = [];
  selectedPriorities: TicketPriority[] = [];
  selectedTypes: TicketType[] = [];
  selectedCategories: string[] = [];
  selectedAssignees: string[] = [];
  selectedTags: string[] = [];
  createdFrom: string = '';
  createdTo: string = '';
  dueFrom: string = '';
  dueTo: string = '';
  hasAttachments: boolean | null = null;
  hasComments: boolean | null = null;

  categories: Category[] = [];
  statistics: TicketStatistics | null = null;

  pageIndex = 0;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  viewMode: 'board' | 'list' | 'grid' = 'board';
  sortField = 'createdAt';
  sortDirection = 'desc';

  getPriorityLabel = getPriorityLabel;
  getPriorityColor = getPriorityColor;
  getTypeIcon = getTypeIcon;
  getTypeLabel = getTypeLabel;
  getStatusColor = getStatusColor;

  readonly statusOptions = [
    { value: TicketStatus.Open, label: 'Open' },
    { value: TicketStatus.InProgress, label: 'In Progress' },
    { value: TicketStatus.OnHold, label: 'On Hold' },
    { value: TicketStatus.Resolved, label: 'Resolved' },
    { value: TicketStatus.Closed, label: 'Closed' },
    { value: TicketStatus.Reopened, label: 'Reopened' },
  ];

  readonly priorityOptions = [
    { value: TicketPriority.Low, label: 'Low' },
    { value: TicketPriority.Normal, label: 'Normal' },
    { value: TicketPriority.High, label: 'High' },
    { value: TicketPriority.Critical, label: 'Critical' },
  ];

  readonly typeOptions = [
    { value: TicketType.Bug, label: 'Bug' },
    { value: TicketType.Feature, label: 'Feature' },
    { value: TicketType.Support, label: 'Support' },
    { value: TicketType.Improvement, label: 'Improvement' },
    { value: TicketType.Task, label: 'Task' },
    { value: TicketType.Question, label: 'Question' },
    { value: TicketType.Incident, label: 'Incident' },
  ];

  ngOnInit(): void {
    this.loadCategories();
    this.loadTickets();
    this.loadStatistics();
    this.subscribeToTicketColumns();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadTickets();
      });
  }

  private subscribeToTicketColumns(): void {
    this.ticketService
      .getTicketColumns()
      .pipe(takeUntil(this.destroy$))
      .subscribe((columns) => {
        this.columns = columns;
      });

    this.ticketService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading = loading;
      });
  }

  private loadCategories(): void {
    this.ticketService.getCategories({ isActive: true }).subscribe({
      next: (response) => {
        this.categories = response.items;
      },
    });
  }

  private loadStatistics(): void {
    const params = {
      startDate: this.createdFrom
        ? new Date(this.createdFrom)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: this.createdTo ? new Date(this.createdTo) : new Date(),
    };

    this.ticketService.getTicketStatistics(params).subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
    });
  }

  loadTickets(): void {
    const searchParams: TicketSearchParams = {
      searchTerm: this.searchTerm,
      statuses: this.selectedStatuses.length
        ? this.selectedStatuses
        : undefined,
      priorities: this.selectedPriorities.length
        ? this.selectedPriorities
        : undefined,
      types: this.selectedTypes.length ? this.selectedTypes : undefined,
      categoryIds: this.selectedCategories.length
        ? this.selectedCategories
        : undefined,
      assignedUserIds: this.selectedAssignees.length
        ? this.selectedAssignees
        : undefined,
      tags: this.selectedTags.length ? this.selectedTags : undefined,
      createdFrom: this.createdFrom ? new Date(this.createdFrom) : undefined,
      createdTo: this.createdTo ? new Date(this.createdTo) : undefined,
      dueFrom: this.dueFrom ? new Date(this.dueFrom) : undefined,
      dueTo: this.dueTo ? new Date(this.dueTo) : undefined,
      hasAttachments: this.hasAttachments ?? undefined,
      hasComments: this.hasComments ?? undefined,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sortField: this.sortField,
      sortDirection: this.sortDirection,
    };

    this.ticketService.searchTickets(searchParams).subscribe({
      next: (response) => {
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
      },
      error: () => {
        this.alertService.error('Failed to load tickets');
      },
    });
  }

  onDrop(event: CdkDragDrop<Ticket[]>, targetStatus: TicketStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      return;
    }

    const ticket = event.previousContainer.data[event.previousIndex];
    const originalStatus = ticket.status;

    this.ticketService.updateTicketStatusOptimistic(ticket.id, targetStatus);

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.ticketService
      .changeTicketStatus({
        id: ticket.id,
        status: targetStatus,
      })
      .subscribe({
        next: () => {
          this.alertService.success('Ticket status updated');
        },
        error: () => {
          this.ticketService.revertTicketStatus(ticket.id, originalStatus);
          this.alertService.error('Failed to update ticket status');

          transferArrayItem(
            event.container.data,
            event.previousContainer.data,
            event.currentIndex,
            event.previousIndex
          );
        },
      });
  }

  openTicketDetail(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.showDetailModal = true;
  }

  openCreateTicket(): void {
    this.showCreateModal = true;
  }

  onTicketCreated(): void {
    this.showCreateModal = false;
    this.loadTickets();
    this.loadStatistics();
  }

  onTicketUpdated(): void {
    this.showDetailModal = false;
    this.loadTickets();
    this.loadStatistics();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  toggleStatus(status: TicketStatus): void {
    const index = this.selectedStatuses.indexOf(status);
    if (index >= 0) {
      this.selectedStatuses.splice(index, 1);
    } else {
      this.selectedStatuses.push(status);
    }
    this.loadTickets();
  }

  togglePriority(priority: TicketPriority): void {
    const index = this.selectedPriorities.indexOf(priority);
    if (index >= 0) {
      this.selectedPriorities.splice(index, 1);
    } else {
      this.selectedPriorities.push(priority);
    }
    this.loadTickets();
  }

  toggleType(type: TicketType): void {
    const index = this.selectedTypes.indexOf(type);
    if (index >= 0) {
      this.selectedTypes.splice(index, 1);
    } else {
      this.selectedTypes.push(type);
    }
    this.loadTickets();
  }

  toggleCategory(categoryId: string): void {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index >= 0) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(categoryId);
    }
    this.loadTickets();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatuses = [];
    this.selectedPriorities = [];
    this.selectedTypes = [];
    this.selectedCategories = [];
    this.selectedAssignees = [];
    this.selectedTags = [];
    this.createdFrom = '';
    this.createdTo = '';
    this.dueFrom = '';
    this.dueTo = '';
    this.hasAttachments = null;
    this.hasComments = null;
    this.pageIndex = 0;
    this.loadTickets();
  }

  exportTickets(): void {
    this.alertService.info('Export functionality coming soon');
  }

  changeSorting(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.loadTickets();
  }

  previousPage(): void {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.loadTickets();
    }
  }

  nextPage(): void {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.loadTickets();
    }
  }

  getDaysUntilDue(dueDate: Date | undefined): number | null {
    if (!dueDate) return null;

    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  getDueDateColor(dueDate: Date | undefined): string {
    const days = this.getDaysUntilDue(dueDate);

    if (days === null) return '';
    if (days < 0) return 'text-red-600 dark:text-red-400';
    if (days <= 3) return 'text-orange-600 dark:text-orange-400';
    if (days <= 7) return 'text-yellow-600 dark:text-yellow-400';

    return 'text-gray-600 dark:text-gray-400';
  }

  formatDueDate(dueDate: Date | undefined): string {
    if (!dueDate) return '';

    const days = this.getDaysUntilDue(dueDate);

    if (days === null) return '';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days === -1) return 'Overdue by 1 day';
    if (days < 0) return `Overdue by ${Math.abs(days)} days`;

    return `Due in ${days} days`;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedStatuses.length) count++;
    if (this.selectedPriorities.length) count++;
    if (this.selectedTypes.length) count++;
    if (this.selectedCategories.length) count++;
    if (this.selectedAssignees.length) count++;
    if (this.selectedTags.length) count++;
    if (this.createdFrom || this.createdTo) count++;
    if (this.dueFrom || this.dueTo) count++;
    if (this.hasAttachments !== null) count++;
    if (this.hasComments !== null) count++;
    return count;
  }

  get allTickets(): Ticket[] {
    return this.columns.flatMap((column) => column.tickets);
  }

  calculatePaging() {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalCount);
  }
}
