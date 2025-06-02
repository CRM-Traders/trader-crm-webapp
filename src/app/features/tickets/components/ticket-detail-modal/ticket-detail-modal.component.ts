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
  AddCommentRequest,
  AddTagToTicketRequest,
  RemoveTagFromTicketRequest,
  getPriorityLabel,
  getPriorityColor,
  getTypeLabel,
  getTypeIcon,
  getStatusLabel,
  TicketComment,
  Tag,
} from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './ticket-detail-modal.component.html',
  styles: [
    `
      :host {
        display: block;
      }

      :host ::ng-deep .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: #d1d5db #f3f4f6;
      }

      :host ::ng-deep .overflow-y-auto::-webkit-scrollbar {
        width: 8px;
      }

      :host ::ng-deep .overflow-y-auto::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
      }

      :host ::ng-deep .overflow-y-auto::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }

      :host ::ng-deep .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      :host-context(.dark) ::ng-deep .overflow-y-auto {
        scrollbar-color: #4b5563 #374151;
      }

      :host-context(.dark) ::ng-deep .overflow-y-auto::-webkit-scrollbar-track {
        background: #374151;
      }

      :host-context(.dark) ::ng-deep .overflow-y-auto::-webkit-scrollbar-thumb {
        background: #4b5563;
      }

      :host-context(.dark)
        ::ng-deep
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
      }
    `,
  ],
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
  comments: TicketComment[] = [];
  loadingComments = false;
  submittingComment = false;
  editingCommentId: string | null = null;
  editCommentContent = '';
  popularTags: Tag[] = [];
  newTag = '';
  addingTag = false;

  getPriorityLabel = getPriorityLabel;
  getPriorityColor = getPriorityColor;
  getTypeLabel = getTypeLabel;
  getTypeIcon = getTypeIcon;
  getStatusLabel = getStatusLabel;

  ngOnInit(): void {
    this.loadTicket();
    this.initEditForm();
    this.loadPopularTags();
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
        this.loadComments();
      },
      error: () => {
        this.alertService.error('Failed to load ticket details');
        this.loading = false;
      },
    });
  }

  private loadComments(): void {
    this.loadingComments = true;
    this.ticketService.getTicketComments(this.ticketId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.loadingComments = false;
      },
      error: () => {
        this.alertService.error('Failed to load comments');
        this.loadingComments = false;
      },
    });
  }

  private loadPopularTags(): void {
    this.ticketService.getPopularTags(20).subscribe({
      next: (tags) => {
        this.popularTags = tags;
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
      error: () => {
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
      error: () => {
        this.alertService.error('Failed to update status');
        this.selectedStatus = this.ticket!.status;
      },
    });
  }

  addComment(isInternal: boolean): void {
    if (!this.ticket || !this.newComment.trim()) return;

    this.submittingComment = true;
    const request: AddCommentRequest = {
      ticketId: this.ticket.id,
      content: this.newComment.trim(),
      isInternal,
    };

    this.ticketService.addComment(request).subscribe({
      next: () => {
        this.alertService.success('Comment added successfully');
        this.newComment = '';
        this.submittingComment = false;
        this.loadComments();
        this.loadTicket();
      },
      error: () => {
        this.alertService.error('Failed to add comment');
        this.submittingComment = false;
      },
    });
  }

  startEditComment(comment: TicketComment): void {
    this.editingCommentId = comment.id;
    this.editCommentContent = comment.content;
  }

  saveEditComment(commentId: string): void {
    if (!this.editCommentContent.trim()) return;

    this.ticketService
      .editComment({
        id: commentId,
        content: this.editCommentContent.trim(),
      })
      .subscribe({
        next: () => {
          this.alertService.success('Comment updated');
          this.editingCommentId = null;
          this.editCommentContent = '';
          this.loadComments();
        },
        error: () => {
          this.alertService.error('Failed to update comment');
        },
      });
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editCommentContent = '';
  }

  deleteComment(commentId: string): void {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    this.ticketService.deleteComment(commentId).subscribe({
      next: () => {
        this.alertService.success('Comment deleted');
        this.loadComments();
        this.loadTicket();
      },
      error: () => {
        this.alertService.error('Failed to delete comment');
      },
    });
  }

  addTag(tag?: string): void {
    const tagToAdd = tag || this.newTag.trim();
    if (!this.ticket || !tagToAdd) return;

    this.addingTag = true;
    const request: AddTagToTicketRequest = {
      ticketId: this.ticket.id,
      tag: tagToAdd,
    };

    this.ticketService.addTagToTicket(request).subscribe({
      next: () => {
        this.alertService.success('Tag added');
        this.newTag = '';
        this.addingTag = false;
        this.loadTicket();
      },
      error: () => {
        this.alertService.error('Failed to add tag');
        this.addingTag = false;
      },
    });
  }

  removeTag(tag: string): void {
    if (!this.ticket) return;

    const request: RemoveTagFromTicketRequest = {
      ticketId: this.ticket.id,
      tag,
    };

    this.ticketService.removeTagFromTicket(request).subscribe({
      next: () => {
        this.alertService.success('Tag removed');
        this.loadTicket();
      },
      error: () => {
        this.alertService.error('Failed to remove tag');
      },
    });
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
        error: () => {
          this.alertService.error('Failed to delete ticket');
        },
      });
    }
  }
}
