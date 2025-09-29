import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalRef } from '../../models/modals/modal.model';

@Component({
  selector: 'app-sales-status-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-status-confirmation-modal.component.html',
  styleUrls: ['./sales-status-confirmation-modal.component.scss']
})
export class SalesStatusConfirmationModalComponent {
  @Input() clientName: string = '';
  @Input() currentStatus: string = '';
  @Input() newStatus: string = '';
  @Input() clientId: string = '';
  @Input() status: { value: number; label: string } | null = null;
  @Input() clientData: any = null;

  @Output() confirm = new EventEmitter<{
    clientId: string;
    status: { value: number; label: string };
    clientData: any;
  }>();
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
    if (this.clientId && this.status && this.clientData) {
      this.confirm.emit({
        clientId: this.clientId,
        status: this.status,
        clientData: this.clientData
      });
    }
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
}
