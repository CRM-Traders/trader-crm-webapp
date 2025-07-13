// src/app/features/clients/components/assign-operator-modal/assign-operator-modal.component.ts

import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { AlertService } from '../../../../core/services/alert.service';
import { OperatorDropdownItem } from '../../../officies/models/office-rules.model';
import { Client } from '../../models/clients.model';
import { AssignClientsToOperatorRequest, ClientsService, ClientType } from '../../services/clients.service';

export type UserType = 'client' | 'lead';


@Component({
  selector: 'app-assign-operator-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Assign Clients to Operator
        </h2>
      </div>

      <!-- Content -->
      <div class="space-y-6">
        <!-- Selected Clients Info -->
        <div class="bg-blue-50 dark:bg-blue-900/5 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-blue-800 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-blue-800 dark:text-blue-400 font-medium">
              {{ selectedClients.length }} client{{ selectedClients.length === 1 ? '' : 's' }} selected for assignment
            </span>
          </div>
          
          <!-- Client Names Preview -->
          <div class="mt-2 max-h-32 overflow-y-auto">
            <div class="text-sm text-blue-700 dark:text-blue-500">
              <div *ngFor="let client of selectedClients.slice(0, 5)" class="truncate">
                {{ client.firstName }} {{ client.lastName }} ({{ client.email }})
              </div>
              <div *ngIf="selectedClients.length > 5" class="text-blue-600 dark:text-blue-400 font-medium">
                ... and {{ selectedClients.length - 5 }} more
              </div>
            </div>
          </div>
        </div>

        <!-- Assignment Form -->
        <form [formGroup]="assignmentForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Operator Selection -->
          <div>
            <label for="operatorId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Operator <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <select
                id="operatorId"
                formControlName="operatorId"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                [disabled]="loadingOperators || isSubmitting"
              >
                <option value="" disabled>
                  {{ loadingOperators ? 'Loading operators...' : 'Choose an operator' }}
                </option>
                <option *ngFor="let operator of operators" [value]="operator.id">
                  {{ operator.value }}
                </option>
              </select>
              
              <!-- Loading indicator for operators -->
              <div *ngIf="loadingOperators" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            
            <!-- Validation Error -->
            <div *ngIf="assignmentForm.get('operatorId')?.touched && assignmentForm.get('operatorId')?.errors?.['required']" 
                 class="mt-1 text-sm text-red-600 dark:text-red-400">
              Please select an operator
            </div>
          </div>

          <!-- Active Status -->
          <div class="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              formControlName="isActive"
              class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            >
            <label for="isActive" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Set assignment as active
            </label>
          </div>
        </form>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          (click)="closeModal()"
          [disabled]="isSubmitting"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          (click)="onSubmit()"
          [disabled]="assignmentForm.invalid || isSubmitting || loadingOperators"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
                 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed 
                 transition-colors flex items-center"
        >
          <svg *ngIf="isSubmitting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSubmitting ? 'Assigning...' : 'Assign Clients' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: []
})
export class AssignOperatorModalComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private modalService = inject(ModalService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  @Input() selectedClients: Client[] = [];
  @Input() userType!: UserType;

  assignmentForm: FormGroup;
  operators: OperatorDropdownItem[] = [];
  loadingOperators = false;
  isSubmitting = false;

  constructor() {
    this.assignmentForm = this.fb.group({
      operatorId: ['', [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadOperators();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOperators(): void {
    this.loadingOperators = true;

    this.clientsService.getAvailableOperators(0, 1000, '')
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading operators:', error);
          this.alertService.error('Failed to load operators');
          return of([]);
        }),
        finalize(() => {
          this.loadingOperators = false;
        })
      )
      .subscribe((operators) => {
        this.operators = operators;
      });
  }

  onSubmit(): void {
    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    const formValue = this.assignmentForm.value;
    const clientIds = this.selectedClients.map(client => client.id);

    const request: AssignClientsToOperatorRequest = {
      operatorId: formValue.operatorId,
      clientType: Number(this.userType), // Always Client type as specified
      entityIds: clientIds,
      isActive: formValue.isActive
    };

    this.isSubmitting = true;

    this.clientsService.assignClientsToOperator(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response) => {
          const selectedOperator = this.operators.find(op => op.id === formValue.operatorId);
          const operatorName = selectedOperator?.value || 'Selected operator';

          if (response.successCount > 0) {
            this.alertService.success(
              `Successfully assigned ${response.successCount} client${response.successCount === 1 ? '' : 's'} to ${operatorName}`
            );
          }

          if (response.failureCount > 0) {
            // Display specific error messages if available
            if (response.errors && response.errors.length > 0) {
              if (response.failureCount === 1) {
                // Single failure - show the specific error with name
                const errorWithName = this.replaceEntityIdWithName(response.errors[0]);
                this.alertService.warning(errorWithName);
              } else {
                // Multiple failures - show all failed names
                const failedNames = this.getFailedEntityNames(response.errors);
                const summaryMessage = `${response.failureCount} leads could not be assigned: ${failedNames.join(', ')}`;
                this.alertService.warning(summaryMessage);
              }
            } else {
              this.alertService.warning("Some users have already been assigned to operator.");
            }
          }

          this.modalService.closeAll(); // Close with success result
        },
        error: (error) => {
          console.error('Error assigning clients:', error);
          this.alertService.error('Failed to assign clients to operator');
        }
      });
  }

  closeModal(): void {
    this.modalService.closeAll();
  }

  /**
   * Replace entity ID in error message with the actual name
   */
  private replaceEntityIdWithName(errorMessage: string): string {
    // Extract entity ID from error message
    const entityIdMatch = errorMessage.match(/Entity ([a-f0-9-]+)/);
    if (entityIdMatch) {
      const entityId = entityIdMatch[1];
      // Find the corresponding client/lead by ID
      const entity = this.selectedClients.find(client => client.id === entityId);
      if (entity) {
        const entityName = `${entity.firstName} ${entity.lastName}`;
        // Replace the ID with the name
        return errorMessage.replace(`Entity ${entityId}`, `Lead "${entityName}"`);
      }
    }
    return errorMessage;
  }

  /**
   * Get all failed entity names from error messages
   */
  private getFailedEntityNames(errors: string[]): string[] {
    const failedNames: string[] = [];
    
    for (const error of errors) {
      const entityIdMatch = error.match(/Entity ([a-f0-9-]+)/);
      if (entityIdMatch) {
        const entityId = entityIdMatch[1];
        const entity = this.selectedClients.find(client => client.id === entityId);
        if (entity) {
          failedNames.push(`${entity.firstName} ${entity.lastName}`);
        }
      }
    }
    
    return failedNames;
  }
}