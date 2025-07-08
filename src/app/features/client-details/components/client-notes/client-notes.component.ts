import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { Client } from '../../../clients/models/clients.model';
import { NotesService } from './services/notes.service';
import { ClientNote } from './models/note.model';
import { NoteCreationModalComponent } from './components/note-creation-modal/note-creation-modal.component';

@Component({
  selector: 'app-client-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Notes & Comments
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Manage client notes, comments, and important information
          </p>
        </div>
        <div>
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              ></path>
            </svg>
            Add Note
          </button>
        </div>
      </div>

      <!-- Notes List -->
      <div class="space-y-4" *ngIf="!loading; else loadingTemplate">
        <!-- All Notes -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                All Notes ({{ totalCount }})
              </h3>
              <div class="flex items-center space-x-3">
                <!-- Status Filter -->
                <select
                  [(ngModel)]="statusFilter"
                  (ngModelChange)="onFilterChange()"
                  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">All Notes</option>
                  <option value="pinned">Pinned Only</option>
                  <option value="regular">Regular Only</option>
                </select>
                <!-- Search -->
                <div class="relative">
                  <div
                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  >
                    <svg
                      class="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      ></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="searchTerm"
                    (ngModelChange)="onSearchChange()"
                    class="block w-full !pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Search notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table
              class="min-w-full divide-y divide-gray-200 dark:divide-gray-700/30"
            >
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Note Content
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Created By
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700/30"
              >
                <tr
                  *ngFor="let note of paginatedNotes"
                  class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [ngClass]="{
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                          note.isPinnedComment,
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200':
                          !note.isPinnedComment
                      }"
                    >
                      <svg
                        *ngIf="note.isPinnedComment"
                        class="w-3 h-3 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                        ></path>
                      </svg>
                      {{ note.isPinnedComment ? 'Pinned' : 'Regular' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 dark:text-white">
                      <p class="max-w-xs truncate" [title]="note.note">
                        {{ note.note }}
                      </p>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">
                      {{ note.createdBy }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 dark:text-white">
                      {{ note.createdAt | date : 'short' }}
                    </div>
                  </td>

                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div
            *ngIf="filteredNotes.length === 0 && !loading"
            class="text-center py-12"
          >
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No notes found
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ getEmptyStateMessage() }}
            </p>
          </div>

          <!-- Pagination -->
          <div
            *ngIf="filteredNotes.length > 0"
            class="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 flex justify-between sm:hidden">
                <button
                  type="button"
                  (click)="previousPage()"
                  [disabled]="currentPage === 1"
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  (click)="nextPage()"
                  [disabled]="currentPage === totalPages"
                  class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div
                class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"
              >
                <div>
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    Showing
                    <span class="font-medium">{{ startItem }}</span>
                    to
                    <span class="font-medium">{{ endItem }}</span>
                    of
                    <span class="font-medium">{{ totalCount }}</span>
                    results
                  </p>
                </div>
                <div>
                  <nav
                    class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      type="button"
                      (click)="previousPage()"
                      [disabled]="currentPage === 1"
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span class="sr-only">Previous</span>
                      <svg
                        class="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      *ngFor="let page of visiblePages"
                      (click)="goToPage(page)"
                      [class]="
                        currentPage === page
                          ? 'relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 dark:bg-blue-900 text-sm font-medium text-blue-600 dark:text-blue-200'
                          : 'relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      "
                    >
                      {{ page }}
                    </button>

                    <button
                      type="button"
                      (click)="nextPage()"
                      [disabled]="currentPage === totalPages"
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span class="sr-only">Next</span>
                      <svg
                        class="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loadingTemplate>
        <div class="flex justify-center items-center py-8">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          ></div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ClientNotesComponent implements OnInit, OnDestroy {
  @Input() client!: Client;

  private alertService = inject(AlertService);
  private modalService = inject(ModalService);
  private notesService = inject(NotesService);
  private destroy$ = new Subject<void>();

  searchTerm = '';
  statusFilter = '';
  loading = false;
  notes: ClientNote[] = [];
  filteredNotes: ClientNote[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalCount = 0;

  ngOnInit(): void {
    this.loadNotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredNotes.length / this.itemsPerPage);
  }

  get startItem(): number {
    return this.filteredNotes.length === 0
      ? 0
      : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.filteredNotes.length ? this.filteredNotes.length : end;
  }

  get paginatedNotes(): ClientNote[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredNotes.slice(startIndex, endIndex);
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  private loadNotes(): void {
    if (!this.client?.id) return;

    this.loading = true;
    this.notesService
      .getClientCommentsById(this.client.id)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading notes:', error);
          this.alertService.error('Failed to load notes');
          return of([]);
        })
      )
      .subscribe((notes) => {
        this.notes = notes.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.applyFilters();
        this.loading = false;
      });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.notes];

    // Apply status filter
    if (this.statusFilter) {
      if (this.statusFilter === 'pinned') {
        filtered = filtered.filter((note) => note.isPinnedComment);
      } else if (this.statusFilter === 'regular') {
        filtered = filtered.filter((note) => !note.isPinnedComment);
      }
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.note.toLowerCase().includes(term) ||
          note.createdBy.toLowerCase().includes(term)
      );
    }

    this.filteredNotes = filtered;
    this.totalCount = filtered.length;
  }

  getEmptyStateMessage(): string {
    if (this.statusFilter && this.searchTerm) {
      return `No ${this.statusFilter} notes found matching "${this.searchTerm}".`;
    } else if (this.statusFilter) {
      return `No ${this.statusFilter} notes found.`;
    } else if (this.searchTerm) {
      return `No notes found matching "${this.searchTerm}".`;
    }
    return 'No notes have been added yet. Click "Add Note" to create the first one.';
  }

  openCreateModal(): void {
    const modalRef = this.modalService.open(
      NoteCreationModalComponent,
      {
        size: 'lg',
        centered: true,
        closable: true,
      },
      {
        clientId: this.client.id,
      }
    );

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadNotes();
        }
      },
      () => {}
    );
  }

  // togglePinNote(note: ClientNote): void {
  //   note.isPinnedComment = !note.isPinnedComment;
  //   this.applyFilters(); // Reapply filters to update the view
  //   this.alertService.success(
  //     note.isPinnedComment
  //       ? 'Note pinned successfully'
  //       : 'Note unpinned successfully'
  //   );
  //   // Here you would typically call an API to update the pin status
  //   // this.notesService.updateNotePin(note.id, note.isPinnedComment).subscribe(...)
  // }

  // editNote(note: ClientNote): void {
  //   // Implement edit note modal
  //   console.log('Edit note:', note);
  // }

  // deleteNote(note: ClientNote): void {
  //   if (confirm('Are you sure you want to delete this note?')) {
  //     const index = this.notes.findIndex((n) => n.id === note.id);
  //     if (index > -1) {
  //       this.notes.splice(index, 1);
  //       this.applyFilters();
  //       this.alertService.success('Note deleted successfully');
  //     }
  //     // Here you would typically call an API to delete the note
  //     // this.notesService.deleteNote(note.id).subscribe(...)
  //   }
  // }

  // Pagination methods
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
}
