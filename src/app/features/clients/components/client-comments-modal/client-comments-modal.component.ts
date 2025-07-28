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
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-client-comments-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HasPermissionDirective],
  templateUrl: './client-comments-modal.component.html',
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

  // Form visibility control
  showCommentForm = false;

  // Edit functionality
  editingCommentId: string | null = null;
  editingCommentText: string = '';

  constructor() {
    this.commentForm = this.fb.group({
      subject: [''],
      note: ['', [Validators.required]],
      isPinnedComment: [false],
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
          this.comments = Array.isArray(response) ? response : [response];
          this.totalComments = this.comments.length;
        },
        error: (error) => {
          this.alertService.error('Failed to load comments');
        },
      });
  }

  loadMoreComments() {
    this.currentPage++;
    this.loadComments();
  }

  // Show/Hide comment form methods
  showAddCommentForm() {
    this.showCommentForm = true;
    this.resetForm();
  }

  hideCommentForm() {
    this.showCommentForm = false;
    this.resetForm();
  }

  cancelAddComment() {
    this.showCommentForm = false;
    this.resetForm();
  }

  onSubmitComment() {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const request: ClientCommentCreateRequest = {
      clientId: this.client.id,
      subject: this.commentForm.value.subject,
      note: this.commentForm.value.note,
      isPinnedComment: this.commentForm.value.isPinnedComment,
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
          this.showCommentForm = false; // Hide form after successful submission
          this.resetForm();
          this.alertService.success('Comment added successfully');
          this.loadComments();
        },
        error: (error) => {
          this.alertService.error('Failed to add comment');
        },
      });
  }

  editComment(comment: ClientComment) {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.note;
  }

  cancelEdit() {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  deleteComment(comment: ClientComment) {
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
        },
      });
  }

  resetForm() {
    this.commentForm.reset();
    this.commentForm.patchValue({ isPinnedComment: false });
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
