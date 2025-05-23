// src/app/features/tickets/components/ticket-detail-modal/ticket-detail-modal.component.ts

import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AlertService } from '../../../../core/services/alert.service';
import {
  TicketDetail,
  TicketStatus,
  UpdateTicketRequest,
  ChangeTicketStatusRequest,
  AssignTicketRequest,
  getPriorityLabel,
  getPriorityColor,
  getTypeLabel,
  getTypeIcon,
  getStatusLabel,
} from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './ticket-detail-modal.component.html',
  styles: [],
})
export class TicketDetailModalComponent implements OnInit {
  @Input() ticketId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() ticketUpdated = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private alertService = inject(AlertService);

  ticket: TicketDetail | null = null;
  loading = true;
  isEditing = false;
  isSaving = false;
  selectedStatus: number = 1;
  newComment = '';
  editForm!: FormGroup;

  // Helper methods
  getPriorityLabel = getPriorityLabel;
  getPriorityColor = getPriorityColor;
  getTypeLabel = getTypeLabel;
  getTypeIcon = getTypeIcon;
  getStatusLabel = getStatusLabel;

  ngOnInit(): void {
    this.loadTicket();
    this.initEditForm();
  }

  private initEditForm(): void {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(4000)]],
      priority: ['', Validators.required],
      dueDate: [''],
    });
  }

  private loadTicket(): void {
    this.ticketService.getTicketById(this.ticketId).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.selectedStatus = ticket.status;
        this.loading = false;
      },
      error: (error) => {
        this.alertService.error('Failed to load ticket details');
        this.loading = false;
      },
    });
  }

  startEdit(): void {
    if (!this.ticket) return;

    this.isEditing = true;
    this.editForm.patchValue({
      title: this.ticket.title,
      description: this.ticket.description,
      priority: this.ticket.priority,
      dueDate: this.ticket.dueDate
        ? new Date(this.ticket.dueDate).toISOString().slice(0, 16)
        : '',
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm.reset();
  }

  saveEdit(): void {
    if (!this.ticket || this.editForm.invalid) return;

    this.isSaving = true;
    const formValue = this.editForm.value;

    const request: UpdateTicketRequest = {
      id: this.ticket.id,
      title: formValue.title,
      description: formValue.description,
      priority: parseInt(formValue.priority),
      dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
      tags: this.ticket.tags,
    };

    this.ticketService.updateTicket(request).subscribe({
      next: () => {
        this.alertService.success('Ticket updated successfully');
        this.isEditing = false;
        this.isSaving = false;
        this.loadTicket();
        this.ticketUpdated.emit();
      },
      error: (error) => {
        this.alertService.error('Failed to update ticket');
        this.isSaving = false;
      },
    });
  }

  changeStatus(): void {
    if (!this.ticket) return;

    const request: ChangeTicketStatusRequest = {
      id: this.ticket.id,
      status: this.selectedStatus,
    };

    this.ticketService.changeTicketStatus(request).subscribe({
      next: () => {
        this.alertService.success('Status updated successfully');
        this.loadTicket();
        this.ticketUpdated.emit();
      },
      error: (error) => {
        this.alertService.error('Failed to update status');
        this.selectedStatus = this.ticket!.status;
      },
    });
  }

  addComment(isInternal: boolean): void {
    if (!this.ticket || !this.newComment.trim()) return;

    // This would typically call a comment service
    this.alertService.info('Comment functionality to be implemented');
    this.newComment = '';
  }

  deleteTicket(): void {
    if (!this.ticket) return;

    if (confirm('Are you sure you want to delete this ticket?')) {
      this.ticketService.deleteTicket(this.ticket.id).subscribe({
        next: () => {
          this.alertService.success('Ticket deleted successfully');
          this.ticketUpdated.emit();
          this.close.emit();
        },
        error: (error) => {
          this.alertService.error('Failed to delete ticket');
        },
      });
    }
  }
}
