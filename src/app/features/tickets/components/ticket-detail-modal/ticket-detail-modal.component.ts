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
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Background overlay -->
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div
            class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"
          ></div>
        </div>

        <!-- Modal panel -->
        <div
          class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
        >
          <div *ngIf="loading" class="flex justify-center items-center h-96">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            ></div>
          </div>

          <div *ngIf="!loading && ticket" class="max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div
              class="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ getTypeIcon(ticket.type) }}</span>
                  <div>
                    <h3
                      class="text-lg font-medium text-gray-900 dark:text-white"
                    >
                      {{ ticket.title }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      ID: {{ ticket.id }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="close.emit()"
                  class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="px-6 py-4">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main Content -->
                <div class="lg:col-span-2 space-y-6">
                  <!-- Description -->
                  <div *ngIf="!isEditing">
                    <h4
                      class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Description
                    </h4>
                    <p
                      class="text-gray-900 dark:text-white whitespace-pre-wrap"
                    >
                      {{ ticket.description }}
                    </p>
                  </div>

                  <!-- Edit Form -->
                  <form
                    *ngIf="isEditing"
                    [formGroup]="editForm"
                    class="space-y-4"
                  >
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >Title</label
                      >
                      <input
                        type="text"
                        formControlName="title"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >Description</label
                      >
                      <textarea
                        formControlName="description"
                        rows="6"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      ></textarea>
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >Priority</label
                      >
                      <select
                        formControlName="priority"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option [value]="1">Low</option>
                        <option [value]="2">Normal</option>
                        <option [value]="3">High</option>
                        <option [value]="4">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >Due Date</label
                      >
                      <input
                        type="datetime-local"
                        formControlName="dueDate"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </form>

                  <!-- Comments Section -->
                  <div
                    class="border-t border-gray-200 dark:border-gray-700 pt-6"
                  >
                    <h4
                      class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4"
                    >
                      Comments ({{ ticket.comments.length }})
                    </h4>

                    <div class="space-y-4">
                      <div
                        *ngFor="let comment of ticket.comments"
                        class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                      >
                        <div class="flex items-start justify-between">
                          <div class="flex items-center gap-2">
                            <div
                              class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            >
                              {{
                                comment.authorId.substring(0, 2).toUpperCase()
                              }}
                            </div>
                            <div>
                              <p
                                class="text-sm font-medium text-gray-900 dark:text-white"
                              >
                                User {{ comment.authorId.substring(0, 8) }}
                              </p>
                              <p
                                class="text-xs text-gray-500 dark:text-gray-400"
                              >
                                {{ comment.createdAt | date : 'short' }}
                              </p>
                            </div>
                          </div>
                          <span
                            *ngIf="comment.isInternal"
                            class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full"
                            >Internal</span
                          >
                        </div>
                        <p class="mt-2 text-gray-700 dark:text-gray-300">
                          {{ comment.content }}
                        </p>
                      </div>
                    </div>

                    <!-- Add Comment -->
                    <div class="mt-4">
                      <textarea
                        [(ngModel)]="newComment"
                        placeholder="Add a comment..."
                        rows="3"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      ></textarea>
                      <div class="mt-2 flex justify-end gap-2">
                        <button
                          (click)="addComment(false)"
                          [disabled]="!newComment.trim()"
                          class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
                        >
                          Comment
                        </button>
                        <button
                          (click)="addComment(true)"
                          [disabled]="!newComment.trim()"
                          class="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 disabled:opacity-50"
                        >
                          Internal Note
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-6">
                  <!-- Status -->
                  <div>
                    <h4
                      class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Status
                    </h4>
                    <select
                      [(ngModel)]="selectedStatus"
                      (change)="changeStatus()"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option [value]="1">Open</option>
                      <option [value]="2">In Progress</option>
                      <option [value]="3">On Hold</option>
                      <option [value]="4">Resolved</option>
                      <option [value]="5">Closed</option>
                      <option [value]="6" *ngIf="ticket.status === 6">
                        Reopened
                      </option>
                    </select>
                  </div>

                  <!-- Details -->
                  <div class="space-y-3">
                    <h4
                      class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Details
                    </h4>

                    <div class="text-sm">
                      <p class="text-gray-500 dark:text-gray-400">Type</p>
                      <p class="text-gray-900 dark:text-white font-medium">
                        {{ getTypeLabel(ticket.type) }}
                      </p>
                    </div>

                    <div class="text-sm">
                      <p class="text-gray-500 dark:text-gray-400">Priority</p>
                      <span
                        class="inline-block px-2 py-1 text-xs font-medium rounded-full {{
                          getPriorityColor(ticket.priority)
                        }}"
                      >
                        {{ getPriorityLabel(ticket.priority) }}
                      </span>
                    </div>

                    <div class="text-sm">
                      <p class="text-gray-500 dark:text-gray-400">Category</p>
                      <span
                        class="inline-block px-2 py-1 text-xs font-medium rounded-full"
                        [style.background-color]="ticket.categoryColor + '20'"
                        [style.color]="ticket.categoryColor"
                      >
                        {{ ticket.categoryName }}
                      </span>
                    </div>

                    <div class="text-sm">
                      <p class="text-gray-500 dark:text-gray-400">Created</p>
                      <p class="text-gray-900 dark:text-white">
                        {{ ticket.createdAt | date : 'medium' }}
                      </p>
                    </div>

                    <div *ngIf="ticket.dueDate" class="text-sm">
                      <p class="text-gray-500 dark:text-gray-400">Due Date</p>
                      <p class="text-gray-900 dark:text-white">
                        {{ ticket.dueDate | date : 'medium' }}
                      </p>
                    </div>

                    <div *ngIf="ticket.tags.length > 0" class="text-sm">
                      <p class="text-gray-500 dark:text-gray-400 mb-1">Tags</p>
                      <div class="flex flex-wrap gap-1">
                        <span
                          *ngFor="let tag of ticket.tags"
                          class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Statistics -->
                  <div class="space-y-3">
                    <h4
                      class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Statistics
                    </h4>
                    <div class="grid grid-cols-3 gap-2 text-center">
                      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <p
                          class="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                          {{ ticket.viewCount }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Views
                        </p>
                      </div>
                      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <p
                          class="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                          {{ ticket.commentCount }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Comments
                        </p>
                      </div>
                      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <p
                          class="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                          {{ ticket.attachmentCount }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Files
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-between items-center"
            >
              <div class="flex gap-2">
                <button
                  *ngIf="!isEditing"
                  (click)="startEdit()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit
                </button>
                <button
                  *ngIf="isEditing"
                  (click)="saveEdit()"
                  [disabled]="isSaving || editForm.invalid"
                  class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {{ isSaving ? 'Saving...' : 'Save' }}
                </button>
                <button
                  *ngIf="isEditing"
                  (click)="cancelEdit()"
                  class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
              <button
                (click)="deleteTicket()"
                class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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
