// src/app/features/clients/components/note-creation-modal/note-creation-modal.component.ts

import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  NoteCreateRequest,
  NoteCreateResponse,
} from '../../models/note.model';
import { NotesService } from '../../services/notes.service';
import { ModalRef } from '../../../../../../shared/models/modals/modal.model';
import { AlertService } from '../../../../../../core/services/alert.service';

@Component({
  selector: 'app-note-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Add New Note
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 !z-[90] relative">
        <form [formGroup]="noteForm" class="space-y-6">
          <!-- Subject -->
          <div>
            <label
              for="subject"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Subject
            </label>
            <input
              type="text"
              id="subject"
              formControlName="subject"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter subject (optional)"
            />
          </div>

          <!-- Note Content -->
          <div>
            <label
              for="note"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Note Content <span class="text-red-500">*</span>
            </label>
            <textarea
              id="note"
              formControlName="note"
              rows="4"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              [class.border-red-500]="
                noteForm.get('note')?.invalid && noteForm.get('note')?.touched
              "
              [class.focus:ring-red-500]="
                noteForm.get('note')?.invalid && noteForm.get('note')?.touched
              "
              placeholder="Enter your note..."
            ></textarea>
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                noteForm.get('note')?.invalid && noteForm.get('note')?.touched
              "
            >
              <span *ngIf="noteForm.get('note')?.errors?.['required']">
                Note content is required
              </span>
            </p>
          </div>

          <!-- Pin Note Checkbox -->
          <div>
            <div class="flex items-center">
              <input
                type="checkbox"
                id="isPinnedComment"
                formControlName="isPinnedComment"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                for="isPinnedComment"
                class="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Pin Note
              </label>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Pinned notes appear at the top of the notes list
            </p>
          </div>
        </form>
      </div>

      <!-- Modal Footer -->
      <div
        class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3"
      >
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          (click)="onCancel()"
          [disabled]="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          (click)="onSubmit()"
          [disabled]="noteForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Adding...' : 'Add Note' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class NoteCreationModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;
  @Input() clientId!: string;

  private fb = inject(FormBuilder);
  private notesService = inject(NotesService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  noteForm: FormGroup;

  constructor() {
    this.noteForm = this.fb.group({
      subject: [''],
      note: ['', Validators.required],
      isPinnedComment: [false],
    });
  }

  ngOnInit(): void {
    // Component initialization complete
  }

  onSubmit(): void {
    if (this.noteForm.invalid) {
      Object.keys(this.noteForm.controls).forEach((key) => {
        this.noteForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.noteForm.value;

    const noteData: NoteCreateRequest = {
      clientId: this.clientId,
      subject: formValue.subject || null,
      note: formValue.note.trim(),
      isPinnedComment: formValue.isPinnedComment,
    };

    this.notesService.createClientNote(noteData).subscribe({
      next: (response: NoteCreateResponse) => {
        this.isSubmitting = false;
        this.alertService.success('Note added successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else {
          this.alertService.error('Failed to add note. Please try again.');
        }
      },
    });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
