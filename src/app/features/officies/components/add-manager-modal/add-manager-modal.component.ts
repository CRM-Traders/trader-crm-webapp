// src/app/features/officies/components/add-manager-modal/add-manager-modal.component.ts

import { Component, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { OfficeRulesService } from '../../services/office-rules.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';

import {
  OfficeManager,
  AddManagerRequest,
  OperatorDropdownItem,
} from '../../models/office-rules.model';

@Component({
  selector: 'app-add-manager-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">
      <!-- Modal Header -->
      <div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <h4 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ currentManager ? 'Change Manager' : 'Add manager' }}
        </h4>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6">
        <!-- Information Text -->
        <div
          class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
                Manager Assignment
              </h3>
              <div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  You are about to
                  {{
                    currentManager ? 'change the manager for' : 'add Manager to'
                  }}
                  the Office "{{ officeName }}".
                  {{
                    currentManager
                      ? 'The current manager will be replaced.'
                      : 'He will be able to see and manage all desks, teams and operators inside this office.'
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Manager (if exists) -->
        <div
          *ngIf="currentManager"
          class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <h5 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Current Manager
          </h5>
          <div class="flex items-center space-x-3">
            <div
              class="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
            >
              <svg
                class="h-4 w-4 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ currentManager.operatorName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ currentManager.operatorEmail }}
              </p>
            </div>
          </div>
        </div>

        <!-- No Operators Available Message -->
        <div *ngIf="operators.length === 0" class="text-center py-8">
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No operators available
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            There are no operators pre-assigned to current branch that can be
            assigned as managers.
          </p>
        </div>

        <!-- Operator Selection Form -->
        <form [formGroup]="managerForm" *ngIf="operators.length > 0">
          <div>
            <label
              for="operatorId"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Choose an operator <span class="text-red-500">*</span>
            </label>
            <select
              id="operatorId"
              formControlName="operatorId"
              class="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              [class.border-red-500]="
                managerForm.get('operatorId')?.invalid &&
                managerForm.get('operatorId')?.touched
              "
            >
              <option value="">-- Select --</option>
              <option *ngFor="let operator of operators" [value]="operator.id">
                {{ operator.value }} - {{ operator.email }}
              </option>
            </select>
            <p
              class="mt-1 text-sm text-red-600 dark:text-red-400"
              *ngIf="
                managerForm.get('operatorId')?.invalid &&
                managerForm.get('operatorId')?.touched
              "
            >
              <span *ngIf="managerForm.get('operatorId')?.errors?.['required']">
                Please select an operator
              </span>
            </p>
          </div>
        </form>

        <!-- Warning for no operators -->
        <div
          *ngIf="operators.length === 0"
          class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <h3
                class="text-sm font-medium text-yellow-800 dark:text-yellow-200"
              >
                No operators available
              </h3>
              <div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  There are no operators pre-assigned to the current branch.
                </p>
              </div>
            </div>
          </div>
        </div>
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
          *ngIf="operators.length > 0"
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          (click)="onSubmit()"
          [disabled]="managerForm.invalid || isSubmitting"
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
            {{ isSubmitting ? 'Confirming...' : 'Confirm' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class AddManagerModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() officeId!: string;
  @Input() officeName!: string;
  @Input() currentManager?: OfficeManager | null;
  @Input() operators: OperatorDropdownItem[] = [];

  private fb = inject(FormBuilder);
  private officeRulesService = inject(OfficeRulesService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  managerForm: FormGroup;
  isSubmitting = false;

  constructor() {
    this.managerForm = this.fb.group({
      operatorId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Form is already initialized in constructor
    // No additional initialization needed for this simple modal
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.managerForm.invalid || this.operators.length === 0) {
      Object.keys(this.managerForm.controls).forEach((key) => {
        this.managerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.managerForm.value;

    const request: AddManagerRequest = {
      operatorId: formValue.operatorId,
    };

    this.officeRulesService
      .addOfficeManager(this.officeId, request)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isSubmitting = false;
          if (error.status === 400) {
            this.alertService.error(
              'Invalid operator selected. Please try again.'
            );
          } else if (error.status === 404) {
            this.alertService.error('The selected operator was not found.');
          } else if (error.status === 409) {
            this.alertService.error(
              'This operator is already assigned as a manager elsewhere.'
            );
          } else {
            this.alertService.error(
              'Failed to assign manager. Please try again.'
            );
          }
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isSubmitting = false;
        if (response !== null) {
          const selectedOperator = this.operators.find(
            (op) => op.id === formValue.operatorId
          );
          const operatorName = selectedOperator
            ? selectedOperator.value
            : 'operator';

          this.alertService.success(
            this.currentManager
              ? `Manager changed successfully to ${operatorName}!`
              : `Manager ${operatorName} assigned successfully!`
          );
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
