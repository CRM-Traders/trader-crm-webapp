import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../core/services/alert.service';
import {
  TicketColumn,
  Ticket,
  getPriorityLabel,
  getPriorityColor,
  getTypeIcon,
  getTypeLabel,
  TicketFilters,
  TicketStatus,
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

  columns: TicketColumn[] = [];
  loading = false;
  selectedTicket: Ticket | null = null;
  showCreateModal = false;
  showDetailModal = false;

  // Filters
  searchTerm = '';
  selectedPriority: number | null = null;
  selectedAssignee: string | null = null;

  // View options
  viewMode: 'board' | 'list' = 'board';

  // Helper methods for template
  getPriorityLabel = getPriorityLabel;
  getPriorityColor = getPriorityColor;
  getTypeIcon = getTypeIcon;
  getTypeLabel = getTypeLabel;

  ngOnInit(): void {
    this.loadTickets();
    this.subscribeToTicketColumns();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  loadTickets(): void {
    const filters: TicketFilters = {};

    if (this.searchTerm) {
      filters.searchTerm = this.searchTerm;
    }

    if (this.selectedPriority) {
      filters.priority = this.selectedPriority;
    }

    if (this.selectedAssignee) {
      filters.assignedToUserId = this.selectedAssignee;
    }

    this.ticketService.getTickets(filters).subscribe({
      error: (error) => {
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

    // Optimistic update
    this.ticketService.updateTicketStatusOptimistic(ticket.id, targetStatus);

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // API call
    this.ticketService
      .changeTicketStatus({
        id: ticket.id,
        status: targetStatus,
      })
      .subscribe({
        next: () => {
          this.alertService.success('Ticket status updated');
        },
        error: (error) => {
          // Revert on error
          this.ticketService.revertTicketStatus(ticket.id, originalStatus);
          this.alertService.error('Failed to update ticket status');

          // Revert UI
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
  }

  onTicketUpdated(): void {
    this.showDetailModal = false;
    this.loadTickets();
  }

  onSearch(): void {
    this.loadTickets();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedPriority = null;
    this.selectedAssignee = null;
    this.loadTickets();
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

  // Helper method to get all tickets for list view
  get allTickets(): Ticket[] {
    return this.columns.flatMap((column) => column.tickets);
  }
}
