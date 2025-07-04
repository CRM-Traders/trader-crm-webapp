// src/app/features/clients/components/client-comments-modal/client-comments-modal.component.ts

import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { ClientsService } from '../../services/clients.service';
import { Client } from '../../models/clients.model';
import {
  ClientComment,
  ClientCommentCreateRequest,
  ClientCommentUpdateRequest,
} from '../../models/client-comments.model';
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-client-comments-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="w-full max-w-4xl mx-auto">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Client Comments
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          View and manage comments for this client
        </p>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 max-h-[70vh] overflow-y-auto">
        <!-- Add Comment Form -->
        <div class="mb-6">
          <h5 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Add New Comment
          </h5>
          <form [formGroup]="commentForm" class="space-y-4">
            <div>
              <label
                for="comment"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Comment <span class="text-red-500">*</span>
              </label>
              <textarea
                id="comment"
                formControlName="comment"
                rows="4"
                class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                [class.border-red-500]="
                  commentForm.get('comment')?.invalid &&
                  commentForm.get('comment')?.touched
                "
                [class.focus:ring-red-500]="
                  commentForm.get('comment')?.invalid &&
                  commentForm.get('comment')?.touched
                "
                placeholder="Enter your comment here..."
              ></textarea>
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  commentForm.get('comment')?.invalid &&
                  commentForm.get('comment')?.touched
                "
              >
                <span
                  *ngIf="commentForm.get('comment')?.errors?.['required']"
                  >Comment is required</span
                >
                <span
                  *ngIf="commentForm.get('comment')?.errors?.['minlength']"
                  >Comment must be at least 5 characters</span
                >
              </p>
            </div>

            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                (click)="resetForm()"
                [disabled]="isSubmitting"
              >
                Clear
              </button>
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                (click)="onSubmitComment()"
                [disabled]="commentForm.invalid || isSubmitting"
              >
                <span class="flex items-center">
                  <svg
                    *ngIf="isSubmitting"
                    class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {{ isSubmitting ? 'Adding...' : 'Add Comment' }}
                </span>
              </button>
            </div>
          </form>
        </div>

        <!-- Comments List -->
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div class="flex items-center justify-between mb-4">
            <h5 class="text-lg font-medium text-gray-900 dark:text-white">
              Comments History
            </h5>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ totalComments }} comment(s)
            </span>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <!-- No Comments -->
          <div
            *ngIf="!isLoading && comments.length === 0"
            class="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            <svg
              class="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>No comments yet</p>
            <p class="text-sm">Add the first comment above</p>
          </div>

          <!-- Comments List -->
          <div *ngIf="!isLoading && comments.length > 0" class="space-y-4">
            <div
              *ngFor="let comment of comments; trackBy: trackByCommentId"
              class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <!-- Comment Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span class="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {{ getInitials(comment.createdByName) }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ comment.createdByName }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(comment.createdAt) }}
                      <span *ngIf="comment.updatedAt" class="ml-2">
                        • Updated {{ formatDate(comment.updatedAt) }}
                      </span>
                    </p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    type="button"
                    class="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    (click)="editComment(comment)"
                    [disabled]="isSubmitting"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    (click)="deleteComment(comment)"
                    [disabled]="isSubmitting"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Comment Content -->
              <div *ngIf="editingCommentId !== comment.id">
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {{ comment.comment }}
                </p>
              </div>
            </div>
          </div>

          <!-- Load More Button -->
          <div *ngIf="hasNextPage && !isLoading" class="flex justify-center mt-6">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              (click)="loadMoreComments()"
              [disabled]="isSubmitting"
            >
              Load More Comments
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end"
      >
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onClose()"
        >
          Close
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class ClientCommentsModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  commentForm: FormGroup;
  comments: ClientComment[] = [];
  isLoading = false;
  isSubmitting = false;
  totalComments = 0;
  currentPage = 0;
  pageSize = 10;
  hasNextPage = false;

  // Edit functionality
  editingCommentId: string | null = null;
  editingCommentText: string = '';

  constructor() {
    this.commentForm = this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(5)]],
      subject: ['', [Validators.required, Validators.minLength(3)]], // Assuming subject is required
      isPinnedComment: [false], // Default value, can be changed later
    });
  }

  ngOnInit() {
    this.loadComments();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadComments() {
    this.isLoading = true;
    this.clientsService
      .getClientComments(this.client.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (response) => {
          if (this.currentPage === 0) {
            this.comments = response.items;
          } else {
            this.comments = [...this.comments, ...response.items];
          }
          this.totalComments = response.totalCount;
          this.hasNextPage = response.hasNextPage;
        },
        error: (error) => {
          this.alertService.error('Failed to load comments');
          console.error('Error loading comments:', error);
        },
      });
  }

  loadMoreComments() {
    this.currentPage++;
    this.loadComments();
  }

  onSubmitComment() {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const request: ClientCommentCreateRequest = {
      clientId: this.client.id,
      subject: this.commentForm.value.subject, // Assuming subject is the same as comment for simplicity
      note: this.commentForm.value.comment,
      isPinnedComment: false, // Default value, can be changed later
    };

    this.clientsService
      .createClientComment(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: (newComment) => {
          this.comments.unshift(newComment);
          this.totalComments++;
          this.commentForm.reset();
          this.alertService.success('Comment added successfully');
        },
        error: (error) => {
          this.alertService.error('Failed to add comment');
          console.error('Error adding comment:', error);
        },
      });
  }

  editComment(comment: ClientComment) {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.comment;
  }

  cancelEdit() {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  // saveEdit(comment: ClientComment) {
  //   if (!this.editingCommentText?.trim()) {
  //     return;
  //   }

  //   this.isSubmitting = true;
  //   const request: ClientCommentUpdateRequest = {
  //     id: comment.id,
  //     comment: this.editingCommentText,
  //   };

  //   this.clientsService
  //     .updateClientComment(request)
  //     .pipe(
  //       takeUntil(this.destroy$),
  //       finalize(() => (this.isSubmitting = false))
  //     )
  //     .subscribe({
  //       next: (updatedComment) => {
  //         const index = this.comments.findIndex((c) => c.id === comment.id);
  //         if (index !== -1) {
  //           this.comments[index] = updatedComment;
  //         }
  //         this.cancelEdit();
  //         this.alertService.success('Comment updated successfully');
  //       },
  //       error: (error) => {
  //         this.alertService.error('Failed to update comment');
  //         console.error('Error updating comment:', error);
  //       },
  //     });
  // }

  deleteComment(comment: ClientComment) {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    this.isSubmitting = true;
    this.clientsService
      .deleteClientComment(comment.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isSubmitting = false))
      )
      .subscribe({
        next: () => {
          this.comments = this.comments.filter((c) => c.id !== comment.id);
          this.totalComments--;
          this.alertService.success('Comment deleted successfully');
        },
        error: (error) => {
          this.alertService.error('Failed to delete comment');
          console.error('Error deleting comment:', error);
        },
      });
  }

  resetForm() {
    this.commentForm.reset();
  }

  trackByCommentId(index: number, comment: ClientComment): string {
    return comment.id;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onClose() {
    this.modalRef.close();
  }
}