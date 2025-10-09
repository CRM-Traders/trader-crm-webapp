import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientNote } from '../../models/note.model';
import { ModalRef } from '../../../../../../shared/models/modals/modal.model';

@Component({
    selector: 'app-note-details-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          Note Details
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <div class="space-y-6">
          <!-- Info Row -->
          <div class="grid grid-cols-4 gap-6">
            <!-- Status Badge -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                [ngClass]="{
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                    note.isPinnedComment,
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200':
                    !note.isPinnedComment
                }"
              >
                <svg
                  *ngIf="note.isPinnedComment"
                  class="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                  ></path>
                </svg>
                {{ note.isPinnedComment ? 'Pinned Note' : 'Regular Note' }}
              </span>
            </div>

            <!-- Created By -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created By
              </label>
              <div class="flex items-center">
                <span class="text-gray-900 dark:text-white font-medium">
                  {{ note.createdBy }}
                </span>
              </div>
            </div>

            <!-- Created Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created Date
              </label>
              <div class="flex items-center text-gray-900 dark:text-white">
                {{ note.createdAt | date : 'dd/MM/yyyy HH:mm:ss' }}
              </div>
            </div>

            <!-- Pinned Date (if applicable) -->
            <div *ngIf="note.isPinnedComment && note.pinnedDate">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pinned Date
              </label>
              <div class="flex items-center text-gray-900 dark:text-white">
                <svg
                  class="w-5 h-5 mr-2 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                  ></path>
                </svg>
                {{ note.pinnedDate | date : 'medium' }}
              </div>
            </div>
          </div>

          <!-- Note Content -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note Content
            </label>
            <div
              class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white whitespace-pre-wrap break-words"
            >
              {{ note.note }}
            </div>
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
export class NoteDetailsModalComponent {
    @Input() modalRef!: ModalRef;
    @Input() note!: ClientNote;

    getInitials(name: string): string {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    onClose(): void {
        this.modalRef.dismiss();
    }
}

