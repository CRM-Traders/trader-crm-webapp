import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalRef } from '../../../../shared/models/modals/modal.model';
import { Order } from '../../services/price-manager.service';

@Component({
  selector: 'app-order-close-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-close-modal.component.html',
  styleUrls: ['./order-close-modal.component.scss'],
})
export class OrderCloseModalComponent implements OnInit, OnDestroy {
  @Input() modalRef!: ModalRef;
  @Input() order!: Order;

  priceOption = signal<'current' | 'custom'>('current');
  customPrice = signal<number | null>(null);

  ngOnInit(): void {
    // Initialize custom price with order's current price
    if (this.order) {
      this.customPrice.set(this.order.price);
    }
  }

  ngOnDestroy(): void {}

  onPriceOptionChange(option: 'current' | 'custom'): void {
    this.priceOption.set(option);
  }

  onConfirm(): void {
    if (this.priceOption() === 'custom') {
      const price = this.customPrice();
      if (!price || price <= 0) {
        return; // Invalid price
      }
      this.modalRef.close({ useCustomPrice: true, price });
    } else {
      this.modalRef.close({ useCustomPrice: false, price: null });
    }
  }

  onCancel(): void {
    this.modalRef.dismiss();
  }

  // Prevent invalid characters in number input
  preventInvalidNumberInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+', '-'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
      return;
    }

    // Only allow a single decimal separator
    if (event.key === '.') {
      const target = event.target as HTMLInputElement;
      if (target && target.value.includes('.')) {
        event.preventDefault();
      }
    }
  }
}

