// src/app/features/tickets/components/create-ticket-modal/create-ticket-modal.component.ts

import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AlertService } from '../../../../core/services/alert.service';
import {
  CreateTicketRequest,
  TicketPriority,
  TicketType,
  getPriorityLabel,
  getTypeLabel,
} from '../../models/ticket.model';

@Component({
  selector: 'app-create-ticket-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
          class="inline-block z-50 relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all mt-[5vh] max-h-[90vh] overflow-y-auto sm:align-middle sm:max-w-2xl sm:w-full"
        >
          <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()">
            <!-- Header -->
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
                  class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 sticky top-0 "
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
                <!-- Title -->
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

                <!-- Description -->
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
                  <!-- Type -->
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

                  <!-- Priority -->
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
                  <!-- Customer ID -->
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

                  <!-- Category -->
                  <div>
                    <label
                      class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Category <span class="text-red-500">*</span>
                    </label>
                    <select
                      formControlName="categoryId"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select category</option>
                      <option value="c1d2e3f4-5678-90ab-cdef-1234567890ab">
                        Technical Support
                      </option>
                      <option value="a1b2c3d4-5678-90ab-cdef-1234567890ab">
                        Billing
                      </option>
                      <option value="b2c3d4e5-6789-01bc-def2-3456789012bc">
                        General
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Due Date -->
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

                <!-- Tags -->
                <div>
                  <label
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    formControlName="tags"
                    placeholder="e.g., urgent, customer-request, bug-fix"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <!-- Footer -->
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
  isSubmitting = false;

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
    this.initForm();
  }

  private initForm(): void {
    this.ticketForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(4000)]],
      priority: ['', Validators.required],
      type: ['', Validators.required],
      customerId: ['', Validators.required],
      categoryId: ['', Validators.required],
      dueDate: [''],
      tags: [''],
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
      tags: formValue.tags
        ? formValue.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag)
        : [],
    };

    this.ticketService.createTicket(request).subscribe({
      next: () => {
        this.alertService.success('Ticket created successfully');
        this.ticketCreated.emit();
        this.close.emit();
      },
      error: (error) => {
        this.alertService.error('Failed to create ticket');
        this.isSubmitting = false;
      },
    });
  }
}
