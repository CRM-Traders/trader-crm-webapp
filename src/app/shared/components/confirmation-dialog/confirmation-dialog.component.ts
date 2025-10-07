import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalRef } from '../../models/modals/modal.model';

export type ConfirmationType = 'info' | 'warning' | 'danger' | 'success';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() type: ConfirmationType = 'warning';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() details?: string;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  modalRef?: ModalRef;

  constructor() {
    // Get modal reference from parent
    const modalRef = (this as any).modalRef;
    if (modalRef) {
      this.modalRef = modalRef;
    }
  }

  onConfirm(): void {
    this.confirm.emit();
    if (this.modalRef) {
      this.modalRef.close(true);
    }
  }

  onCancel(): void {
    this.cancel.emit();
    if (this.modalRef) {
      this.modalRef.dismiss('cancelled');
    }
  }

  getIconColor(): string {
    switch (this.type) {
      case 'danger':
        return 'bg-red-100 dark:bg-red-900';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900';
      case 'success':
        return 'bg-green-100 dark:bg-green-900';
      case 'info':
      default:
        return 'bg-blue-100 dark:bg-blue-900';
    }
  }

  getIconTextColor(): string {
    switch (this.type) {
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  getConfirmButtonColor(): string {
    switch (this.type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  }
}

