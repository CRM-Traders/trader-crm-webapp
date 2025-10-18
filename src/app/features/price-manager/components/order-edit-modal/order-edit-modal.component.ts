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
import { AuthService } from '../../../../core/services/auth.service';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { PriceManagerService, Order, OrderUpdateRequest, ReopenOrderRequest } from '../../services/price-manager.service';
import { TradingViewChartComponent } from '../../../../shared/components/trading-view-chart/trading-view-chart.component';

@Component({
  selector: 'app-order-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TradingViewChartComponent],
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
  @Input() orderId!: string; // Changed from order to orderId
  @Input() order?: Order; // Optional, can be passed for immediate display

  private service = inject(PriceManagerService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  editForm!: FormGroup;
  reopenForm!: FormGroup;
  isEditing = true;
  loading = false;
  loadingData = false; // New loading state for fetching order data
  originalValues: any = {};
  orderData: Order | null = null; // Store fetched order data
  showReopenModal = false;

  constructor() {
    this.editForm = this.fb.group({
      price: [null, [Validators.required, Validators.min(0)]],
      quantity: [null, [Validators.required, Validators.min(0)]],
      filledQuantity: [null, [Validators.min(0)]],
      status: [null],
      side: [null],
      orderType: [null],
      leverage: [null, [Validators.min(1)]],
      stopPrice: [null, [Validators.min(0)]],
      clientOrderId: [null],
      positionEntryPrice: [null, [Validators.min(0)]],
      positionQuantity: [null],
      positionMargin: [null, [Validators.min(0)]],
      metadata: [null],
    });

    this.reopenForm = this.fb.group({
      applyNewOutcome: [true],
      newDesiredPnL: [null, [Validators.required]],
      newClosePrice: [null, [Validators.required, Validators.min(0)]],
      reason: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    // If order is passed directly, use it immediately
    if (this.order) {
      this.orderData = this.order;
      this.populateForm();
    }
    // If orderId is provided, fetch the order from API
    else if (this.orderId) {
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
          // Extract order from nested response structure
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
          // Close modal on error
          this.modalRef.dismiss();
        },
      });
  }

  populateForm(): void {
    if (!this.orderData) return;

    this.editForm.patchValue({
      price: this.orderData.price,
      quantity: this.orderData.quantity,
      filledQuantity: this.orderData.filledQuantity,
      status: this.orderData.status,
      side: this.orderData.side,
      orderType: this.orderData.orderType,
      leverage: this.orderData.leverage,
      stopPrice: this.orderData.stopPrice || null,
      clientOrderId: this.orderData.clientOrderId || null,
      positionEntryPrice: null,
      positionQuantity: null,
      positionMargin: null,
      metadata: this.orderData.metadata || null,
    });
    // Default to edit mode on open
    this.editForm.enable();
    this.originalValues = this.editForm.value;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getOrderType(type: number): string {
    const types: { [key: number]: string } = {
      1: 'Market',
      2: 'Limit',
      3: 'Stop',
      4: 'Stop Limit',
      5: 'Trailing Stop',
      6: 'Take Profit',
      7: 'Take Profit Limit'
    };
    return types[type] || `Type ${type}`;
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
      6: 'Liquidated'
    };
    return statuses[status] || `Status ${status}`;
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
    const updateData: OrderUpdateRequest = this.editForm.value;

    this.service
      .updateOrder(this.orderData.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.alertService.success('Order updated successfully');
          this.loading = false;
          this.isEditing = false;
          this.editForm.disable();
          
          // Update local order object with response
          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }
          
          // Notify parent component to refresh data
          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error updating order:', error);
          
          // Extract error message from response
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

  onClose(): void {
    if (this.isEditing && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    this.modalRef.dismiss();
  }

  isOrderClosed(): boolean {
    if (!this.orderData) return false;
    // Status 4 = Cancelled, 5 = Rejected, 6 = Liquidated
    return this.orderData.status === 4 || this.orderData.status === 5 || this.orderData.status === 6;
  }

  openReopenModal(): void {
    this.showReopenModal = true;
    // Pre-populate with current values if available
    if (this.orderData) {
      this.reopenForm.patchValue({
        newDesiredPnL: this.orderData.unrealizedPnL || 0,
        newClosePrice: this.orderData.price || 0,
      });
    }
  }

  closeReopenModal(): void {
    this.showReopenModal = false;
    this.reopenForm.reset();
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
          this.reopenForm.reset();
          
          // Update local order object with response
          if (response && this.orderData) {
            Object.assign(this.orderData, response);
          }
          
          // Notify parent component to refresh data
          this.modalRef.close(true);
        },
        error: (error) => {
          console.error('Error reopening order:', error);
          
          // Extract error message from response
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
}

