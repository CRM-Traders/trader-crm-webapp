import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../../../core/services/alert.service';
import { Client } from '../../../clients/models/clients.model';

interface ClientNote {
  id: string;
  note: string;
  category: string;
  priority: string;
  isPinned: boolean;
  isPrivate: boolean;
  createdBy: string;
  createdDate: Date;
  lastModified?: Date;
  tags?: string[];
}

@Component({
  selector: 'app-client-notes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Notes & Comments
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Manage client notes, comments, and important information
        </p>
      </div>

      <!-- Add Note Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Add New Note
          </h3>
          <button
            type="button"
            (click)="toggleAddForm()"
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
            {{ showAddForm ? 'Cancel' : 'Add Note' }}
          </button>
        </div>

        <div
          *ngIf="showAddForm"
          class="border-t border-gray-200 dark:border-gray-700 pt-6"
        >
          <form [formGroup]="noteForm" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Category -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Category <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="category"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Category</option>
                  <option value="general">General</option>
                  <option value="kyc">KYC Related</option>
                  <option value="trading">Trading</option>
                  <option value="support">Support</option>
                  <option value="compliance">Compliance</option>
                  <option value="financial">Financial</option>
                </select>
              </div>

              <!-- Priority -->
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Priority <span class="text-red-500">*</span>
                </label>
                <select
                  formControlName="priority"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Priority</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <!-- Options -->
              <div class="space-y-3">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >Options</label
                >
                <div class="space-y-2">
                  <label class="inline-flex items-center">
                    <input
                      type="checkbox"
                      formControlName="isPinned"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >Pin Note</span
                    >
                  </label>
                  <label class="inline-flex items-center">
                    <input
                      type="checkbox"
                      formControlName="isPrivate"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >Private Note</span
                    >
                  </label>
                </div>
              </div>
            </div>

            <!-- Note Content -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Note Content <span class="text-red-500">*</span>
              </label>
              <textarea
                formControlName="note"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Enter your note..."
              ></textarea>
            </div>

            <!-- Tags -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Tags (comma separated)
              </label>
              <input
                type="text"
                formControlName="tags"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="e.g., important, follow-up, urgent"
              />
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="toggleAddForm()"
                class="px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="addNote()"
                [disabled]="noteForm.invalid"
                class="px-6 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Note
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Notes List -->
      <div class="space-y-4">
        <!-- Pinned Notes -->
        <div
          *ngIf="pinnedNotes.length > 0"
          class="bg-yellow-50 dark:bg-yellow-900/5 border border-yellow-200 dark:border-yellow-800/20 rounded-lg p-6"
        >
          <h4
            class="text-lg font-semibold text-yellow-800 dark:text-yellow-500 mb-4 flex items-center"
          >
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
              ></path>
            </svg>
            Pinned Notes
          </h4>
          <div class="space-y-3">
            <div
              *ngFor="let note of pinnedNotes"
              class="bg-white dark:bg-gray-800/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700/20"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getCategoryColor(note.category)"
                    >
                      {{ note.category | titlecase }}
                    </span>
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getPriorityColor(note.priority)"
                    >
                      {{ note.priority | titlecase }}
                    </span>
                    <span
                      *ngIf="note.isPrivate"
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Private
                    </span>
                  </div>
                  <p class="text-sm text-gray-900 dark:text-white mb-2">
                    {{ note.note }}
                  </p>
                  <div
                    class="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4"
                  >
                    <span>by {{ note.createdBy }}</span>
                    <span>{{ note.createdDate | date : 'short' }}</span>
                  </div>
                  <div
                    *ngIf="note.tags && note.tags.length > 0"
                    class="flex flex-wrap gap-1 mt-2"
                  >
                    <span
                      *ngFor="let tag of note.tags"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      #{{ tag }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-2 ml-4">
                  <button
                    type="button"
                    (click)="unpinNote(note)"
                    class="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
                    title="Unpin Note"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M4 3a1 1 0 000 2h1v6l-2 2v1h14v-1l-2-2V5h1a1 1 0 100-2H4zM9 17v1a1 1 0 102 0v-1H9z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    title="Edit Note"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Regular Notes -->
        <div
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                All Notes ({{ regularNotes.length }})
              </h3>
              <div class="flex items-center space-x-3">
                <!-- Filter -->
                <select
                  [(ngModel)]="categoryFilter"
                  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="kyc">KYC Related</option>
                  <option value="trading">Trading</option>
                  <option value="support">Support</option>
                  <option value="compliance">Compliance</option>
                  <option value="financial">Financial</option>
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
                    class="block w-full !pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Search notes..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="divide-y divide-gray-200 dark:divide-gray-700/30">
            <div
              *ngFor="let note of filteredRegularNotes"
              class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getCategoryColor(note.category)"
                    >
                      {{ note.category | titlecase }}
                    </span>
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      [ngClass]="getPriorityColor(note.priority)"
                    >
                      {{ note.priority | titlecase }}
                    </span>
                    <span
                      *ngIf="note.isPrivate"
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Private
                    </span>
                  </div>
                  <p class="text-sm text-gray-900 dark:text-white mb-2">
                    {{ note.note }}
                  </p>
                  <div
                    class="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4"
                  >
                    <span>by {{ note.createdBy }}</span>
                    <span>{{ note.createdDate | date : 'short' }}</span>
                    <span *ngIf="note.lastModified"
                      >(edited {{ note.lastModified | date : 'short' }})</span
                    >
                  </div>
                  <div
                    *ngIf="note.tags && note.tags.length > 0"
                    class="flex flex-wrap gap-1 mt-2"
                  >
                    <span
                      *ngFor="let tag of note.tags"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      #{{ tag }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center space-x-2 ml-4">
                  <button
                    type="button"
                    (click)="pinNote(note)"
                    class="text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400"
                    title="Pin Note"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    title="Edit Note"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      ></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    title="Delete Note"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
export class ClientNotesComponent implements OnInit {
  @Input() client!: Client;

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);

  noteForm: FormGroup;
  showAddForm = false;
  searchTerm = '';
  categoryFilter = '';

  notes: ClientNote[] = [
    {
      id: '1',
      note: 'Client is very interested in cryptocurrency trading. Needs additional information about crypto pairs available on our platform.',
      category: 'trading',
      priority: 'high',
      isPinned: true,
      isPrivate: false,
      createdBy: 'John Smith',
      createdDate: new Date('2024-01-25T10:30:00'),
      tags: ['crypto', 'trading', 'follow-up'],
    },
    {
      id: '2',
      note: 'KYC documents submitted and under review. All documents appear to be in order. Approval expected within 24 hours.',
      category: 'kyc',
      priority: 'normal',
      isPinned: true,
      isPrivate: false,
      createdBy: 'Sarah Johnson',
      createdDate: new Date('2024-01-24T14:20:00'),
      tags: ['kyc', 'documents'],
    },
    {
      id: '3',
      note: 'Client mentioned they have trading experience with other brokers. Comfortable with high leverage trading.',
      category: 'general',
      priority: 'normal',
      isPinned: false,
      isPrivate: false,
      createdBy: 'Mike Brown',
      createdDate: new Date('2024-01-23T16:45:00'),
      tags: ['experience', 'leverage'],
    },
    {
      id: '4',
      note: 'Compliance note: Client requires additional verification due to high deposit amount. Flag for enhanced due diligence.',
      category: 'compliance',
      priority: 'urgent',
      isPinned: false,
      isPrivate: true,
      createdBy: 'Compliance Team',
      createdDate: new Date('2024-01-22T09:15:00'),
      tags: ['compliance', 'edd', 'verification'],
    },
  ];

  constructor() {
    this.noteForm = this.fb.group({
      category: ['', Validators.required],
      priority: ['', Validators.required],
      note: ['', Validators.required],
      isPinned: [false],
      isPrivate: [false],
      tags: [''],
    });
  }

  ngOnInit(): void {}

  get pinnedNotes(): ClientNote[] {
    return this.notes.filter((note) => note.isPinned);
  }

  get regularNotes(): ClientNote[] {
    return this.notes.filter((note) => !note.isPinned);
  }

  get filteredRegularNotes(): ClientNote[] {
    let filtered = this.regularNotes;

    if (this.categoryFilter) {
      filtered = filtered.filter(
        (note) => note.category === this.categoryFilter
      );
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.note.toLowerCase().includes(term) ||
          note.createdBy.toLowerCase().includes(term) ||
          note.tags?.some((tag) => tag.toLowerCase().includes(term))
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.noteForm.reset();
    }
  }

  addNote(): void {
    if (this.noteForm.valid) {
      const formData = this.noteForm.value;

      const newNote: ClientNote = {
        id: String(this.notes.length + 1),
        note: formData.note,
        category: formData.category,
        priority: formData.priority,
        isPinned: formData.isPinned,
        isPrivate: formData.isPrivate,
        createdBy: 'Current User', // Replace with actual user
        createdDate: new Date(),
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [],
      };

      this.notes.unshift(newNote);
      this.noteForm.reset();
      this.showAddForm = false;

      this.alertService.success('Note added successfully');
    }
  }

  pinNote(note: ClientNote): void {
    note.isPinned = true;
    this.alertService.success('Note pinned successfully');
  }

  unpinNote(note: ClientNote): void {
    note.isPinned = false;
    this.alertService.success('Note unpinned successfully');
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      kyc: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      trading:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      support:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      compliance: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      financial:
        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[category] || colors['general'];
  }

  getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[priority] || colors['normal'];
  }
}
