// src/app/features/officies/components/add-manager-modal/add-manager-modal.component.ts

import { Component, OnInit, OnDestroy, inject, Input, HostListener } from '@angular/core';
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
  templateUrl: './add-manager-modal.component.html',
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

  // Operator dropdown
  operatorDropdownOpen = false;
  operatorSearchTerm = '';
  filteredOperators: OperatorDropdownItem[] = [];
  selectedOperator: OperatorDropdownItem | null = null;

  constructor() {
    this.managerForm = this.fb.group({
      operatorId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    // Initialize filtered operators
    this.filteredOperators = this.operators;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdown when clicking outside
    if (!(event.target as Element).closest('.relative')) {
      this.operatorDropdownOpen = false;
    }
  }

  // Operator dropdown methods
  toggleOperatorDropdown(): void {
    // If this dropdown is already open, just close it
    if (this.operatorDropdownOpen) {
      this.operatorDropdownOpen = false;
      return;
    }
    // Open the dropdown
    this.operatorDropdownOpen = true;
  }

  onOperatorSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.operatorSearchTerm = value;
    this.filteredOperators = this.operators.filter(operator =>
      operator.value.toLowerCase().includes(value) ||
      operator.email.toLowerCase().includes(value)
    );
  }

  selectOperator(operator: OperatorDropdownItem): void {
    this.selectedOperator = operator;
    this.managerForm.patchValue({ operatorId: operator.id });
    this.operatorDropdownOpen = false;
  }

  getSelectedOperatorText(): string {
    if (!this.selectedOperator) {
      return 'Select an operator...';
    }
    return `${this.selectedOperator.value} - ${this.selectedOperator.email}`;
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
          // Handle specific error cases
          if (error.status === 400) {
            this.alertService.error(
              'Invalid operator selected. Please try again.'
            );
          } else if (error.status === 404) {
            this.alertService.error('The selected operator was not found.');
          } else if (error.status === 409) {
            this.alertService.error(
              'This operator is already assigned as a manager for another office.'
            );
          } else if (error.message) {
            // If the service throws an error with a message
            this.alertService.error(error.message);
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
            `Manager ${operatorName} assigned successfully!`
          );
          this.modalRef.close(true);
        }
      });
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }
}
