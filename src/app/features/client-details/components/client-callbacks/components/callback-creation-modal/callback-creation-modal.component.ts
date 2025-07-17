import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CallbacksService } from '../../services/callbacks.service';
import {
  Callback,
  CallbackCreateRequest,
  CallbackUpdateRequest,
  CallbackCreateResponse,
} from '../../models/callback.model';
import { ModalRef } from '../../../../../../shared/models/modals/modal.model';
import { Client } from '../../../../../clients/models/clients.model';
import { AlertService } from '../../../../../../core/services/alert.service';
import { HasPermissionDirective } from '../../../../../../core/directives/has-permission.directive';

@Component({
  selector: 'app-callback-creation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ isEditMode ? 'Edit Callback' : 'Schedule New Callback' }}
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <form [formGroup]="callbackForm" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Callback Date & Time -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Callback Date & Time <span class="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                formControlName="callbackDateTime"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  callbackForm.get('callbackDateTime')?.invalid &&
                  callbackForm.get('callbackDateTime')?.touched
                "
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  callbackForm.get('callbackDateTime')?.invalid &&
                  callbackForm.get('callbackDateTime')?.touched
                "
              >
                Callback date and time is required
              </p>
            </div>

            <!-- Reminder (in minutes) -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Reminder (minutes before) <span class="text-red-500">*</span>
              </label>
              <input
                type="number"
                formControlName="reminderInMinutes"
                min="0"
                max="1440"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                [class.border-red-500]="
                  callbackForm.get('reminderInMinutes')?.invalid &&
                  callbackForm.get('reminderInMinutes')?.touched
                "
                placeholder="15"
              />
              <p
                class="mt-1 text-sm text-red-600 dark:text-red-400"
                *ngIf="
                  callbackForm.get('reminderInMinutes')?.invalid &&
                  callbackForm.get('reminderInMinutes')?.touched
                "
              >
                <span
                  *ngIf="callbackForm.get('reminderInMinutes')?.errors?.['required']"
                >
                  Reminder time is required
                </span>
                <span
                  *ngIf="callbackForm.get('reminderInMinutes')?.errors?.['min']"
                >
                  Reminder must be at least 0 minutes
                </span>
                <span
                  *ngIf="callbackForm.get('reminderInMinutes')?.errors?.['max']"
                >
                  Reminder cannot exceed 1440 minutes (24 hours)
                </span>
              </p>
            </div>
          </div>

          <!-- Client Information (Read-only) -->
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4
              class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              Client Information
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400">
                  First Name
                </label>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ client.firstName }}
                </p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400">
                  Last Name
                </label>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ client.lastName }}
                </p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 dark:text-gray-400">
                  Email
                </label>
                <p
                  class="text-sm text-gray-900 dark:text-white"
                  *hasPermission="9"
                >
                  {{ client.email }}
                </p>
              </div>
            </div>
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
          [disabled]="callbackForm.invalid || isSubmitting"
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
            {{
              isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Scheduling...'
                : isEditMode
                ? 'Update Callback'
                : 'Schedule Callback'
            }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [],
})
export class CallbackCreationModalComponent implements OnInit {
  @Input() modalRef!: ModalRef;
  @Input() client!: Client;
  @Input() callback?: Callback;

  private fb = inject(FormBuilder);
  private callbacksService = inject(CallbacksService);
  private alertService = inject(AlertService);

  isSubmitting = false;
  isEditMode = false;
  callbackForm: FormGroup;

  constructor() {
    this.callbackForm = this.fb.group({
      callbackDateTime: ['', Validators.required],
      reminderInMinutes: [
        15,
        [Validators.required, Validators.min(0), Validators.max(1440)],
      ],
    });
  }

  ngOnInit(): void {
    this.isEditMode = !!this.callback;

    if (this.isEditMode && this.callback) {
      this.populateForm();
    } else {
      this.setDefaultValues();
    }
  }

  private populateForm(): void {
    if (!this.callback) return;

    const callbackDateTime = new Date(this.callback.callbackDateTime);

    this.callbackForm.patchValue({
      callbackDateTime: callbackDateTime.toISOString().slice(0, 16),
      reminderInMinutes: this.callback.reminderInMinutes || 15,
    });
  }

  private setDefaultValues(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    this.callbackForm.patchValue({
      callbackDateTime: tomorrow.toISOString().slice(0, 16),
      reminderInMinutes: 15,
    });
  }

  onSubmit(): void {
    if (this.callbackForm.invalid) {
      Object.keys(this.callbackForm.controls).forEach((key) => {
        this.callbackForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode) {
      this.updateCallback();
    } else {
      this.createCallback();
    }
  }

  private createCallback(): void {
    const formValue = this.callbackForm.value;

    const callbackData: CallbackCreateRequest = {
      callbackDateTime: new Date(formValue.callbackDateTime).toISOString(),
      clientId: this.client.id,
      clientFirstName: this.client.firstName,
      clientLastName: this.client.lastName,
      clientEmail: this.client.email,
      reminderInMinutes: formValue.reminderInMinutes,
    };

    this.callbacksService.createCallback(callbackData).subscribe({
      next: (response: CallbackCreateResponse) => {
        this.isSubmitting = false;
        this.alertService.success('Callback scheduled successfully!');
        this.modalRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        if (error.status === 400) {
          this.alertService.error(
            'Invalid data provided. Please check your inputs.'
          );
        } else {
          this.alertService.error(
            'Failed to schedule callback. Please try again.'
          );
        }
      },
    });
  }

  private updateCallback(): void {
    if (!this.callback) return;

    const formValue = this.callbackForm.value;

    const updateData: CallbackUpdateRequest = {
      id: this.callback.id,
      callbackDateTime: new Date(formValue.callbackDateTime).toISOString(),
      reminderInMinutes: formValue.reminderInMinutes,
    };

    this.callbacksService
      .updateCallback(this.callback.id, updateData)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.alertService.success('Callback updated successfully!');
          this.modalRef.close(true);
        },
        error: (error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid data provided. Please check your inputs.'
            );
          } else if (error.status === 404) {
            this.alertService.error('Callback not found.');
          } else {
            this.alertService.error(
              'Failed to update callback. Please try again.'
            );
          }
        },
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
