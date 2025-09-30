// src/app/features/clients/components/assign-operator-modal/assign-operator-modal.component.ts

import { Component, OnInit, inject, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';
import { ModalService } from '../../../../shared/services/modals/modal.service';
import { AlertService } from '../../../../core/services/alert.service';
import { OperatorDropdownItem } from '../../../officies/models/office-rules.model';
import { Client } from '../../models/clients.model';
import {
  AssignClientsToOperatorRequest,
  ClientsService,
  ClientType,
  ShuffleClientsRequest,
  OperatorAssignment,
} from '../../services/clients.service';

export type UserType = 0 | 1; // 0 = lead, 1 = client

@Component({
  selector: 'app-assign-operator-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './assign-operator-modal.component.html',
  styleUrls: [],
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
  operatorAssignments: OperatorAssignment[] = [];
  dropdownOpen: boolean[] = [];
  operatorSearchTerm: string[] = [];

  constructor() {
    this.assignmentForm = this.fb.group({
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadOperators();
    this.addOperatorAssignment(); // Start with one operator assignment
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOperators(): void {
    this.loadingOperators = true;

    this.clientsService
      .getAvailableOperators(0, 1000, '')
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
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

  addOperatorAssignment(): void {
    this.operatorAssignments.push({
      operatorId: '',
      percentage: 0
    });
    this.dropdownOpen.push(false);
    this.operatorSearchTerm.push('');
  }

  removeOperatorAssignment(index: number): void {
    if (this.operatorAssignments.length > 1) {
      this.operatorAssignments.splice(index, 1);
      this.dropdownOpen.splice(index, 1);
      this.operatorSearchTerm.splice(index, 1);
    }
  }

  updateOperatorAssignment(index: number, field: 'operatorId' | 'percentage', value: string | number): void {
    if (field === 'percentage') {
      this.operatorAssignments[index].percentage = Number(value);
    } else {
      this.operatorAssignments[index].operatorId = value as string;
    }
  }

  // Dropdown helpers
  toggleDropdown(index: number): void {
    if (this.loadingOperators || this.isSubmitting) return;
    // Close others
    this.dropdownOpen = this.dropdownOpen.map((_, i) => i === index ? !this.dropdownOpen[i] : false);
  }

  closeAllDropdowns(): void {
    this.dropdownOpen = this.dropdownOpen.map(() => false);
  }

  onSearchInput(index: number, value: string): void {
    this.operatorSearchTerm[index] = value;
  }

  getFilteredOperators(index: number): OperatorDropdownItem[] {
    const term = (this.operatorSearchTerm[index] || '').toLowerCase().trim();
    if (!term) return this.operators;
    return this.operators.filter((op) => (op.value || '').toLowerCase().includes(term));
  }

  selectOperator(index: number, operator: OperatorDropdownItem): void {
    this.updateOperatorAssignment(index, 'operatorId', operator.id);
    this.dropdownOpen[index] = false;
  }

  getOperatorLabelById(id: string): string {
    const found = this.operators.find((o) => o.id === id);
    return found ? found.value : '';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllDropdowns();
  }

  getTotalPercentage(): number {
    return this.operatorAssignments.reduce((total, assignment) => total + assignment.percentage, 0);
  }

  isFormValid(): boolean {
    const hasValidAssignments = this.operatorAssignments.every(assignment => 
      assignment.operatorId && assignment.percentage > 0
    );
    const totalPercentage = this.getTotalPercentage();
    return hasValidAssignments && totalPercentage === 100;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.alertService.warning('Please ensure all operators are selected and percentages total 100%');
      return;
    }

    const clientIds = this.selectedClients.map((client) => client.id);

    const request: ShuffleClientsRequest = {
      clientIds: clientIds,
      clientType: Number(this.userType),
      operators: this.operatorAssignments
    };

    this.isSubmitting = true;

    this.clientsService
      .shuffleClients(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response) => {
          if (response.successCount > 0) {
            // Check if this is for leads or clients based on userType
            const entityType = this.userType === 0 ? 'lead' : 'client';
            this.alertService.success(
              `Successfully assigned ${response.successCount} ${entityType}${
                response.successCount === 1 ? '' : 's'
              } to operators`
            );
          }

          if (response.failureCount > 0) {
            // Display specific error messages if available
            if (response.errors && response.errors.length > 0) {
              if (response.failureCount === 1) {
                // Single failure - show the specific error with name
                const errorWithName = this.replaceEntityIdWithName(
                  response.errors[0]
                );
                this.alertService.warning(errorWithName);
              } else {
                // Multiple failures - show all failed names
                const failedNames = this.getFailedEntityNames(response.errors);
                const entityType = this.userType === 0 ? 'leads' : 'clients';
                this.alertService.warning(
                  `${entityType} already assigned to an active operator`
                );
              }
            } else {
              // Check if this is for leads or clients based on userType
              const entityType = this.userType === 0 ? 'lead' : 'client';
              this.alertService.warning(
                `${entityType} already assigned to an active operator`
              );
            }
          }

          this.modalService.closeLatest(true); // Close with success result
        },
        error: (error) => {
          const entityType = this.userType === 0 ? 'leads' : 'clients';
          this.alertService.error(`Failed to assign ${entityType} to operators`);
        },
      });
  }

  closeModal(): void {
    this.modalService.dismissLatest('cancel');
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
      const entity = this.selectedClients.find(
        (client) => client.id === entityId
      );
      if (entity) {
        const entityName = `${entity.firstName} ${entity.lastName}`;
        // Replace the ID with the name
        const entityType = this.userType === 0 ? 'Lead' : 'Client';
        return errorMessage.replace(
          `Entity ${entityId}`,
          `${entityType} "${entityName}"`
        );
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
        const entity = this.selectedClients.find(
          (client) => client.id === entityId
        );
        if (entity) {
          failedNames.push(`${entity.firstName} ${entity.lastName}`);
        }
      }
    }

    return failedNames;
  }
}
