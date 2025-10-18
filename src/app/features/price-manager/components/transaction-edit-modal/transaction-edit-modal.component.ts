import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { PriceManagerService, Transaction, TransactionUpdateRequest } from '../../services/price-manager.service';

@Component({
  selector: 'app-transaction-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-edit-modal.component.html',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class TransactionEditModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() transaction!: Transaction;

  private service = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  editForm!: FormGroup;
  isEditing = false;
  loading = false;
  isDeleting = false;
  isFetching = false;
  originalValues: any = {};

  constructor() {
    this.editForm = this.fb.group({
      transactionType: [null],
      paymentType: [null],
      paymentMethod: [null],
      paymentStatus: [null],
      currency: [null, Validators.required],
      amount: [null, Validators.required],
      balanceBefore: [null],
      balanceAfter: [null],
      referenceId: [null],
      referenceType: [null],
      description: [null],
    });
  }

  ngOnInit(): void {
    if (this.transaction?.id) {
      this.fetchTransactionDetails();
    }
  }

  fetchTransactionDetails(): void {
    this.isFetching = true;
    
    this.service
      .getTransaction(this.transaction.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Update transaction with full details from API
          this.transaction = response;
          
          // Populate form with fetched data
          this.editForm.patchValue({
            transactionType: response.transactionType,
            paymentType: response.paymentType,
            paymentMethod: response.paymentMethod,
            paymentStatus: response.paymentStatus,
            currency: response.currency,
            amount: response.amount,
            balanceBefore: response.balanceBefore,
            balanceAfter: response.balanceAfter,
            referenceId: response.referenceId,
            referenceType: response.referenceType,
            description: response.description,
          });
          
          this.editForm.disable();
          this.isFetching = false;
        },
        error: (error) => {
          console.error('Error fetching transaction details:', error);
          
          // Extract error message from response
          let errorMessage = 'Failed to fetch transaction details';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.alertService.error(errorMessage);
          this.isFetching = false;
          
          // Fallback to input data if available
          if (this.transaction) {
            this.populateFormFromTransaction(this.transaction);
          }
        },
      });
  }

  populateFormFromTransaction(transaction: any): void {
    this.editForm.patchValue({
      transactionType: transaction.transactionType,
      paymentType: transaction.paymentType,
      paymentMethod: transaction.paymentMethod,
      paymentStatus: transaction.paymentStatus,
      currency: transaction.currency,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      referenceId: transaction.referenceId,
      referenceType: transaction.referenceType,
      description: transaction.description,
    });
    this.editForm.disable();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTransactionTypeLabel(type: number): string {
    const types: { [key: number]: string } = {
      0: 'Deposit',
      1: 'Withdrawal',
      2: 'Transfer',
      3: 'Trade',
      4: 'Fee',
      5: 'Commission',
      6: 'Bonus',
      7: 'Refund',
      8: 'Credit',
      9: 'Debit',
      10: 'Adjustment'
    };
    return types[type] || `Type ${type}`;
  }

  startEdit(): void {
    this.isEditing = true;
    this.originalValues = this.editForm.value;
    this.editForm.enable();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm.patchValue(this.originalValues);
    this.editForm.disable();
  }

  saveTransaction(): void {
    if (this.editForm.invalid || this.loading) {
      return;
    }

    this.loading = true;
    const updateData: TransactionUpdateRequest = this.editForm.value;

    this.service
      .updateTransaction(this.transaction.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Transaction updated successfully');
          this.loading = false;
          this.isEditing = false;
          this.editForm.disable();
          
          // Update local transaction object with response
          if (response) {
            Object.assign(this.transaction, response);
          }
          
          // Notify parent component to refresh data
          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error updating transaction:', error);
          
          // Extract error message from response
          let errorMessage = 'Failed to update transaction';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.alertService.error(errorMessage);
          this.loading = false;
        },
      });
  }

  deleteTransaction(permanent: boolean): void {
    const confirmMessage = permanent
      ? 'Are you sure you want to permanently delete this transaction? This action cannot be undone.'
      : 'Are you sure you want to delete this transaction?';

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loading = true;
    this.isDeleting = true;

    this.service
      .deleteTransaction(this.transaction.id, permanent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alertService.success(
            permanent
              ? 'Transaction permanently deleted'
              : 'Transaction deleted successfully'
          );
          this.loading = false;
          this.isDeleting = false;
          
          // Close modal and notify parent to refresh
          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error deleting transaction:', error);
          
          // Extract error message from response
          let errorMessage = 'Failed to delete transaction';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          this.alertService.error(errorMessage);
          this.loading = false;
          this.isDeleting = false;
        },
      });
  }

  onClose(): void {
    if (this.isEditing && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    this.modalRef.dismiss();
  }
}

