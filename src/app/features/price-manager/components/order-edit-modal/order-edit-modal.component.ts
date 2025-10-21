import { Component, inject, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import {
  PriceManagerService,
  Order,
  OrderUpdateRequest,
  ReopenOrderRequest,
} from '../../services/price-manager.service';

@Component({
  selector: 'app-order-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-edit-modal.component.html',
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
export class OrderEditModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() orderId!: string;
  @Input() order?: Order;

  private service = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  editForm!: FormGroup;
  reopenForm!: FormGroup;
  isEditing = false;
  loading = false;
  loadingData = false;
  originalValues: any = {};
  orderData: any | null = null;
  showReopenModal = false;

  sideOptions = [
    { value: 1, label: 'Buy', class: 'text-green-600 dark:text-green-400' },
    { value: 2, label: 'Sell', class: 'text-red-600 dark:text-red-400' },
  ];

  statusOptions = [
    { value: 1, label: 'Active' },
    { value: 2, label: 'Partially Filled' },
    { value: 3, label: 'Filled' },
    { value: 4, label: 'Cancelled' },
    { value: 5, label: 'Rejected' },
    { value: 6, label: 'Liquidated' },
  ];

  constructor() {
    this.editForm = this.fb.group({
      side: [null],
      status: [null, [Validators.required]],
      volume: [null, [Validators.required, Validators.min(0.00000001)]],
      leverage: [1, [Validators.min(1)]],
      stopLoss: [null, [Validators.min(0)]],
      takeProfit: [null, [Validators.min(0)]],
      openPrice: [null, [Validators.required, Validators.min(0)]],
      comment: [null],
    });

    this.reopenForm = this.fb.group({
      applyNewOutcome: [true],
      newDesiredPnL: [null, [Validators.required]],
      newClosePrice: [null, [Validators.required, Validators.min(0)]],
      reason: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    if (this.order) {
      this.orderData = this.order;
      this.populateForm();
    } else if (this.orderId) {
      this.fetchOrderData();
    }
  }

  fetchOrderData(): void {
    this.loadingData = true;

    this.service
      .getOrder(this.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.orderData = response.order || response;
          this.populateForm();
          this.loadingData = false;
        },
        error: (error) => {
          console.error('Error fetching order:', error);

          let errorMessage = 'Failed to load order details';
          if (error?.error?.error) {
            errorMessage = error.error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          this.alertService.error(errorMessage);
          this.loadingData = false;
          this.modalRef.dismiss();
        },
      });
  }

  populateForm(): void {
    if (!this.orderData) return;

    const metadata = this.orderData.metadata || {};

    this.editForm.patchValue({
      side: this.orderData.side,
      status: this.orderData.status,
      volume: this.orderData.quantity || this.orderData.volume,
      leverage: this.orderData.leverage || 1,
      openPrice: this.orderData.price || this.orderData.openPrice,
      stopLoss: this.orderData.stopPrice || null,
      takeProfit: metadata.TargetProfit || metadata.ExpectedProfit || null,
      comment: this.orderData.comment || metadata.Comment || null,
    });

    this.editForm.disable();
    this.originalValues = this.editForm.value;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getOrderSide(side: number): string {
    return side === 1 ? 'Buy' : side === 2 ? 'Sell' : 'Unknown';
  }

  getOrderStatus(status: number): string {
    const statuses: { [key: number]: string } = {
      1: 'Active',
      2: 'Partially Filled',
      3: 'Filled',
      4: 'Cancelled',
      5: 'Rejected',
      6: 'Liquidated',
    };
    return statuses[status] || `Status ${status}`;
  }

  getBuyPL(): number | null {
    const metadata = this.orderData?.metadata || {};
    if (this.orderData?.side === 1) {
      return metadata.ExpectedProfit || metadata.TargetProfit || null;
    }
    return null;
  }

  getSellPL(): number | null {
    const metadata = this.orderData?.metadata || {};
    if (this.orderData?.side === 2) {
      return metadata.ExpectedProfit || metadata.TargetProfit || null;
    }
    return null;
  }

  getRequiredMargin(): number | null {
    const metadata = this.orderData?.metadata || {};
    return this.orderData?.requiredMargin || metadata.RequiredMargin || null;
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

  saveOrder(): void {
    if (this.editForm.invalid || this.loading || !this.orderData) {
      return;
    }

    this.loading = true;
    const formValue = this.editForm.value;

    const updateData: OrderUpdateRequest = {
      side: formValue.side,
      status: formValue.status,
      volume: formValue.volume,
      leverage: formValue.leverage,
      openPrice: formValue.openPrice,
      stopLoss: formValue.stopLoss,
      takeProfit: formValue.takeProfit,
      comment: formValue.comment,
    };

    this.service
      .updateOrder(this.orderData.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order updated successfully');
          this.loading = false;
          this.isEditing = false;
          this.editForm.disable();

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }

          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error updating order:', error);

          let errorMessage = 'Failed to update order';
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

  cancelOrder(): void {
    if (this.loading || !this.orderData) {
      return;
    }

    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    this.loading = true;

    this.service
      .cancelOrder(this.orderData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order cancelled successfully');
          this.loading = false;

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }

          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error cancelling order:', error);

          let errorMessage = 'Failed to cancel order';
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

  onClose(): void {
    if (
      this.isEditing &&
      !confirm('You have unsaved changes. Are you sure you want to close?')
    ) {
      return;
    }
    this.modalRef.dismiss();
  }

  isOrderClosed(): boolean {
    if (!this.orderData) return false;
    // Status 3 = Filled, 4 = Cancelled, 5 = Rejected, 6 = Liquidated
    return (
      this.orderData.status === 3 ||
      this.orderData.status === 4 ||
      this.orderData.status === 5 ||
      this.orderData.status === 6
    );
  }

  openReopenModal(): void {
    this.showReopenModal = true;
    if (this.orderData) {
      const metadata = this.orderData.metadata || {};
      this.reopenForm.patchValue({
        newDesiredPnL: metadata.ExpectedProfit || metadata.TargetProfit || 0,
        newClosePrice: this.orderData.price || 0,
      });
    }
  }

  closeReopenModal(): void {
    this.showReopenModal = false;
    this.reopenForm.reset({
      applyNewOutcome: true,
    });
  }

  reopenOrder(): void {
    if (this.reopenForm.invalid || this.loading || !this.orderData) {
      return;
    }

    this.loading = true;
    const adminId = this.authService.getUserId();

    if (!adminId) {
      this.alertService.error('Unable to get admin ID. Please log in again.');
      this.loading = false;
      return;
    }

    const reopenData: ReopenOrderRequest = {
      adminId,
      ...this.reopenForm.value,
    };

    this.service
      .reopenOrder(this.orderData.id, reopenData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order reopened successfully');
          this.loading = false;
          this.showReopenModal = false;
          this.reopenForm.reset({
            applyNewOutcome: true,
          });

          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }

          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error reopening order:', error);

          let errorMessage = 'Failed to reopen order';
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

  preventInvalidNumberInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key === '.') {
      const target = event.target as HTMLInputElement;
      if (target && target.value.includes('.')) {
        event.preventDefault();
      }
    }
  }
}
