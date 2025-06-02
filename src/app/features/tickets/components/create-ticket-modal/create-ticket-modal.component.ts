import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
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
  CreateTicketRequest,
  TicketPriority,
  TicketType,
  getPriorityLabel,
  getTypeLabel,
  Category,
  CreateCategoryRequest,
  Tag,
} from '../../models/ticket.model';

@Component({
  selector: 'app-create-ticket-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto">
      <div
        class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
      >
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div
            class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"
          ></div>
        </div>

        <div
          class="inline-block z-50 relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all mt-[5vh] max-h-[90vh] overflow-y-auto sm:align-middle sm:max-w-2xl sm:w-full"
        >
          <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()">
            <div
              class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
            >
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Create New Ticket
                </h3>
                <button
                  type="button"
                  (click)="close.emit()"
                  class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 sticky top-0"
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

              <div class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Title <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="title"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    [class.border-red-500]="
                      ticketForm.get('title')?.invalid &&
                      ticketForm.get('title')?.touched
                    "
                  />
                  <p
                    *ngIf="
                      ticketForm.get('title')?.invalid &&
                      ticketForm.get('title')?.touched
                    "
                    class="mt-1 text-sm text-red-600"
                  >
                    Title is required
                  </p>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Description <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    formControlName="description"
                    rows="4"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    [class.border-red-500]="
                      ticketForm.get('description')?.invalid &&
                      ticketForm.get('description')?.touched
                    "
                  ></textarea>
                  <p
                    *ngIf="
                      ticketForm.get('description')?.invalid &&
                      ticketForm.get('description')?.touched
                    "
                    class="mt-1 text-sm text-red-600"
                  >
                    Description is required
                  </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Type <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="type"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select type</option>
                      <option
                        *ngFor="let type of ticketTypes"
                        [value]="type.value"
                      >
                        {{ type.label }}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Priority <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="priority"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select priority</option>
                      <option
                        *ngFor="let priority of priorities"
                        [value]="priority.value"
                      >
                        {{ priority.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Customer ID <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      formControlName="customerId"
                      placeholder="Enter customer ID"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Category <span class="text-red-500">*</span>
                    </label>
                    <div class="relative">
                      <select
                        formControlName="categoryId"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select category</option>
                        <option
                          *ngFor="let category of categories"
                          [value]="category.id"
                        >
                          {{ category.name }}
                        </option>
                      </select>
                      <button
                        type="button"
                        (click)="showAddCategory = true"
                        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    formControlName="dueDate"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Tags
                  </label>
                  <div class="space-y-2">
                    <div
                      class="flex flex-wrap gap-1 min-h-[32px] p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <span
                        *ngFor="let tag of selectedTags"
                        class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center gap-1"
                      >
                        {{ tag }}
                        <button
                          type="button"
                          (click)="removeTag(tag)"
                          class="hover:text-blue-600 dark:hover:text-blue-300"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-3 w-3"
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
                      </span>
                    </div>
                    <input
                      type="text"
                      [(ngModel)]="tagInput"
                      [ngModelOptions]="{ standalone: true }"
                      (keyup.enter)="addTag()"
                      placeholder="Type tag and press Enter"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <div
                      *ngIf="popularTags.length > 0"
                      class="flex flex-wrap gap-1"
                    >
                      <span
                        class="text-xs text-gray-500 dark:text-gray-400 mr-2"
                        >Popular:</span
                      >
                      <button
                        type="button"
                        *ngFor="let tag of popularTags.slice(0, 10)"
                        (click)="selectPopularTag(tag.name)"
                        class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {{ tag.name }} ({{ tag.count }})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
            >
              <button
                type="submit"
                [disabled]="isSubmitting || ticketForm.invalid"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  *ngIf="isSubmitting"
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                {{ isSubmitting ? 'Creating...' : 'Create Ticket' }}
              </button>
              <button
                type="button"
                (click)="close.emit()"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div
          *ngIf="showAddCategory"
          class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black bg-opacity-50"
            (click)="showAddCategory = false"
          ></div>
          <div
            class="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add New Category
            </h4>
            <form [formGroup]="categoryForm" (ngSubmit)="onAddCategory()">
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Category Name <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="name"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Description <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    formControlName="description"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  ></textarea>
                </div>

                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Color <span class="text-red-500">*</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      formControlName="color"
                      class="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      formControlName="color"
                      class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      *ngFor="let color of presetColors"
                      (click)="selectColor(color)"
                      class="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                      [style.background-color]="color"
                    ></button>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  (click)="showAddCategory = false"
                  class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  [disabled]="isAddingCategory || categoryForm.invalid"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {{ isAddingCategory ? 'Adding...' : 'Add Category' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class CreateTicketModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() ticketCreated = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private alertService = inject(AlertService);

  ticketForm!: FormGroup;
  categoryForm!: FormGroup;
  isSubmitting = false;
  isAddingCategory = false;
  showAddCategory = false;

  categories: Category[] = [];
  popularTags: Tag[] = [];
  selectedTags: string[] = [];
  tagInput = '';

  presetColors = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#6366F1',
    '#84CC16',
  ];

  priorities = [
    { value: TicketPriority.Low, label: getPriorityLabel(TicketPriority.Low) },
    {
      value: TicketPriority.Normal,
      label: getPriorityLabel(TicketPriority.Normal),
    },
    {
      value: TicketPriority.High,
      label: getPriorityLabel(TicketPriority.High),
    },
    {
      value: TicketPriority.Critical,
      label: getPriorityLabel(TicketPriority.Critical),
    },
  ];

  ticketTypes = [
    { value: TicketType.Bug, label: getTypeLabel(TicketType.Bug) },
    { value: TicketType.Feature, label: getTypeLabel(TicketType.Feature) },
    { value: TicketType.Support, label: getTypeLabel(TicketType.Support) },
    {
      value: TicketType.Improvement,
      label: getTypeLabel(TicketType.Improvement),
    },
    { value: TicketType.Task, label: getTypeLabel(TicketType.Task) },
    { value: TicketType.Question, label: getTypeLabel(TicketType.Question) },
    { value: TicketType.Incident, label: getTypeLabel(TicketType.Incident) },
  ];

  ngOnInit(): void {
    this.initForms();
    this.loadCategories();
    this.loadPopularTags();
  }

  private initForms(): void {
    this.ticketForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(4000)]],
      priority: ['', Validators.required],
      type: ['', Validators.required],
      customerId: ['', Validators.required],
      categoryId: ['', Validators.required],
      dueDate: [''],
    });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      color: [
        '#3B82F6',
        [Validators.required, Validators.pattern(/^#[0-9A-F]{6}$/i)],
      ],
    });
  }

  private loadCategories(): void {
    this.ticketService
      .getCategories({ isActive: true, pageIndex: 0 })
      .subscribe({
        next: (response) => {
          this.categories = response.items;
        },
        error: () => {
          this.alertService.error('Failed to load categories');
        },
      });
  }

  private loadPopularTags(): void {
    this.ticketService.getPopularTags(15).subscribe({
      next: (tags) => {
        this.popularTags = tags;
      },
    });
  }

  addTag(): void {
    const tag = this.tagInput.trim();
    if (tag && !this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag);
      this.tagInput = '';
    }
  }

  removeTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index >= 0) {
      this.selectedTags.splice(index, 1);
    }
  }

  selectPopularTag(tag: string): void {
    if (!this.selectedTags.includes(tag)) {
      this.selectedTags.push(tag);
    }
  }

  selectColor(color: string): void {
    this.categoryForm.patchValue({ color });
  }

  onAddCategory(): void {
    if (this.categoryForm.invalid) {
      Object.keys(this.categoryForm.controls).forEach((key) => {
        this.categoryForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isAddingCategory = true;
    const request: CreateCategoryRequest = this.categoryForm.value;

    this.ticketService.createCategory(request).subscribe({
      next: () => {
        this.alertService.success('Category added successfully');
        this.showAddCategory = false;
        this.categoryForm.reset({ color: '#3B82F6' });
        this.isAddingCategory = false;
        this.loadCategories();
      },
      error: () => {
        this.alertService.error('Failed to add category');
        this.isAddingCategory = false;
      },
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) {
      Object.keys(this.ticketForm.controls).forEach((key) => {
        this.ticketForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ticketForm.value;

    const request: CreateTicketRequest = {
      title: formValue.title,
      description: formValue.description,
      priority: parseInt(formValue.priority),
      type: parseInt(formValue.type),
      customerId: formValue.customerId,
      categoryId: formValue.categoryId,
      dueDate: formValue.dueDate ? new Date(formValue.dueDate) : undefined,
      tags: this.selectedTags,
    };

    this.ticketService.createTicket(request).subscribe({
      next: () => {
        this.alertService.success('Ticket created successfully');
        this.ticketCreated.emit();
        this.close.emit();
      },
      error: () => {
        this.alertService.error('Failed to create ticket');
        this.isSubmitting = false;
      },
    });
  }
}
